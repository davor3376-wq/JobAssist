from sqlalchemy import Integer, String, Text, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id: Mapped[int] = mapped_column(Integer, ForeignKey("resumes.id"), nullable=True)

    company: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # --- Category Field (For Samstagsjob / Praktikum) ---
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="other") 

    # Application tracking
    status: Mapped[str] = mapped_column(String, default="bookmarked", nullable=False) 

    # AI (Claude) outputs
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    match_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    interview_qa: Mapped[Optional[str]] = mapped_column(Text, nullable=True) 

    # Saved research data (JSON)
    research_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # User notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # --- Timezone Aware Fields ---
    # These match your ALTER TABLE command and prevent the DataError
    deadline: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="jobs")
    # Ensure the Resume model also has a matching 'jobs' relationship
    resume = relationship("Resume", back_populates="jobs")