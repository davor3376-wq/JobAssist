import asyncio
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import limiter
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.core.usage import get_user_plan
from app.core.plans import get_limit
from app.models.user import User
from app.models.job_alert import JobAlert
from app.schemas.job_alert import JobAlertCreate, JobAlertUpdate, JobAlertOut
from app.services.job_search import search_jobs
from app.services.email_service import send_job_alert_email

logger = logging.getLogger(__name__)
router = APIRouter()

# --- HELPER FOR NEON COMPATIBILITY ---
def get_naive_now():
    """Returns current UTC time without timezone info (Naive)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

@router.get("/", response_model=list[JobAlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JobAlert)
        .where(JobAlert.user_id == current_user.id)
        .order_by(JobAlert.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=JobAlertOut, status_code=201)
async def create_alert(
    payload: JobAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Acquire a row-level lock on the user row to serialize concurrent creations.
    # Any parallel request for the same user blocks here until this transaction
    # commits, preventing two requests from both seeing count < limit.
    await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )

    plan = await get_user_plan(db, current_user.id)
    limit = get_limit(plan, "job_alerts")

    if limit != -1:
        count_result = await db.execute(
            select(sa_func.count()).where(JobAlert.user_id == current_user.id)
        )
        current_count = count_result.scalar() or 0
        if current_count >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "usage_limit",
                    "feature": "job_alerts",
                    "plan": plan,
                    "used": current_count,
                    "limit": limit,
                    "message": f"Du hast dein Limit für Job-Alerts erreicht ({current_count}/{limit}). Bitte upgrade deinen Plan.",
                },
            )

    alert = JobAlert(
        user_id=current_user.id,
        keywords=payload.keywords,
        location=payload.location,
        job_type=payload.job_type,
        email=current_user.email,
        frequency=payload.frequency,
        manual_refresh_count=0,
        manual_refresh_window_start=get_naive_now(),
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.patch("/{alert_id}", response_model=JobAlertOut)
async def update_alert(
    alert_id: int,
    payload: JobAlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_alert(
    request: Request,
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()


REFRESH_WINDOW_HOURS = 4
REFRESH_MAX = 3

@router.post("/{alert_id}/run", response_model=dict)
async def run_alert_now(
    alert_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a job alert search and send email."""
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Rate limit is tracked on the user, not the alert — prevents bypass by delete+recreate
    now = get_naive_now()
    window_start = current_user.alert_refresh_window_start

    # Safety: strip tz info if Neon ever returns it
    if window_start and window_start.tzinfo is not None:
        window_start = window_start.replace(tzinfo=None)

    window_expired = window_start is None or (now - window_start) >= timedelta(hours=REFRESH_WINDOW_HOURS)

    if window_expired:
        current_user.alert_refresh_count = 0
        current_user.alert_refresh_window_start = now
        window_start = now

    if current_user.alert_refresh_count >= REFRESH_MAX:
        reset_at = window_start + timedelta(hours=REFRESH_WINDOW_HOURS)
        seconds_left = int((reset_at - now).total_seconds())
        hours_left = max(0, seconds_left // 3600)
        minutes_left = max(0, (seconds_left % 3600) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Maximale Aktualisierungen erreicht ({REFRESH_MAX}/{REFRESH_WINDOW_HOURS}h). "
                   f"Verfügbar in {hours_left}h {minutes_left}min.",
        )

    current_user.alert_refresh_count += 1
    await db.commit()

    background_tasks.add_task(
        _run_and_send, 
        alert_id, 
        alert.keywords, 
        alert.location, 
        alert.job_type, 
        alert.email
    )
    
    return {
        "message": "Suche gestartet. Du erhältst in Kürze eine E-Mail.",
        "refreshes_used": current_user.alert_refresh_count,
        "refreshes_remaining": REFRESH_MAX - current_user.alert_refresh_count,
    }


@router.post("/test-email", response_model=dict)
async def test_email(current_user: User = Depends(get_current_user)):
    """Send a test email to verify SMTP configuration."""
    smtp_ok = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    if not smtp_ok:
        return {
            "ok": False,
            "error": "E-Mail-Versand ist nicht konfiguriert. Bitte kontaktiere den Support.",
        }

    fake_jobs = [
        {"title": "Test: Software Engineer", "company": "JobAssist GmbH", "location": "Wien",
         "full_url": "https://jobassist.app", "salary_range": "€ 50,000 – 70,000"}
    ]
    ok = await asyncio.to_thread(
        send_job_alert_email,
        to_email=current_user.email,
        keywords="Test-Alert",
        location="Wien",
        jobs=fake_jobs,
    )
    return {
        "ok": ok,
        "to": current_user.email,
    }


async def _run_and_send(alert_id: int, keywords: str, location: str, job_type: str, email: str):
    try:
        results = await search_jobs(
            keywords=keywords, 
            location=location or "", 
            job_type=job_type or "", 
            page=1
        )
        jobs = results.get("jobs", [])
        await asyncio.to_thread(
            send_job_alert_email, 
            to_email=email, 
            keywords=keywords, 
            location=location or "", 
            jobs=jobs
        )
    except Exception as e:
        logger.error(f"Alert run failed for alert {alert_id}: {e}", exc_info=True)