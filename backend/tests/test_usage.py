from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core import usage


class FakeResult:
    def __init__(self, *, fetchone_result=None, scalar_result=None):
        self._fetchone_result = fetchone_result
        self._scalar_result = scalar_result

    def fetchone(self):
        return self._fetchone_result

    def scalar_one_or_none(self):
        return self._scalar_result

    def scalar(self):
        return self._scalar_result


@pytest.mark.asyncio
async def test_require_usage_blocks_unverified_users_before_db_work():
    db = AsyncMock()
    current_user = SimpleNamespace(id=1, is_verified=False)

    checker = usage.require_usage("cover_letter")

    with pytest.raises(HTTPException) as exc:
        await checker(db=db, current_user=current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "email_not_verified"
    db.execute.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_commits_when_under_limit(monkeypatch):
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(fetchone_result=(2,)))
    current_user = SimpleNamespace(id=7, is_verified=True)

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: 3)

    checker = usage.require_usage("cover_letter")
    await checker(db=db, current_user=current_user)

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.rollback.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_rolls_back_and_raises_at_limit(monkeypatch):
    db = AsyncMock()
    db.execute = AsyncMock(return_value=FakeResult(fetchone_result=None))
    current_user = SimpleNamespace(id=9, is_verified=True)

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="basic"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: 3)

    checker = usage.require_usage("cover_letter")

    with pytest.raises(HTTPException) as exc:
        await checker(db=db, current_user=current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail["error"] == "usage_limit"
    assert exc.value.detail["limit"] == 3
    db.rollback.assert_awaited_once()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_require_usage_unlimited_plan_uses_increment_usage(monkeypatch):
    db = AsyncMock()
    current_user = SimpleNamespace(id=5, is_verified=True)
    increment_mock = AsyncMock()

    monkeypatch.setattr(usage, "get_user_plan", AsyncMock(return_value="max"))
    monkeypatch.setattr(usage, "get_limit", lambda plan, feature: -1)
    monkeypatch.setattr(usage, "increment_usage", increment_mock)

    checker = usage.require_usage("ai_chat")
    await checker(db=db, current_user=current_user)

    increment_mock.assert_awaited_once_with(db, 5, "ai_chat")
    db.execute.assert_not_called()
