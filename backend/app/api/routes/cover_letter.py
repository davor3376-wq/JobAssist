from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.schemas.job import CoverLetterRequest, JobOut
from app.services.claude_service import generate_cover_letter

router = APIRouter()


@router.post("/generate", response_model=JobOut)
async def generate(
    payload: CoverLetterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.id == payload.job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    res_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = res_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    letter = generate_cover_letter(
        resume_text=resume.raw_text,
        job_description=job.description,
        company=job.company or "",
        role=job.role or "",
        tone=payload.tone,
    )

    job.cover_letter = letter
    await db.commit()
    await db.refresh(job)
    return job
