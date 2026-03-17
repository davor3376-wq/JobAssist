from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ResumeOut(BaseModel):
    id: int
    filename: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeAnalysis(BaseModel):
    resume_id: int
    parsed_json: Optional[str]
