from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.job_alert import JobAlert
from app.schemas.job_alert import JobAlertCreate, JobAlertUpdate, JobAlertOut
from app.services.job_search import search_jobs
from app.services.email_service import send_job_alert_email

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=list[JobAlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JobAlert).where(JobAlert.user_id == current_user.id).order_by(JobAlert.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=JobAlertOut, status_code=201)
async def create_alert(
    payload: JobAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = JobAlert(
        user_id=current_user.id,
        keywords=payload.keywords,
        location=payload.location,
        job_type=payload.job_type,
        email=payload.email,
        frequency=payload.frequency,
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
    if "keywords" in update_data:   alert.keywords  = update_data["keywords"]
    if "location" in update_data:   alert.location  = update_data["location"]
    if "job_type" in update_data:   alert.job_type  = update_data["job_type"]
    if "email" in update_data:      alert.email     = update_data["email"]
    if "frequency" in update_data:  alert.frequency = update_data["frequency"]
    if "is_active" in update_data:  alert.is_active = update_data["is_active"]

    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
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

    background_tasks.add_task(_run_and_send, alert_id, alert.keywords, alert.location, alert.job_type, alert.email)
    return {"message": "Suche gestartet. Du erhältst in Kürze eine E-Mail."}


async def _run_and_send(alert_id: int, keywords: str, location: str, job_type: str, email: str):
    try:
        results = await search_jobs(keywords=keywords, location=location or "", job_type=job_type or "", page=1)
        jobs = results.get("jobs", [])
        send_job_alert_email(to_email=email, keywords=keywords, location=location or "", jobs=jobs)
    except Exception as e:
        logger.error(f"Alert run failed for alert {alert_id}: {e}", exc_info=True)
