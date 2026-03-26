from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.api.routes import job_alerts
from app.schemas.job_alert import JobAlertCreate, JobAlertUpdate


class FakeResult:
    def __init__(self, *, scalar_one_or_none=None, scalar_one=None, scalar=None):
        self._scalar_one_or_none = scalar_one_or_none
        self._scalar_one = scalar_one
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalar_one(self):
        return self._scalar_one

    def scalar(self):
        return self._scalar


@pytest.mark.asyncio
async def test_create_alert_mirrors_user_refresh_state(monkeypatch):
    db = AsyncMock()
    db.add = MagicMock()
    current_user = SimpleNamespace(
        id=1,
        email="user@example.com",
        alert_refresh_count=2,
        alert_refresh_window_start=datetime(2026, 3, 26, 10, 0, 0),
    )

    created_alert = SimpleNamespace(
        id=11,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="user@example.com",
        frequency="daily",
        is_active=True,
        last_sent_at=None,
        manual_refresh_count=0,
        manual_refresh_window_start=None,
        created_at=datetime(2026, 3, 26, 10, 0, 0),
        updated_at=datetime(2026, 3, 26, 10, 0, 0),
    )
    db.execute = AsyncMock(
        side_effect=[
            FakeResult(),
            FakeResult(scalar=1),
        ]
    )
    db.refresh = AsyncMock(side_effect=lambda alert: None)

    monkeypatch.setattr(job_alerts, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(job_alerts, "get_limit", lambda plan, feature: 2)

    added = []

    def capture_add(obj):
        added.append(obj)
        created_alert.manual_refresh_count = obj.manual_refresh_count
        created_alert.manual_refresh_window_start = obj.manual_refresh_window_start
        created_alert.email = obj.email

    db.add.side_effect = capture_add
    db.refresh.side_effect = lambda obj: None

    payload = JobAlertCreate(
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="attacker@example.com",
        frequency="daily",
    )

    result = await job_alerts.create_alert(payload=payload, db=db, current_user=current_user)

    assert added, "alert should be added to the session"
    assert result.email == "user@example.com"
    assert result.manual_refresh_count == 2
    assert result.manual_refresh_window_start == current_user.alert_refresh_window_start
    assert db.commit.await_count == 1


@pytest.mark.asyncio
async def test_update_alert_enforces_rewrite_cooldown():
    now = datetime(2026, 3, 26, 12, 0, 0)
    alert = SimpleNamespace(
        id=4,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        frequency="daily",
        email="user@example.com",
        is_active=True,
        created_at=now - timedelta(hours=1),
        updated_at=now - timedelta(minutes=30),
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=alert))
    current_user = SimpleNamespace(id=1)

    payload = JobAlertUpdate(keywords="golang")

    with pytest.raises(HTTPException) as exc:
        await job_alerts.update_alert(alert_id=4, payload=payload, db=db, current_user=current_user)

    assert exc.value.status_code == 429
    assert "Verfügbar" in exc.value.detail
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_update_alert_allows_non_rewrite_fields_without_cooldown():
    now = datetime(2026, 3, 26, 12, 0, 0)
    alert = SimpleNamespace(
        id=4,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        frequency="daily",
        email="user@example.com",
        is_active=True,
        created_at=now - timedelta(hours=1),
        updated_at=now - timedelta(minutes=30),
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(scalar_one_or_none=alert))
    current_user = SimpleNamespace(id=1)
    payload = JobAlertUpdate(is_active=False)

    result = await job_alerts.update_alert(alert_id=4, payload=payload, db=db, current_user=current_user)

    assert result.is_active is False
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(alert)


@pytest.mark.asyncio
async def test_run_alert_now_increments_usage_and_returns_remaining(monkeypatch):
    alert = SimpleNamespace(
        id=5,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="user@example.com",
    )
    user = SimpleNamespace(
        id=1,
        alert_refresh_count=1,
        alert_refresh_window_start=datetime(2026, 3, 26, 9, 0, 0),
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            FakeResult(scalar_one_or_none=alert),
            FakeResult(scalar_one=user),
        ]
    )
    background = BackgroundTasks()

    monkeypatch.setattr(job_alerts, "_run_and_send", AsyncMock())

    result = await job_alerts.run_alert_now(
        alert_id=5,
        background_tasks=background,
        db=db,
        current_user=SimpleNamespace(id=1),
    )

    assert result["refreshes_used"] == 2
    assert result["refreshes_remaining"] == 1
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_alert_now_rejects_when_limit_reached():
    alert = SimpleNamespace(
        id=5,
        user_id=1,
        keywords="python",
        location="Vienna",
        job_type="remote",
        email="user@example.com",
    )
    user = SimpleNamespace(
        id=1,
        alert_refresh_count=job_alerts.REFRESH_MAX,
        alert_refresh_window_start=datetime.utcnow(),
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            FakeResult(scalar_one_or_none=alert),
            FakeResult(scalar_one=user),
        ]
    )

    with pytest.raises(HTTPException) as exc:
        await job_alerts.run_alert_now(
            alert_id=5,
            background_tasks=BackgroundTasks(),
            db=db,
            current_user=SimpleNamespace(id=1),
        )

    assert exc.value.status_code == 429
    assert "Maximale Aktualisierungen erreicht" in exc.value.detail
    db.rollback.assert_awaited_once()
    db.commit.assert_not_called()
