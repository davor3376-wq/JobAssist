from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserProfileUpdate(BaseModel):
    desired_locations: Optional[list[str]] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    job_types: Optional[list[str]] = None
    industries: Optional[list[str]] = None
    experience_level: Optional[str] = None
    is_open_to_relocation: Optional[bool] = None
    avatar: Optional[str] = None   # base64 data URL


class UserProfileOut(BaseModel):
    id: int
    user_id: int
    desired_locations: list[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    job_types: list[str]
    industries: list[str]
    experience_level: Optional[str]
    is_open_to_relocation: bool
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
