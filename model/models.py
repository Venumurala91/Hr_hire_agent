# =============================================================================
# HR-HIRE-AGENT/model/models.py
# =============================================================================
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

from werkzeug.security import generate_password_hash, check_password_hash
# --- Import StatusConstants for initial values/defaults ---
from model.status_constants import StatusConstants

class JobDescription(Base):
    __tablename__ = 'job_descriptions'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description_text = Column(Text, nullable=False) # Full JD text
    location = Column(String(255)) # <-- NEW FIELD
    salary_range = Column(String(100)) # <-- NEW FIELD
    required_skills = Column(Text) # JSON string or comma-separated for easier search
    # min_experience_years = Column(Integer, default=0)
    min_experience_years = Column(String(50), default='0')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    candidates = relationship("Candidate", back_populates="job_description")

    def __repr__(self):
        return f"<JobDescription(id={self.id}, title='{self.title}')>"

class Candidate(Base):
    __tablename__ = 'candidates'

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(50)) # For WhatsApp
    resume_path = Column(String(500)) # Path to uploaded resume file
    resume_text = Column(Text) # Extracted text from resume
    job_description_id = Column(Integer, ForeignKey('job_descriptions.id'))
    current_status = Column(String(100), default=StatusConstants.CANDIDATE_ENTERED_BY_SYSTEM_DESCR) # <-- Updated default status
    ats_score = Column(Float, default=0.0) # ATS score from Gemini
    overall_interview_score = Column(Float, default=0.0) # Aggregate of all interview scores
    final_decision = Column(String(50)) # Accept, Reject, Hold
    ai_analysis = Column(Text)
    is_onboarded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    job_description = relationship("JobDescription", back_populates="candidates")
    interviews = relationship("Interview", back_populates="candidate", order_by="Interview.round_number")
    hr_discussions = relationship("HRDiscussion", back_populates="candidate")
    verifications = relationship("Verification", back_populates="candidate")
    status_history = relationship("StatusHistory", back_populates="candidate", order_by="StatusHistory.changed_at") # <-- NEW relationship

    def __repr__(self):
        return f"<Candidate(id={self.id}, name='{self.first_name} {self.last_name}', status='{self.current_status}')>"

class Interview(Base):
    __tablename__ = 'interviews'

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey('candidates.id'))
    round_number = Column(Integer, nullable=False) # 1, 2, etc.
    interviewer_name = Column(String(255))
    interview_date = Column(DateTime)
    score = Column(Float) # Score given by interviewer
    feedback = Column(Text)
    status = Column(String(50), default="Scheduled") # Could use status constants here too, but "Scheduled" is simple.
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="interviews")

    def __repr__(self):
        return f"<Interview(id={self.id}, candidate_id={self.candidate_id}, round={self.round_number}, status='{self.status}')>"

class HRDiscussion(Base):
    __tablename__ = 'hr_discussions'

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey('candidates.id'))
    discussion_date = Column(DateTime)
    notes = Column(Text)
    documents_collected = Column(Text) # JSON string or comma-separated list of document names
    status = Column(String(50), default="Pending") # Could use status constants here too
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="hr_discussions")

    def __repr__(self):
        return f"<HRDiscussion(id={self.id}, candidate_id={self.candidate_id}, status='{self.status}')>"

class Verification(Base):
    __tablename__ = 'verifications'

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey('candidates.id'))
    type = Column(String(100)) # e.g., "Background Check", "Credential Check"
    status = Column(String(50), default="Pending") # Could use status constants here too
    details = Column(Text)
    verified_by = Column(String(255))
    verified_date = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="verifications")

    def __repr__(self):
        return f"<Verification(id={self.id}, candidate_id={self.candidate_id}, type='{self.type}', status='{self.status}')>"

# --- NEW: StatusHistory Model ---
class StatusHistory(Base):
    __tablename__ = 'status_history'

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey('candidates.id'))
    status_code = Column(Integer, nullable=False) # Corresponds to StatusConstants.XYZ_CODE
    status_description = Column(String(100), nullable=False) # Corresponds to StatusConstants.XYZ_DESCR
    comments = Column(Text) # Additional comments for this specific status change
    changed_by = Column(String(100), default="System") # E.g., "System", "HR User ID"
    changed_at = Column(DateTime, default=func.now())

    candidate = relationship("Candidate", back_populates="status_history") # <-- NEW relationship

    def __repr__(self):
        return f"<StatusHistory(id={self.id}, candidate_id={self.candidate_id}, status_code={self.status_code}, changed_at={self.changed_at})>"
    


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # WARNING: This is insecure and should ONLY be used for temporary testing.
    password_plain = Column(String(255), nullable=True) 
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.password_plain = password

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"