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


def _current_period_start() -> date:
    """First day of the current month."""
    today = date.today()
    return today.replace(day=1)


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
    period = _current_period_start()
    result = await db.execute(
        select(UsageRecord.count).where(
            UsageRecord.user_id == user_id,
            UsageRecord.feature == feature,
            UsageRecord.period_start == period,
        )
    )
    return result.scalar_one_or_none() or 0


async def increment_usage(db: AsyncSession, user_id: int, feature: str) -> None:
    period = _current_period_start()
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

    Usage:
        @router.post("/generate")
        async def generate(..., _=Depends(require_usage("cover_letter"))):
    """
    async def _check(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        plan = await get_user_plan(db, current_user.id)
        limit = get_limit(plan, feature)

        if limit == -1:
            # Unlimited — just increment
            await increment_usage(db, current_user.id, feature)
            return

        used = await get_usage_count(db, current_user.id, feature)
        if used >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "usage_limit",
                    "feature": feature,
                    "plan": plan,
                    "used": used,
                    "limit": limit,
                    "message": f"Du hast dein Limit für diese Funktion erreicht ({used}/{limit}). Bitte upgrade deinen Plan.",
                },
            )
        await increment_usage(db, current_user.id, feature)

    return _check


async def get_all_usage(db: AsyncSession, user_id: int, plan: str) -> list[dict]:
    """Return usage stats for all tracked features."""
    features = ["cv_analysis", "cover_letter", "job_alerts", "ai_chat"]
    result = []
    for f in features:
        used = await get_usage_count(db, user_id, f)
        limit = get_limit(plan, f)
        result.append({
            "feature": f,
            "used": used,
            "limit": limit,
            "remaining": -1 if limit == -1 else max(0, limit - used),
        })
    return result
