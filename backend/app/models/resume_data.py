from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.mutable import MutableList # Tracks changes in JSON lists
from datetime import datetime

from app.core.database import Base

class ResumeData(Base):
    __tablename__ = "resume_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=True)
    location: Mapped[str] = mapped_column(String, nullable=True)
    professional_summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Use JSON type; SQLAlchemy will handle the serialization if passed a dict
    work_experience: Mapped[list] = mapped_column(JSON, nullable=True) 
    education: Mapped[list] = mapped_column(JSON, nullable=True) 
    skills: Mapped[list] = mapped_column(JSON, nullable=True) 
    certifications: Mapped[list] = mapped_column(JSON, nullable=True) 

    birth_info: Mapped[str] = mapped_column(String, nullable=True)   # Geburtsdaten
    nationality: Mapped[str] = mapped_column(String, nullable=True)  # Staatsangehörigkeit
    staatsbuergerschaft: Mapped[str] = mapped_column(String, nullable=True)  # Staatsbürgerschaft
    familienstand: Mapped[str] = mapped_column(String, nullable=True)  # Familienstand
    fuehrerschein: Mapped[str] = mapped_column(String, nullable=True)  # Führerschein
    religion: Mapped[str] = mapped_column(String, nullable=True)  # Religionsbekenntnis
    address_lines: Mapped[list] = mapped_column(JSON, nullable=True)  # Multiple Aufenthaltsorte
    fit_to_page: Mapped[bool] = mapped_column(String, nullable=True, default=False)  # Fit to page

    template_id: Mapped[int] = mapped_column(Integer, default=1)
    language: Mapped[str] = mapped_column(String, default="de")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="resume_data")