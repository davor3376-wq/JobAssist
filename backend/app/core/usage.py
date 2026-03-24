"""Usage tracking: check limits and increment counters."""

from datetime import date
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.plans import get_limit
from app.models.subscription import Subscription
from app.models.usage import UsageRecord
from app.models.user import User


DAILY_FEATURES = {"job_search"}


def _current_period_start() -> date:
    """First day of the current month."""
    today = date.today()
    return today.replace(day=1)


def _period_for(feature: str) -> date:
    """Return the period start date for a feature (daily or monthly)."""
    return date.today() if feature in DAILY_FEATURES else _current_period_start()


async def get_user_plan(db: AsyncSession, user_id: int) -> str:
    result = await db.execute(
        select(Subscription.plan).where(
            Subscription.user_id == user_id,
            Subscription.status.in_(["active", "trialing"]),
        )
    )
    plan = result.scalar_one_or_none()
    return plan or "basic"


async def get_usage_count(db: AsyncSession, user_id: int, feature: str) -> int:
    period = _period_for(feature)
    result = await db.execute(
        select(UsageRecord.count).where(
            UsageRecord.user_id == user_id,
            UsageRecord.feature == feature,
            UsageRecord.period_start == period,
        )
    )
    return result.scalar_one_or_none() or 0


async def increment_usage(db: AsyncSession, user_id: int, feature: str) -> None:
    period = _period_for(feature)
    stmt = pg_insert(UsageRecord).values(
        user_id=user_id, feature=feature, period_start=period, count=1
    ).on_conflict_do_update(
        constraint="uq_user_feature_period",
        set_={"count": UsageRecord.count + 1},
    )
    await db.execute(stmt)
    await db.commit()


def require_usage(feature: str):
    """FastAPI dependency that checks usage limits before allowing the request.

    Uses a single atomic UPSERT (INSERT ... ON CONFLICT DO UPDATE WHERE count < limit)
    to eliminate the check-then-update race condition. If the WHERE clause blocks
    the update (count >= limit), 0 rows are returned and a 403 is raised.
    """
    async def _check(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        if not current_user.is_verified:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "email_not_verified",
                    "message": "Bitte bestaetige zuerst deine E-Mail-Adresse, um diese Funktion nutzen zu koennen.",
                },
            )

        plan = await get_user_plan(db, current_user.id)
        limit = get_limit(plan, feature)

        if limit == -1:
            # Unlimited — plain increment, no race risk
            await increment_usage(db, current_user.id, feature)
            return

        period = _period_for(feature)

        # Atomic: insert count=1 (new row) OR increment count IF count < limit.
        # When count >= limit the ON CONFLICT WHERE clause blocks the update and
        # RETURNING yields 0 rows — no separate SELECT needed.
        stmt = (
            pg_insert(UsageRecord)
            .values(user_id=current_user.id, feature=feature, period_start=period, count=1)
            .on_conflict_do_update(
                constraint="uq_user_feature_period",
                set_={"count": UsageRecord.count + 1},
                where=UsageRecord.count < limit,
            )
            .returning(UsageRecord.count)
        )

        result = await db.execute(stmt)
        row = result.fetchone()

        if row is None:
            # Conflict existed but WHERE blocked the update → limit already reached
            await db.rollback()
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "usage_limit",
                    "feature": feature,
                    "plan": plan,
                    "used": limit,
                    "limit": limit,
                    "message": f"Du hast dein Limit für diese Funktion erreicht ({limit}/{limit}). Bitte upgrade deinen Plan.",
                },
            )

        await db.commit()

    return _check


async def get_all_usage(db: AsyncSession, user_id: int, plan: str) -> list[dict]:
    """Return usage stats for all tracked features in a single query."""
    from sqlalchemy import func as sa_func
    from app.models.job_alert import JobAlert

    features = ["cv_analysis", "cover_letter", "job_alerts", "ai_chat", "job_search"]
    monthly_period = _current_period_start()
    daily_period = date.today()

    monthly_features = [f for f in features if f not in DAILY_FEATURES]
    daily_features_list = [f for f in features if f in DAILY_FEATURES]

    counts = {}

    if monthly_features:
        rows = await db.execute(
            select(UsageRecord.feature, UsageRecord.count).where(
                UsageRecord.user_id == user_id,
                UsageRecord.feature.in_(monthly_features),
                UsageRecord.period_start == monthly_period,
            )
        )
        counts.update({row.feature: row.count for row in rows})

    if daily_features_list:
        rows = await db.execute(
            select(UsageRecord.feature, UsageRecord.count).where(
                UsageRecord.user_id == user_id,
                UsageRecord.feature.in_(daily_features_list),
                UsageRecord.period_start == daily_period,
            )
        )
        counts.update({row.feature: row.count for row in rows})

    # Job alerts usage = actual alert count (not a monthly counter)
    alert_count_result = await db.execute(
        select(sa_func.count()).where(JobAlert.user_id == user_id)
    )
    alert_count = alert_count_result.scalar() or 0

    result = []
    for f in features:
        if f == "job_alerts":
            used = alert_count
        else:
            used = counts.get(f, 0)
        limit = get_limit(plan, f)
        result.append({
            "feature": f,
            "used": used,
            "limit": limit,
            "remaining": -1 if limit == -1 else max(0, limit - used),
        })
    return result
