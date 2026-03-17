from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.resume_data import ResumeData
from app.schemas.resume_data import ResumeDataCreate, ResumeDataUpdate, ResumeDataOut
from app.services.resume_generator import render_resume_html

logger = logging.getLogger(__name__)
router = APIRouter()


# Test endpoint to verify router is working
@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is registered"""
    return {"status": "resume-data router is working"}


@router.post("/", response_model=ResumeDataOut, status_code=201)
async def create_resume_data(
    payload: ResumeDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new resume"""
    resume = ResumeData(
        user_id=current_user.id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        location=payload.location,
        birth_info=payload.birth_info,
        nationality=payload.nationality,
        staatsbuergerschaft=payload.staatsbuergerschaft,
        familienstand=payload.familienstand,
        fuehrerschein=payload.fuehrerschein,
        religion=payload.religion,
        address_lines=payload.address_lines or [],
        fit_to_page=payload.fit_to_page or False,
        professional_summary=payload.professional_summary,
        # Convert nested objects to JSON-serializable lists/dicts
        work_experience=jsonable_encoder(payload.work_experience),
        education=jsonable_encoder(payload.education),
        skills=jsonable_encoder(payload.skills),
        certifications=jsonable_encoder(payload.certifications),
        template_id=payload.template_id,
        language=payload.language,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    logger.info(f"Resume created for user {current_user.email}")
    return resume


@router.get("/", response_model=list[ResumeDataOut])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all resumes for the current user"""
    result = await db.execute(
        select(ResumeData).where(ResumeData.user_id == current_user.id).order_by(ResumeData.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{resume_id}", response_model=ResumeDataOut)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific resume"""
    result = await db.execute(
        select(ResumeData).where(
            ResumeData.id == resume_id,
            ResumeData.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.patch("/{resume_id}", response_model=ResumeDataOut)
async def update_resume(
    resume_id: int,
    payload: ResumeDataUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a resume"""
    result = await db.execute(
        select(ResumeData).where(
            ResumeData.id == resume_id,
            ResumeData.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Update fields (encoding JSON fields where necessary)
    if payload.full_name is not None:
        resume.full_name = payload.full_name
    if payload.email is not None:
        resume.email = payload.email
    if payload.phone is not None:
        resume.phone = payload.phone
    if payload.location is not None:
        resume.location = payload.location
    if payload.birth_info is not None:
        resume.birth_info = payload.birth_info
    if payload.nationality is not None:
        resume.nationality = payload.nationality
    if payload.staatsbuergerschaft is not None:
        resume.staatsbuergerschaft = payload.staatsbuergerschaft
    if payload.familienstand is not None:
        resume.familienstand = payload.familienstand
    if payload.fuehrerschein is not None:
        resume.fuehrerschein = payload.fuehrerschein
    if payload.religion is not None:
        resume.religion = payload.religion
    if payload.address_lines is not None:
        resume.address_lines = payload.address_lines
    if payload.fit_to_page is not None:
        resume.fit_to_page = payload.fit_to_page
    if payload.professional_summary is not None:
        resume.professional_summary = payload.professional_summary
    if payload.work_experience is not None:
        resume.work_experience = jsonable_encoder(payload.work_experience)
    if payload.education is not None:
        resume.education = jsonable_encoder(payload.education)
    if payload.skills is not None:
        resume.skills = jsonable_encoder(payload.skills)
    if payload.certifications is not None:
        resume.certifications = jsonable_encoder(payload.certifications)
    if payload.template_id is not None:
        resume.template_id = payload.template_id
    if payload.language is not None:
        resume.language = payload.language

    await db.commit()
    await db.refresh(resume)
    logger.info(f"Resume {resume_id} updated by user {current_user.email}")
    return resume


@router.delete("/{resume_id}", status_code=200)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a resume"""
    # First verify the resume exists and belongs to the user
    result = await db.execute(
        select(ResumeData).where(
            ResumeData.id == resume_id,
            ResumeData.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Delete using explicit DELETE statement
    stmt = delete(ResumeData).where(
        ResumeData.id == resume_id,
        ResumeData.user_id == current_user.id
    )
    await db.execute(stmt)
    await db.commit()
    logger.info(f"Resume {resume_id} deleted by user {current_user.email}")
    return {"status": "deleted", "id": resume_id}


@router.get("/{resume_id}/preview", response_model=dict)
async def preview_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get HTML preview of resume"""
    result = await db.execute(
        select(ResumeData).where(
            ResumeData.id == resume_id,
            ResumeData.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Convert resume data to dictionary
    resume_dict = {
        "full_name": resume.full_name,
        "email": resume.email,
        "phone": resume.phone,
        "location": resume.location,
        "birth_info": resume.birth_info,
        "nationality": resume.nationality,
        "staatsbuergerschaft": resume.staatsbuergerschaft,
        "familienstand": resume.familienstand,
        "fuehrerschein": resume.fuehrerschein,
        "religion": resume.religion,
        "address_lines": resume.address_lines or [],
        "professional_summary": resume.professional_summary,
        "work_experience": resume.work_experience or [],
        "education": resume.education or [],
        "skills": resume.skills or [],
        "certifications": resume.certifications or [],
    }

    html = render_resume_html(resume_dict, resume.template_id, resume.language, fit_to_page=resume.fit_to_page or False)
    return {"html": html}