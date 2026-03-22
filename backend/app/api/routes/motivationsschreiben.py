import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.services.claude_service import generate_motivationsschreiben
from app.main import limiter

router = APIRouter()


class MotivationsschreibenRequest(BaseModel):
    resume_id: Optional[int] = None
    company: str = ""
    role: str = ""
    job_description: str = ""
    tone: str = "formell"
    applicant_name: str = ""
    applicant_address: str = ""


class MotivationsschreibenResponse(BaseModel):
    text: str
    company: str
    role: str
    tone: str


@router.post("/generate", response_model=MotivationsschreibenResponse)
@limiter.limit("10/minute")
async def generate(
    request: Request,
    payload: MotivationsschreibenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume_text = ""

    # Try uploaded resume first
    if payload.resume_id:
        result = await db.execute(
            select(Resume).where(
                Resume.id == payload.resume_id,
                Resume.user_id == current_user.id,
            )
        )
        resume = result.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=404, detail="Lebenslauf nicht gefunden")
        resume_text = resume.raw_text or ""

    if not resume_text and not payload.job_description:
        raise HTTPException(
            status_code=400,
            detail="Bitte wähle einen Lebenslauf aus oder gib eine Stellenbeschreibung ein",
        )

    text = await asyncio.to_thread(
        generate_motivationsschreiben,
        resume_text=resume_text,
        job_description=payload.job_description,
        company=payload.company,
        role=payload.role,
        tone=payload.tone,
        applicant_name=payload.applicant_name,
        applicant_address=payload.applicant_address,
    )

    return MotivationsschreibenResponse(
        text=text,
        company=payload.company,
        role=payload.role,
        tone=payload.tone,
    )
