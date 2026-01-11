from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

# Define the declarative base for all models
Base = declarative_base()

# ----------------------------------------------------------------------
# 1. Skill Wallet User Model (Tier 1/Initial Identity)
# ----------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    # Auth Fields
    phone_number = Column(String, unique=True, index=True)
    otp_hash = Column(String)
    otp_expiry = Column(DateTime)
    is_verified = Column(Boolean, default=False)
    
    # --- CRITICAL FIX: Added Missing Fields for Wallet Initialization ---
    verification_status = Column(String(50), default="PENDING")
    tier_level = Column(Integer, default=0)
    kyc_data = Column(Text, default="{}") # Used for flexible JSON data or default empty string
    last_login_at = Column(DateTime, default=datetime.utcnow) # ADDED: Required by main.py
    # -------------------------------------------------------------------

    # --- NEW CORE IDENTITY FIELDS ---
    email = Column(String, unique=True, index=True, nullable=True) 
    date_of_birth = Column(Date, nullable=True)                  
    gender = Column(String, nullable=True)                       

    # Core Profile Fields (CRITICAL: Added Name and Profession)
    name = Column(String, nullable=True)     # NEW
    profession = Column(String, nullable=True) # NEW
    age = Column(Integer, nullable=True) # NEW: Added Age
    state = Column(String, nullable=True) # NEW: Added State
    district = Column(String, nullable=True) # NEW: Added District
    local_area = Column(String, nullable=True) # NEW: Added Local Area
    profile_photo_file_path = Column(String, nullable=True) # NEW

    # --- TIER 1: SKILL TAG ---
    skill_tag = Column(String, nullable=True)
    power_skill_tag = Column(String, nullable=True) 

    # --- TIER 2: GOVERNMENT PROOFS (All optional, Nullable=True) ---
    aadhaar_number = Column(String, nullable=True)
    aadhaar_file_path = Column(String, nullable=True)

    pan_card_number = Column(String, nullable=True)
    pan_card_file_path = Column(String, nullable=True)

    voter_id_number = Column(String, nullable=True)
    voter_id_file_path = Column(String, nullable=True)

    driving_license_number = Column(String, nullable=True)
    driving_license_file_path = Column(String, nullable=True)

    ration_card_number = Column(String, nullable=True)
    ration_card_file_path = Column(String, nullable=True)

    # --- TIER 2 EXTENSION: NEW TRUST RECORDS ---
    training_letter_file_path = Column(String, nullable=True)
    apprenticeship_proof_file_path = Column(String, nullable=True)
    local_authority_proof_file_path = Column(String, nullable=True)

    # --- TIER 3: PROFESSIONAL PROOFS (All optional) ---
    recommendation_file_path = Column(String, nullable=True)
    community_verifier_id = Column(String, nullable=True)
    previous_certificates_file_path = Column(String, nullable=True)
    past_jobs_proof_file_path = Column(String, nullable=True)

    # --- TIER 3 EXTENSION: WORK JOURNEY ---
    daily_task_photo_file_path = Column(String, nullable=True)
    work_video_file_path = Column(String, nullable=True)
    campus_lab_doc_file_path = Column(String, nullable=True)
    community_recording_file_path = Column(String, nullable=True)

    # --- TIER 3: SKILL SCORE ---
    tier3_cibil_score = Column(Integer, default=0)

    # Relationship to SkillWallet (One User owns One SkillWallet)
    skill_wallet = relationship("SkillWallet", back_populates="owner", uselist=False)


# ----------------------------------------------------------------------
# 2. Skill Wallet Core Model (Tier 2/3 Identity Infrastructure)
# ----------------------------------------------------------------------
class SkillWallet(Base):
    __tablename__ = "skill_wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)

    # CRITICAL FIX: Renamed to wallet_hash to match main.py code
    wallet_hash = Column(String, unique=True, nullable=True) 
    
    is_verified_government = Column(Boolean, default=False)
    is_verified_work = Column(Boolean, default=False)
    issued_skills = Column(Text, nullable=True) 

    # For Phase 4 tracking
    last_minted_skill = Column(String, nullable=True)
    last_mint_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 

    # Relationships
    owner = relationship("User", back_populates="skill_wallet") 
    credentials = relationship("SkillCredential", back_populates="wallet") 


