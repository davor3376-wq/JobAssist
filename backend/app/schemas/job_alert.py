from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class JobAlertCreate(BaseModel):
    keywords: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    email: str
    frequency: str = "daily"  # daily, weekly


class JobAlertUpdate(BaseModel):
    keywords: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    email: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


class JobAlertOut(BaseModel):
    id: int
    keywords: str
    location: Optional[str]
    job_type: Optional[str]
    email: str
    frequency: str
    is_active: bool
    last_sent_at: Optional[datetime]
    manual_refresh_count: int = 0
    manual_refresh_window_start: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
