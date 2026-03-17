from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class WorkExperience(BaseModel):
    title: str
    company: str
    startDate: str
    endDate: Optional[str] = None
    isCurrentPosition: Optional[bool] = False
    description: Optional[str] = None


class Education(BaseModel):
    school: str
    degree: str
    field: str
    graduationDate: str


class Skill(BaseModel):
    category: str
    items: list[str]


class Certification(BaseModel):
    name: str
    issuer: str
    date: str


class ResumeDataCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    birth_info: Optional[str] = None
    nationality: Optional[str] = None
    staatsbuergerschaft: Optional[str] = None
    familienstand: Optional[str] = None
    fuehrerschein: Optional[str] = None
    religion: Optional[str] = None
    address_lines: Optional[list[str]] = None
    fit_to_page: Optional[bool] = False
    professional_summary: Optional[str] = None
    work_experience: Optional[list[WorkExperience]] = None
    education: Optional[list[Education]] = None
    skills: Optional[list[Skill]] = None
    certifications: Optional[list[Certification]] = None
    template_id: int = 1
    language: str = "de"


class ResumeDataUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    birth_info: Optional[str] = None
    nationality: Optional[str] = None
    staatsbuergerschaft: Optional[str] = None
    familienstand: Optional[str] = None
    fuehrerschein: Optional[str] = None
    religion: Optional[str] = None
    address_lines: Optional[list[str]] = None
    fit_to_page: Optional[bool] = None
    professional_summary: Optional[str] = None
    work_experience: Optional[list[WorkExperience]] = None
    education: Optional[list[Education]] = None
    skills: Optional[list[Skill]] = None
    certifications: Optional[list[Certification]] = None
    template_id: Optional[int] = None
    language: Optional[str] = None


class ResumeDataOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: Optional[str]
    location: Optional[str]
    birth_info: Optional[str] = None
    nationality: Optional[str] = None
    staatsbuergerschaft: Optional[str] = None
    familienstand: Optional[str] = None
    fuehrerschein: Optional[str] = None
    religion: Optional[str] = None
    address_lines: Optional[list[str]] = None
    fit_to_page: Optional[bool] = False
    professional_summary: Optional[str]
    work_experience: Optional[list[WorkExperience]]
    education: Optional[list[Education]]
    skills: Optional[list[Skill]]
    certifications: Optional[list[Certification]]
    template_id: int
    language: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
