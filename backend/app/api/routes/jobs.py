from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.main import limiter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.job import Job
from app.models.resume import Resume
from app.models.resume import Resume
from app.schemas.job import JobCreate, JobOut, MatchRequest, JobStatusUpdate, JobNotesUpdate, JobDeadlineUpdate, JobUrlUpdate, JobResearchUpdate, PipelineStats
from app.services.claude_service import match_resume_to_job
from app.services.job_search import search_jobs, search_jobs_by_preferences

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_resume_text(resume_id: int, user_id: int, db: AsyncSession) -> str:
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume.raw_text


# ── Root routes ────────────────────────────────────────────────────────────────

@router.post("/", response_model=JobOut, status_code=201)
async def create_job(
    payload: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.resume_id:
        r = await db.execute(select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Resume not found")

    job = Job(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        description=payload.description,
        url=payload.url,
        resume_id=payload.resume_id,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/", response_model=list[JobOut])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.user_id == current_user.id).order_by(Job.created_at.desc())
    )
    return result.scalars().all()


# ── Static routes BEFORE /{job_id} to avoid Starlette path conflicts ──────────

@router.post("/match", response_model=JobOut)
async def match_job(
    payload: MatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run resume-to-job match scoring via Claude."""
    result = await db.execute(
        select(Job).where(Job.id == payload.job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resume_text = await _get_resume_text(payload.resume_id, current_user.id, db)
    match = match_resume_to_job(resume_text, job.description)

    job.match_score = match.get("score")
    job.match_feedback = json.dumps(match)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/pipeline/stats", response_model=PipelineStats)
async def get_pipeline_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get application pipeline statistics."""
    result = await db.execute(
        select(Job).where(Job.user_id == current_user.id)
    )
    jobs = result.scalars().all()

    stats = {
        "bookmarked": sum(1 for j in jobs if j.status == "bookmarked"),
        "applied": sum(1 for j in jobs if j.status == "applied"),
        "interviewing": sum(1 for j in jobs if j.status == "interviewing"),
        "offered": sum(1 for j in jobs if j.status == "offered"),
        "rejected": sum(1 for j in jobs if j.status == "rejected"),
        "total": len(jobs),
    }
    return stats


@router.get("/search/recommended", response_model=dict)
async def search_recommended_jobs(
    page: int = Query(1, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("job_search")),
):
    """Search jobs based on user's preferences."""
    try:
        logger.info(f"Recommended job search for user {current_user.email}")
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            logger.warning(f"No profile found for user {current_user.email}")
            return {"jobs": [], "total_count": 0, "error": "Please set up your preferences first"}

        profile_dict = {
            "desired_locations": profile.desired_locations or ["Remote"],
            "job_types": profile.job_types or ["Full-time"],
            "experience_level": profile.experience_level,
        }

        logger.info(f"Profile preferences: locations={profile_dict['desired_locations']}, types={profile_dict['job_types']}")
        results = await search_jobs_by_preferences(profile_dict, page)
        logger.info(f"Search results: {len(results.get('jobs', []))} jobs found")
        return results
    except Exception as e:
        logger.error(f"Recommended search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/search/custom", response_model=dict)
async def search_custom_jobs(
    keywords: str = Query(..., description="Job title or keywords", min_length=1, max_length=200),
    location: str = Query("", description="City/location", max_length=100),
    job_type: str = Query("", description="Job type (Full-time, Remote, etc.)", max_length=50),
    page: int = Query(1, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("job_search")),
):
    """Search jobs with custom parameters."""
    try:
        logger.info(f"Custom job search: keywords={keywords}, location={location}, job_type={job_type}, user={current_user.email}")
        results = await search_jobs(
            keywords=keywords,
            location=location,
            job_type=job_type,
            page=page,
        )
        logger.info(f"Search results: {len(results.get('jobs', []))} jobs found")
        return results
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# ── Dynamic /{job_id} routes AFTER all static routes ──────────────────────────

@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
@limiter.limit("30/minute")
async def delete_job(
    request: Request,
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()


@router.patch("/{job_id}/status", response_model=JobOut)
async def update_job_status(
    job_id: int,
    payload: JobStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update job application status."""
    valid_statuses = ["bookmarked", "applied", "interviewing", "offered", "rejected"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = payload.status
    await db.commit()
    await db.refresh(job)
    logger.info(f"Job {job_id} status updated to {payload.status} by user {current_user.email}")
    return job


@router.patch("/{job_id}/notes", response_model=JobOut)
async def update_job_notes(
    job_id: int,
    payload: JobNotesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update job notes."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.notes = payload.notes
    await db.commit()
    await db.refresh(job)
    logger.info(f"Job {job_id} notes updated by user {current_user.email}")
    return job


@router.patch("/{job_id}/deadline", response_model=JobOut)
async def update_job_deadline(
    job_id: int,
    payload: JobDeadlineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update job deadline."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.deadline = payload.deadline
    await db.commit()
    await db.refresh(job)
    logger.info(f"Job {job_id} deadline updated by user {current_user.email}")
    return job


@router.patch("/{job_id}/url", response_model=JobOut)
async def update_job_url(
    job_id: int,
    payload: JobUrlUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update job URL."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.url = payload.url
    await db.commit()
    await db.refresh(job)
    return job


@router.patch("/{job_id}/research", response_model=JobOut)
async def update_job_research(
    job_id: int,
    payload: JobResearchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save research data to a job."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.research_data = payload.research_data
    await db.commit()
    await db.refresh(job)
    return job
