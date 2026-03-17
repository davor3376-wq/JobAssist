from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.resume_data import ResumeData
from app.services.claude_service import generate_motivationsschreiben

router = APIRouter()


class MotivationsschreibenRequest(BaseModel):
    resume_id: Optional[int] = None
    resume_data_id: Optional[int] = None
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
async def generate(
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

    # Try resume builder data
    elif payload.resume_data_id:
        result = await db.execute(
            select(ResumeData).where(
                ResumeData.id == payload.resume_data_id,
                ResumeData.user_id == current_user.id,
            )
        )
        rd = result.scalar_one_or_none()
        if not rd:
            raise HTTPException(status_code=404, detail="Lebenslauf nicht gefunden")
        # Build text from resume data fields
        parts = []
        if rd.full_name:
            parts.append(f"Name: {rd.full_name}")
        if rd.email:
            parts.append(f"E-Mail: {rd.email}")
        if rd.phone:
            parts.append(f"Telefon: {rd.phone}")
        if rd.location:
            parts.append(f"Ort: {rd.location}")
        if rd.summary:
            parts.append(f"Profil: {rd.summary}")
        if rd.skills:
            skills = rd.skills if isinstance(rd.skills, list) else []
            parts.append(f"Kenntnisse: {', '.join(skills)}")
        if rd.experience:
            parts.append("Berufserfahrung:")
            for exp in (rd.experience if isinstance(rd.experience, list) else []):
                parts.append(f"  - {exp.get('title', '')} bei {exp.get('company', '')} ({exp.get('startDate', '')} – {exp.get('endDate', '')})")
                if exp.get("description"):
                    parts.append(f"    {exp['description']}")
        if rd.education:
            parts.append("Bildung:")
            for edu in (rd.education if isinstance(rd.education, list) else []):
                parts.append(f"  - {edu.get('degree', '')} an {edu.get('institution', '')} ({edu.get('startDate', '')} – {edu.get('endDate', '')})")
        resume_text = "\n".join(parts)
        # Use name/address from resume data if not provided
        if not payload.applicant_name and rd.full_name:
            payload.applicant_name = rd.full_name
        if not payload.applicant_address and rd.location:
            payload.applicant_address = rd.location

    if not resume_text and not payload.job_description:
        raise HTTPException(
            status_code=400,
            detail="Bitte wähle einen Lebenslauf aus oder gib eine Stellenbeschreibung ein",
        )

    text = generate_motivationsschreiben(
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
