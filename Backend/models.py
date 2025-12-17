from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date # ADDED Date
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

    # --- NEW CORE IDENTITY FIELDS ---
    email = Column(String, unique=True, index=True, nullable=True) # NEW: Added email
    date_of_birth = Column(Date, nullable=True)                  # NEW: Added Date of Birth (uses Date type)
    gender = Column(String, nullable=True)                       # NEW: Added Gender
    # --------------------------------

    # Core Profile Fields (CRITICAL: Added Name and Profession)
    name = Column(String, nullable=True)     # NEW
    profession = Column(String, nullable=True) # NEW
    profile_photo_file_path = Column(String, nullable=True) # NEW

    # --- TIER 1: SKILL TAG ---
    skill_tag = Column(String, default="Builder • Precision")
    power_skill_tag = Column(String, default="Unassigned") 

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

    # --- TIER 3: PROFESSIONAL PROOFS (All optional) ---
    recommendation_file_path = Column(String, nullable=True)
    community_verifier_id = Column(String, nullable=True)
    previous_certificates_file_path = Column(String, nullable=True)
    past_jobs_proof_file_path = Column(String, nullable=True)

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
    grade_score = Column(Integer, default=0)
    transcription = Column(Text, nullable=True) 

    # Verification Status
    is_verified = Column(Boolean, default=False) 

    issued_date = Column(DateTime, default=datetime.utcnow)

    # Relationship back to the Skill Wallet
    wallet = relationship("SkillWallet", back_populates="credentials")