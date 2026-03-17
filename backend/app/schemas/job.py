from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class JobCreate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    description: str
    resume_id: Optional[int] = None


class JobOut(BaseModel):
    id: int
    company: Optional[str]
    role: Optional[str]
    description: str
    status: str  # bookmarked, applied, interviewing, offered, rejected
    match_score: Optional[float]
    match_feedback: Optional[str]
    cover_letter: Optional[str]
    interview_qa: Optional[str]
    notes: Optional[str]
    deadline: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MatchRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None        # uploaded resume
    resume_data_id: Optional[int] = None   # Resume Creator resume


class CoverLetterRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    resume_data_id: Optional[int] = None
    tone: Optional[str] = "professional"  # professional, enthusiastic, concise


class InterviewPrepRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None
    resume_data_id: Optional[int] = None
    num_questions: int = 10


class JobStatusUpdate(BaseModel):
    status: str  # bookmarked, applied, interviewing, offered, rejected


class JobNotesUpdate(BaseModel):
    notes: Optional[str] = None


class JobDeadlineUpdate(BaseModel):
    deadline: Optional[datetime] = None


class PipelineStats(BaseModel):
    bookmarked: int = 0
    applied: int = 0
    interviewing: int = 0
    offered: int = 0
    rejected: int = 0
    total: int = 0