# # ----------------------------------------------------------------------
# 3. Skill Credential Model (The actual verifiable skill certificates)
# ----------------------------------------------------------------------
class SkillCredential(Base):
    __tablename__ = "skill_credentials"

    id = Column(Integer, primary_key=True, index=True)
    skill_wallet_id = Column(Integer, ForeignKey("skill_wallets.id"), index=True) # NOTE: Using skill_wallet_id
    
    # Skill Data
    skill_name = Column(String, index=True)
    token_id = Column(String, unique=True) # Unique ID of the minted token
    
    # Proofs
    proof_url = Column(String) # URL to the work image/video
    audio_description_url = Column(String) # URL to the audio description
    language_code = Column(String) # e.g., 'hi', 'en'
    
    # AI and Grading Fields 
    grade_score = Column(Integer, default=0) # Kept for backward compatibility
    skill_trust_score = Column(Integer, default=300) # Range: 300-900
    transcription = Column(Text, nullable=True) 
    evaluation_feedback = Column(Text, nullable=True) # JSON String: {contributing_factors, limiting_factors, improvement_tips}

    # Context Fields (Snapshot at time of submission)
    context_profession = Column(String, nullable=True)
    context_location = Column(String, nullable=True)

    # Verification Status - Track the verification pipeline
    verification_status = Column(String, default="PENDING")  # PENDING, TRANSCRIBING, GRADING, VERIFIED
    is_verified = Column(Boolean, default=False) 

    issued_date = Column(DateTime, default=datetime.utcnow)

    # Relationship back to the Skill Wallet
    wallet = relationship("SkillWallet", back_populates="credentials")

# ----------------------------------------------------------------------
# 4. SKILL BANK MODELS (Teaching & Learning Layer)
# ----------------------------------------------------------------------

class SkillLesson(Base):
    __tablename__ = "skill_lessons"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    title = Column(String)
    description = Column(String)
    type = Column(String) # 'video', 'document'
    
    file_path = Column(String) # Path to video or doc
    price = Column(Integer, default=0)
    duration_minutes = Column(Integer, default=15) # New field for learning time tracking
    language = Column(String, default="English") # NEW: For filters
    difficulty = Column(String, default="Beginner") # NEW: For filters
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher = relationship("User")

class LiveSessionReminder(Base):
    __tablename__ = "live_session_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(Integer, ForeignKey("live_sessions.id"))
    phone_number = Column(String)
    reminder_date = Column(String) # Storing as string for simplicity YYYY-MM-DD
    reminder_time = Column(String) # Storing as string HH:MM AM/PM
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    session = relationship("LiveSession")

# ----------------------------------------------------------------------
# 5. OPPORTUNITY CACHE (For DuckDuckGo Results)
# ----------------------------------------------------------------------
class OpportunityCache(Base):
    __tablename__ = "opportunity_cache"

    id = Column(Integer, primary_key=True, index=True)
    query_hash = Column(String, unique=True, index=True)
    data_json = Column(Text)  # Stores list of results as JSON
    created_at = Column(DateTime, default=datetime.utcnow)

class LessonEnrollment(Base):
    __tablename__ = "lesson_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    lesson_id = Column(Integer, ForeignKey("skill_lessons.id"), index=True)
    
    status = Column(String, default="ENROLLED") # ENROLLED, IN_PROGRESS, COMPLETED
    progress_percent = Column(Integer, default=0)
    
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime, default=datetime.utcnow) # NEW: For tracking weekly/monthly activity
    completed_at = Column(DateTime, nullable=True)
    
    user = relationship("User")
    lesson = relationship("SkillLesson")

class SessionEnrollment(Base):
    __tablename__ = "session_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    session_id = Column(Integer, ForeignKey("live_sessions.id"), index=True)
    
    status = Column(String, default="REGISTERED") # REGISTERED, ATTENDED
    
    registered_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    session = relationship("LiveSession")

class LiveSession(Base):
    __tablename__ = "live_sessions"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    title = Column(String)
    description = Column(String)
    
    scheduled_at = Column(DateTime)
    price = Column(Integer, default=0)
    language = Column(String, default="English") # NEW: For filters
    difficulty = Column(String, default="Beginner") # NEW: For filters
    
    is_active = Column(Boolean, default=False)
    meeting_link = Column(String, nullable=True) # Simulated link
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher = relationship("User")
