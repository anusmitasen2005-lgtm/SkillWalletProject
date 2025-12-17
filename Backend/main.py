import models, database
from auth_utils import generate_otp, hash_otp, verify_otp
from database import engine
from fastapi.staticfiles import StaticFiles 
from config import settings # CRITICAL: Import configuration settings

# CRITICAL Imports for File Handling
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Path, File, UploadFile 
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uvicorn
import hashlib
import random
from datetime import datetime
from typing import Annotated, Optional, List 
import os 
import shutil 
from twilio.rest import Client # NEW: Import Twilio Client
from twilio.base.exceptions import TwilioRestException # NEW: Import Twilio Exception
from llm_utils import is_openai_configured, transcribe_audio_llm, evaluate_with_llm

# --- CRITICAL FIX 1: Guaranteed Table Creation ---
models.Base.metadata.create_all(bind=engine)
# --------------------------------------------------------------------------

# Initialize the main FastAPI application
app = FastAPI(
    title="Skill Wallet Backend API",
    description="The Digital Infrastructure for Verifiable Skills",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# --- NEW: Root Handler to avoid 404 on base URL ---
@app.get("/")
def read_root():
    return {
        "message": "Skill Wallet Backend is Live!",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

# --------------------------------------------------------------------------
# CORS CONFIGURATION (Unchanged)
# --------------------------------------------------------------------------
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# SERVE UPLOADED FILES (CRITICAL: Serves files from the 'uploaded_files' folder)
# --------------------------------------------------------------------------
if not os.path.isdir("uploaded_files"):
    os.makedirs("uploaded_files")
    
# The 'proofs' path allows the browser to access files 
app.mount("/proofs", StaticFiles(directory="uploaded_files"), name="proofs")
# --------------------------------------------------------------------------


# Dependency to get a DB session
GetDB = Annotated[Session, Depends(database.get_db)]

# --------------------------------------------------------------------------
# PLACEHOLDER: AUTHENTICATION DEPENDENCY (Unchanged)
# --------------------------------------------------------------------------

def get_token_header(request: Request) -> str:
    authorization: str = request.headers.get("Authorization")
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ")[1]

def get_current_user_id(token: str = Depends(get_token_header)) -> int:
    if not token.startswith("DEBUG_ACCESS_TOKEN_for_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_id = int(token.split("_")[-1])
        return user_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token structure: User ID missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def _is_owner(db: GetDB, user_id: int) -> bool:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False
    def _norm(s: str) -> str:
        return "".join(ch for ch in str(s) if ch.isdigit())
    return _norm(user.phone_number) == "919106983613"

# --------------------------------------------------------------------------
# 1. SCHEMAS (Data validation models)
# --------------------------------------------------------------------------
class PhoneRequest(BaseModel):
    # CRITICAL: Ensure the regex allows the starting '+' for international format
    phone_number: str = Field(pattern=r"^\+?[0-9]{10,14}$", example="+919876543210")

class OTPVerification(PhoneRequest):
    otp_code: str = Field(min_length=6, max_length=6, example="123456")
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class SkillIssueRequest(BaseModel):
    issuer_id: str = Field(example="issuer-google-cert")
    skill_name: str = Field(example="FastAPI Development")
    wallet_hash: str = Field(example="<verifiable_id_hash_from_wallet>")

class Tier2Update(BaseModel):
    aadhaar_number: Optional[str] = None
    aadhaar_file_path: Optional[str] = None
    pan_card_number: Optional[str] = None
    pan_card_file_path: Optional[str] = None
    voter_id_number: Optional[str] = None
    voter_id_file_path: Optional[str] = None
    driving_license_number: Optional[str] = None
    driving_license_file_path: Optional[str] = None
    ration_card_number: Optional[str] = None
    ration_card_file_path: Optional[str] = None

class Tier3Update(BaseModel):
    recommendation_file_path: Optional[str] = None
    community_verifier_id: Optional[str] = None
    previous_certificates_file_path: Optional[str] = None
    past_jobs_proof_file_path: Optional[str] = None
    
class WorkSubmissionRequest(BaseModel):
    skill_name: str = Field(example="Pottery")
    image_url: str = Field(example="s3://proof/pottery_final.jpg", description="URL to the image/video proof of work.")
    audio_file_url: str = Field(example="s3://audio/pottery_desc_hindi.mp3", description="URL to the user's voice description.")
    language_code: str = Field(example="hi", description="Language used in the voice recording.")

# --- NEW: Schema for updating flexible skills/domains ---
class SkillUpdate(BaseModel):
    skill_tag: str
    power_skill_tag: str

# --- NEW: Schema for updating core Name/Profession (CRITICAL FIX) ---
class CoreProfileUpdate(BaseModel):
    name: str
    profession: str

# --- NEW: Schema for updating core identity fields (Task 897) ---
class IdentityUpdate(BaseModel):
    email: Optional[str] = Field(None, example="user@example.com") 
    date_of_birth: Optional[str] = Field(None, example="1990-01-01", 
                                         description="Date of birth in YYYY-MM-DD format.")
    gender: Optional[str] = Field(None, example="Male") 

# --- NEW: Schema for requesting a credential review (Task 911) ---
class ReviewRequest(BaseModel):
    # This field is a placeholder for a future reviewer's comment or ID
    reviewer_comment: Optional[str] = Field(None, example="Ready for AI transcription and grading.")

# --- NEW: Schema for submitting a final grade/score (Task 914) ---
class GradeSubmission(BaseModel):
    grade_score: int = Field(ge=0, le=100, example=85, 
                             description="Final score (0-100) assigned by reviewer/AI.")
    final_notes: Optional[str] = Field(None, example="Excellent quality and clear audio description.")


def _safe_filesize(path: str) -> int:
    try:
        return os.path.getsize(path)
    except Exception:
        return 0

def _local_file_path_from_url(url: str) -> Optional[str]:
    if not url:
        return None
    if url.startswith("/proofs/"):
        return os.path.join("uploaded_files", url.split("/proofs/")[-1])
    if url.startswith("http://127.0.0.1:8000/proofs/") or url.startswith("http://localhost:8000/proofs/"):
        tail = url.split("/proofs/")[-1]
        return os.path.join("uploaded_files", tail)
    if url.startswith("uploaded_files"):
        return url
    return None

def _assess_authenticity(db: GetDB, user_id: int, proof_url: str) -> int:
    local_path = _local_file_path_from_url(proof_url)
    size = _safe_filesize(local_path) if local_path else 0
    base = 50 if local_path else 10
    if size > 500_000:
        base += 30
    if size > 2_000_000:
        base += 20
    dup = db.query(models.SkillCredential).filter(models.SkillCredential.proof_url == proof_url).count()
    if dup > 1:
        base -= 30
    return max(0, min(100, base))

def _transcribe_audio_stub(audio_url: str, language_code: str) -> str:
    name = os.path.basename(audio_url or "")
    return f"{language_code}:{name}".strip()

def _explanation_quality(transcription: str) -> int:
    t = (transcription or "").lower()
    length = len(t)
    score = 10
    markers = ["first", "second", "then", "next", "finally", "step", "process", "material", "tool"]
    hits = sum(1 for m in markers if m in t)
    score += min(40, hits * 8)
    if length > 120:
        score += 20
    if length > 300:
        score += 15
    return max(0, min(100, score))

def _visual_quality(proof_url: str) -> int:
    local_path = _local_file_path_from_url(proof_url)
    size = _safe_filesize(local_path) if local_path else 0
    ext = (os.path.splitext(proof_url or "")[1] or "").lower()
    score = 10
    if ext in [".mp4", ".mov", ".webm"]:
        score += 25
    if ext in [".jpg", ".jpeg", ".png", ".webp"]:
        score += 15
    if size > 500_000:
        score += 25
    if size > 2_000_000:
        score += 25
    return max(0, min(100, score))

def _alignment(transcription: str, skill_name: str, proof_url: str) -> float:
    t = (transcription or "").lower()
    s = (skill_name or "").lower()
    ok = 0
    if s and s in t:
        ok += 1
    if "image" in t and any(x in proof_url.lower() for x in [".jpg", ".jpeg", ".png", ".webp"]):
        ok += 1
    if "video" in t and any(x in proof_url.lower() for x in [".mp4", ".mov", ".webm"]):
        ok += 1
    return 0.6 + 0.2 * ok

def _final_score(auth_c: int, vis_q: int, exp_q: int, align: float) -> int:
    raw = 0.4 * auth_c + 0.35 * vis_q + 0.25 * exp_q
    return int(max(0, min(100, round(raw * align))))

# --------------------------------------------------------------------------
# 2. TIER 1 PHONE AUTHENTICATION ENDPOINTS (MODIFIED FOR LIVE TWILIO)
# --------------------------------------------------------------------------

@app.post("/api/v1/auth/otp/send")
def send_otp(request: PhoneRequest, db: GetDB):
    phone_number = request.phone_number
    otp_code = generate_otp(6) # Generate code for DB storage
    hashed_otp = hash_otp(otp_code)

    db_user = db.query(models.User).filter(models.User.phone_number == phone_number).first()
    
    if not db_user:
        db_user = models.User(phone_number=phone_number)
        db.add(db_user)
    
    db_user.otp_hash = hashed_otp
    db.commit() # Save hash before calling Twilio
    db.refresh(db_user)
    
    # Short-circuit for local development when Twilio is not configured
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_SERVICE_SID:
        print(f"DEBUG: OTP code for {phone_number}: {otp_code}")
        return {"message": "OTP sending disabled for local development.", "status": "pending"}
    
    # --- LIVE TWILIO SENDING LOGIC (Client Initialized in function) ---
    try:
        # CRITICAL: Initialize client here to avoid startup crash
        local_twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # CRITICAL FIX: Use the original TWILIO_SERVICE_SID variable name
        local_twilio_client.verify.v2.services(settings.TWILIO_SERVICE_SID) \
            .verifications \
            .create(to=phone_number, channel='sms')
        
    except TwilioRestException as e:
        # LOG THE REAL TWILIO ERROR
        print("-" * 50)
        print(f"!!! CRITICAL TWILIO REST EXCEPTION !!!")
        print(f"!!! CODE: {e.code} | STATUS: {e.status} | MESSAGE: {e.msg} !!!")
        print("-" * 50)
        
        # Raise an HTTPException with a specific detail
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP service failed. Check server logs for Twilio error code."
        )
    except Exception as e:
        # Catch any other failure (e.g., failed client initialization due to bad config)
        print("-" * 50)
        print(f"!!! GENERIC SERVER ERROR (Twilio Client Init/Call Failed): {type(e).__name__}: {e} !!!")
        print("-" * 50)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server encountered a configuration error during OTP process."
        )

    # SUCCESS: Return 200 OK status to the frontend
    print(f"DEBUG: Successfully triggered Twilio send for {phone_number}.")
    return {"message": "OTP sent successfully.", "status": "pending"}


@app.post("/api/v1/auth/otp/verify", response_model=TokenResponse)
def verify_otp_endpoint(request: OTPVerification, db: GetDB):
    db_user = db.query(models.User).filter(models.User.phone_number == request.phone_number).first()
    
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    is_valid = verify_otp(request.otp_code, db_user.otp_hash)

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP.")

    access_token = f"DEBUG_ACCESS_TOKEN_for_{db_user.id}"
    # Auto-set owner profile for the owner phone number
    def _norm(s: str) -> str:
        return "".join(ch for ch in str(s) if ch.isdigit())
    if _norm(db_user.phone_number) == "919106983613":
        db_user.name = "Anusmita Sen"
        db_user.profession = "Owner"
    db_user.otp_hash = None
    db.commit()

    return {"access_token": access_token, "token_type": "bearer"}


# --------------------------------------------------------------------------
# 3. CORE IDENTITY ENDPOINTS
# --------------------------------------------------------------------------

@app.get("/api/v1/user/profile/{user_id}")
def get_user_profile(user_id: int, db: GetDB):
    """
    Retrieves the user's complete profile, including all identity tiers.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Convert date_of_birth to YYYY-MM-DD string format for API output
    dob_str = db_user.date_of_birth.strftime("%Y-%m-%d") if db_user.date_of_birth else None

    profile_data = {
        "user_id": db_user.id,
        "phone_number": db_user.phone_number,
        
        # --- NEW IDENTITY FIELDS ---
        "email": db_user.email,
        "date_of_birth": dob_str,
        "gender": db_user.gender,
        # ---------------------------

        # CRITICAL FIX: Include Name and Profession
        "name": db_user.name,
        "profession": db_user.profession,
        # CRITICAL FIX: Include Profile Photo Path
        "profile_photo_file_path": getattr(db_user, 'profile_photo_file_path', None),
        
        "skill_tag": db_user.skill_tag,
        "power_skill_tag": getattr(db_user, 'power_skill_tag', 'Unassigned'),
        
        # Tier 2 Data
        "aadhaar_number": db_user.aadhaar_number,
        "aadhaar_file_path": db_user.aadhaar_file_path,
        "pan_card_number": db_user.pan_card_number,
        "pan_card_file_path": db_user.pan_card_file_path,
        "voter_id_number": db_user.voter_id_number,
        "voter_id_file_path": db_user.voter_id_file_path,
        "driving_license_number": db_user.driving_license_number,
        "driving_license_file_path": db_user.driving_license_file_path,
        "ration_card_number": db_user.ration_card_number,
        "ration_card_file_path": db_user.ration_card_file_path,
        
        # Tier 3 Data
        "recommendation_file_path": getattr(db_user, "recommendation_file_path", None),
        "previous_certificates_file_path": getattr(db_user, "previous_certificates_file_path", None),
        "past_jobs_proof_file_path": getattr(db_user, "past_jobs_proof_file_path", None),
        "tier3_cibil_score": db_user.tier3_cibil_score,
        "wallet_initialized": db_user.skill_wallet is not None
    }
    return profile_data

# --- NEW ENDPOINT: RETRIEVE USER MICRO-PROOFS (TASK 635) ---
@app.get("/api/v1/user/proofs/{user_id}")
def get_user_proofs(user_id: int, db: GetDB):
    """
    Retrieves all Skill Credentials (micro-proofs) for a given user.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or db_user.skill_wallet is None:
        return [] # Return an empty list if no wallet exists

    # Retrieve all credentials linked to the user's wallet
    credentials = db.query(models.SkillCredential).filter(
        models.SkillCredential.skill_wallet_id == db_user.skill_wallet.id
    ).all()
    
    # Format the data for the frontend
    proof_list = [{
        "id": cred.id,
        "title": cred.skill_name,
        "skill": cred.skill_name,
        "visualProofUrl": cred.proof_url,
        "audioStoryUrl": cred.audio_description_url,
        "language_code": cred.language_code,
        # Fetching real AI/Grading data (must be present in models.py)
        "grade_score": getattr(cred, 'grade_score', 0), 
        "transcription": getattr(cred, 'transcription', "N/A"), 
        "likes": random.randint(5, 30),  # Mock likes/comments for now
        "comments": random.randint(1, 5)
    } for cred in credentials]
    
    return proof_list
# -------------------------------------------------------------


# --------------------------------------------------------------------------
# 3.1. TIER 2 FILE UPLOAD (CRITICAL FIX: Parameter Order and Dependency)
# --------------------------------------------------------------------------
@app.post("/api/v1/identity/tier2/upload/{user_id}")
async def upload_tier2_document(
    user_id: int, 
    file_type: str, 
    db: GetDB, # FIX 1: Moved parameter without default before parameter with default
    file: UploadFile = File(...), # FIX 2: Parameter with default is now last
):
    """
    Handles the actual binary upload of a single document file and saves it locally.
    Saves file location in the corresponding field (e.g., aadhaar_file_path or profile_photo_file_path).
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 1. Define a secure path to save the file
    user_folder = os.path.join("uploaded_files", str(user_id))
    os.makedirs(user_folder, exist_ok=True)
    
    # Sanitize filename
    safe_filename = file.filename.replace('/', '_').replace('\\', '_')
    file_location = os.path.join(user_folder, f"{file_type}_{safe_filename}")
    
    # 2. Save the file locally
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        # Check if the error is due to a lack of the directory/permissions
        if not os.path.isdir(user_folder):
             raise HTTPException(status_code=500, detail="File system error. Could not create or write to the 'uploaded_files' directory.")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    raw_type = (file_type or "").strip().lower()
    aliases = {
        "pan": "pan_card",
        "aadhaar_card": "aadhaar",
        "voter": "voter_id",
        "dl": "driving_license",
        "license": "driving_license",
        "profile": "profile_photo",
        "photo": "profile_photo",
    }
    file_type = aliases.get(raw_type, raw_type)
    # 3. Update the database with the file's path (based on file_type)
    # Validate and map file_type to a known Tier-2 column
    allowed_file_types = {
        "aadhaar": "aadhaar_file_path",
        "pan_card": "pan_card_file_path",
        "voter_id": "voter_id_file_path",
        "driving_license": "driving_license_file_path",
        "ration_card": "ration_card_file_path",
        "profile_photo": "profile_photo_file_path",
    }
    if file_type not in allowed_file_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file_type for Tier-2 upload. Allowed: aadhaar, pan_card, voter_id, driving_license, ration_card, profile_photo. Aliases: pan→pan_card."
        )
    column_name = allowed_file_types[file_type]
    
    db.query(models.User).filter(models.User.id == user_id).update({column_name: file_location})
    db.commit()

    return {
        "message": f"File '{safe_filename}' uploaded and saved successfully.",
        "file_location": file_location,
        "user_id": user_id
    }

@app.post("/api/v1/work/upload_proof/{user_id}")
async def upload_work_proof(
    user_id: int,
    kind: str,
    db: GetDB,
    file: UploadFile = File(...),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if kind not in ["image", "video", "audio"]:
        raise HTTPException(status_code=400, detail="Invalid kind. Allowed: image, video, audio.")
    user_folder = os.path.join("uploaded_files", str(user_id))
    os.makedirs(user_folder, exist_ok=True)
    safe_filename = file.filename.replace('/', '_').replace('\\', '_')
    file_location = os.path.join(user_folder, f"proof_{kind}_{safe_filename}")
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    proof_url = f"/proofs/{user_id}/proof_{kind}_{safe_filename}"
    return {"message": "Proof uploaded", "user_id": user_id, "proof_url": proof_url}


# --------------------------------------------------------------------------
# 3.2. TIER 2 NUMBER/TEXT UPDATE (Fix: Removed conflicting dependency)
# --------------------------------------------------------------------------
@app.post("/api/v1/identity/tier2/{user_id}") 
def submit_tier2_verification(
    user_id: int, 
    data: Tier2Update, 
    db: GetDB
):
    """
    Submits ALL optional text/number fields (e.g., Aadhaar number).
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None} # Changed to model_dump for Pydantic v2

    for field, value in update_fields.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    return {
        "message": "Tier 2 identity documents updated successfully. Optionality maintained.",
        "status": "Submission Saved",
        "user_id": user_id
    }

@app.post("/api/v1/identity/tier3/upload/{user_id}")
async def upload_tier3_document(
    user_id: int,
    file_type: str,
    db: GetDB,
    file: UploadFile = File(...),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    user_folder = os.path.join("uploaded_files", str(user_id))
    os.makedirs(user_folder, exist_ok=True)
    safe_filename = file.filename.replace("/", "_").replace("\\", "_")
    file_location = os.path.join(user_folder, f"tier3_{file_type}_{safe_filename}")
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    raw_type = (file_type or "").strip().lower()
    aliases = {
        "recommendation": "recommendation_file_path",
        "previous_certificates": "previous_certificates_file_path",
        "certificates": "previous_certificates_file_path",
        "past_jobs": "past_jobs_proof_file_path",
        "jobs": "past_jobs_proof_file_path",
    }
    column_name = aliases.get(raw_type, raw_type)
    allowed = {
        "recommendation_file_path",
        "previous_certificates_file_path",
        "past_jobs_proof_file_path",
    }
    if column_name not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file_type for Tier-3 upload. Allowed: recommendation, previous_certificates, past_jobs.")
    db.query(models.User).filter(models.User.id == user_id).update({column_name: file_location})
    db.commit()
    return {"message": "File uploaded", "file_location": file_location, "user_id": user_id}

# --------------------------------------------------------------------------
# 3.3. TIER 3 IDENTITY ENDPOINT (Fix: Removed conflicting dependency)
# --------------------------------------------------------------------------
@app.post("/api/v1/identity/tier3/{user_id}")
def submit_tier3_verification(
    user_id: int,
    data: Tier3Update, 
    db: GetDB,
):
    """
    [Tier 3 Identity] Submits ALL optional professional proofs.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None} # Changed to model_dump for Pydantic v2

    for field, value in update_fields.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    return {
        "message": "Tier 3 professional proofs submitted successfully. Optionality maintained.",
        "status": "Review Pending",
        "user_id": user_id
    }


# --------------------------------------------------------------------------
# 3.4. NEW ENDPOINT: UPDATE SKILLS/DOMAINS (Fix: Removed conflicting dependency)
# --------------------------------------------------------------------------
@app.post("/api/v1/user/update_skill_tag/{user_id}")
def update_user_skills(user_id: int, request: SkillUpdate, db: GetDB):
    """Updates the user's primary domain and differentiating power skill."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Note: We need to use getattr for power_skill_tag in case the old model is still loaded
    setattr(db_user, 'skill_tag', request.skill_tag)
    setattr(db_user, 'power_skill_tag', request.power_skill_tag)
    
    db.commit()
    db.refresh(db_user)

    return {"message": "Skill tags updated successfully.", 
            "primary_domain": db_user.skill_tag, 
            "power_skill": db_user.power_skill_tag}


# --------------------------------------------------------------------------
# 3.5. NEW ENDPOINT: UPDATE CORE PROFILE (Name/Profession)
# --------------------------------------------------------------------------
@app.post("/api/v1/user/update_core_profile/{user_id}")
def update_core_profile(user_id: int, request: CoreProfileUpdate, db: GetDB):
    """Updates the user's name and profession."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Only update the fields provided in the request body
    db_user.name = request.name
    db_user.profession = request.profession
    
    db.commit()
    db.refresh(db_user)

    return {"message": "Core profile updated successfully.", 
            "name": db_user.name, 
            "profession": db_user.profession}
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# ADMIN ENDPOINTS (Owner access only)
# --------------------------------------------------------------------------
@app.get("/api/v1/admin/users")
def list_all_users(
    db: GetDB,
    current_user_id: int = Depends(get_current_user_id),
):
    if not _is_owner(db, current_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required. Please log in as owner.")
    users = db.query(models.User).all()
    result = []
    for u in users:
        wallet = getattr(u, "skill_wallet", None)
        total_credentials = 0
        verified_credentials = 0
        if wallet:
            creds = db.query(models.SkillCredential).filter(models.SkillCredential.skill_wallet_id == wallet.id).all()
            total_credentials = len(creds)
            verified_credentials = sum(1 for c in creds if getattr(c, "is_verified", False))
        docs_submitted = sum(1 for p in [
            getattr(u, "aadhaar_file_path", None),
            getattr(u, "pan_card_file_path", None),
            getattr(u, "voter_id_file_path", None),
            getattr(u, "driving_license_file_path", None),
            getattr(u, "ration_card_file_path", None),
            getattr(u, "profile_photo_file_path", None),
            getattr(u, "recommendation_file_path", None),
            getattr(u, "previous_certificates_file_path", None),
            getattr(u, "past_jobs_proof_file_path", None),
        ] if p)
        result.append({
            "user_id": u.id,
            "name": getattr(u, "name", None),
            "profession": getattr(u, "profession", None),
            "phone_number": getattr(u, "phone_number", None),
            "email": getattr(u, "email", None),
            "docs_submitted": docs_submitted,
            "total_credentials": total_credentials,
            "verified_credentials": verified_credentials,
        })
    return result

@app.get("/api/v1/admin/users/{user_id}")
def get_user_admin_details(
    user_id: int,
    db: GetDB,
    current_user_id: int = Depends(get_current_user_id),
):
    if not _is_owner(db, current_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required. Please log in as owner.")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    dob_str = db_user.date_of_birth.strftime("%Y-%m-%d") if db_user.date_of_birth else None
    profile = {
        "user_id": db_user.id,
        "phone_number": db_user.phone_number,
        "email": getattr(db_user, "email", None),
        "date_of_birth": dob_str,
        "gender": getattr(db_user, "gender", None),
        "name": getattr(db_user, "name", None),
        "profession": getattr(db_user, "profession", None),
        "profile_photo_file_path": getattr(db_user, "profile_photo_file_path", None),
        "aadhaar_file_path": getattr(db_user, "aadhaar_file_path", None),
        "pan_card_file_path": getattr(db_user, "pan_card_file_path", None),
        "voter_id_file_path": getattr(db_user, "voter_id_file_path", None),
        "driving_license_file_path": getattr(db_user, "driving_license_file_path", None),
        "ration_card_file_path": getattr(db_user, "ration_card_file_path", None),
        "recommendation_file_path": getattr(db_user, "recommendation_file_path", None),
        "previous_certificates_file_path": getattr(db_user, "previous_certificates_file_path", None),
        "past_jobs_proof_file_path": getattr(db_user, "past_jobs_proof_file_path", None),
    }
    return {"profile": profile}

# --------------------------------------------------------------------------
# 3.6. NEW ENDPOINT: UPDATE CORE IDENTITY INFO (Email, DOB, Gender)
# --------------------------------------------------------------------------
@app.post("/api/v1/user/update_identity_info/{user_id}")
def update_user_identity_info(user_id: int, request: IdentityUpdate, db: GetDB):
    """Updates the user's non-KYC core identity information (Email, DOB, Gender)."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Convert the Pydantic model to a dictionary, excluding None values
    update_fields = request.model_dump(exclude_none=True)

    if "date_of_birth" in update_fields:
        try:
            # Convert string to Python date object for SQLAlchemy
            dob_date = datetime.strptime(update_fields["date_of_birth"], "%Y-%m-%d").date()
            update_fields["date_of_birth"] = dob_date
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Invalid date format. Use YYYY-MM-DD."
            )

    # Apply all valid fields to the database object
    for field, value in update_fields.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)

    return {"message": "User identity information updated successfully.", 
            "user_id": user_id,
            "email": db_user.email,
            "date_of_birth": db_user.date_of_birth.strftime("%Y-%m-%d") if db_user.date_of_birth else None,
            "gender": db_user.gender}


# --------------------------------------------------------------------------
# 4. WORK SUBMISSION / TOKEN MINTING ENDPOINT (PHASE 4 IMPLEMENTATION)
# --------------------------------------------------------------------------
@app.post("/api/v1/work/submit/{user_id}")
def submit_work_portfolio(
    user_id: int, 
    request: WorkSubmissionRequest, 
    db: GetDB
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_string = f"{user_id}:{request.skill_name}:{timestamp}"
    token_hash = hashlib.sha256(unique_string.encode()).hexdigest()

    if db_user.skill_wallet is None:
        db_user.skill_wallet = models.SkillWallet(
            user_id=user_id, 
            wallet_hash=f"WALLET-ID-{user_id}-{random.randint(1000, 9999)}"
        )
        db.add(db_user.skill_wallet)
        db.flush() 

    db_user.skill_wallet.last_minted_skill = request.skill_name
    db_user.skill_wallet.last_mint_date = datetime.now()
    
    auth_conf = _assess_authenticity(db, user_id, request.image_url)
    if auth_conf < 40:
        raise HTTPException(status_code=400, detail="Proof authenticity failed. No score generated.")
    transcription_text = _transcribe_audio_stub(request.audio_file_url, request.language_code)
    expl_q = _explanation_quality(transcription_text)
    vis_q = _visual_quality(request.image_url)
    align = _alignment(transcription_text, request.skill_name, request.image_url)
    final = _final_score(auth_conf, vis_q, expl_q, align)
    final_300_900 = 300 + int(final * 6)

    new_credential = models.SkillCredential(
        skill_wallet_id=db_user.skill_wallet.id,
        skill_name=request.skill_name,
        proof_url=request.image_url,
        audio_description_url=request.audio_file_url,
        token_id=f"SW-TKN-{token_hash[:8]}", 
        language_code=request.language_code
    )
    new_credential.grade_score = final_300_900
    new_credential.transcription = transcription_text
    new_credential.is_verified = auth_conf >= 60 and final >= 50
    
    db.add(new_credential)

    db.commit()
    db.refresh(db_user)
    db.refresh(new_credential)

    return {
        "message": "Skill proof graded successfully.",
        "skill_token": new_credential.token_id,
        "skill_name": request.skill_name,
        "grade_score": new_credential.grade_score,
        "transcription": new_credential.transcription
    }
@app.post("/api/v1/work/evaluate/{credential_id}")
def evaluate_skill(
    credential_id: int,
    db: GetDB
):
    db_credential = db.query(models.SkillCredential).filter(models.SkillCredential.id == credential_id).first()
    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")
    db_wallet = db.query(models.SkillWallet).filter(models.SkillWallet.id == db_credential.skill_wallet_id).first()
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    db_user = db.query(models.User).filter(models.User.id == db_wallet.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    transcription_text = db_credential.transcription or transcribe_audio_llm(db_credential.audio_description_url, db_credential.language_code or "en")
    user_ctx = {
        "name": db_user.name,
        "profession": db_user.profession,
        "date_of_birth": db_user.date_of_birth.strftime("%Y-%m-%d") if db_user.date_of_birth else None,
        "state": getattr(db_user, "state", None),
        "district": getattr(db_user, "district", None),
        "locality": getattr(db_user, "locality", None),
        "education_docs": {
            "previous_certificates_file_path": getattr(db_user, "previous_certificates_file_path", None),
            "past_jobs_proof_file_path": getattr(db_user, "past_jobs_proof_file_path", None),
            "recommendation_file_path": getattr(db_user, "recommendation_file_path", None)
        }
    }
    result = evaluate_with_llm(db_credential.skill_name, transcription_text, db_credential.proof_url, user_ctx)
    db_credential.grade_score = int(result.get("final_score_300_900", 0))
    db_credential.transcription = transcription_text
    db_credential.is_verified = db_credential.grade_score >= 600
    db.commit()
    db.refresh(db_credential)
    return {
        "credential_id": db_credential.id,
        "skill_name": db_credential.skill_name,
        "visual_execution_score": result.get("visual_execution_score"),
        "process_understanding_score": result.get("process_understanding_score"),
        "final_score_300_900": result.get("final_score_300_900"),
        "overall_judgment": result.get("overall_judgment"),
        "feedback": result.get("feedback"),
        "proof_url": db_credential.proof_url,
        "audio_url": db_credential.audio_description_url
    }

# --------------------------------------------------------------------------
# 4.1. NEW ENDPOINT: REQUEST SKILL CREDENTIAL REVIEW (TASK 911)
# --------------------------------------------------------------------------
@app.post("/api/v1/work/request_review/{credential_id}")
def request_skill_review(
    credential_id: int, 
    request: ReviewRequest, 
    db: GetDB
):
    """
    Flags an existing SkillCredential for review (AI transcription/grading).
    
    NOTE: This endpoint is used after the initial work submission to officially 
    start the verification pipeline (Phase 4/6).
    """
    # 1. Retrieve the credential
    db_credential = db.query(models.SkillCredential).filter(
        models.SkillCredential.id == credential_id
    ).first()

    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")

    # 2. Update the status and add the comment
    # In a real pipeline, this would trigger an asynchronous job.
    db_credential.is_verified = False # Reset verification status if user re-requests review
    
    # Placeholder for tracking review status/comments
    # NOTE: You may need to add a 'review_status' or 'review_comment' column to models.SkillCredential later
    # For now, we use the comment to signal processing
    if request.reviewer_comment:
        print(f"DEBUG: Review comment added: {request.reviewer_comment}")

    # 3. Commit changes
    db.commit()
    db.refresh(db_credential)

    return {
        "message": "Skill Credential flagged for AI/Community review successfully.",
        "credential_id": db_credential.id,
        "skill_name": db_credential.skill_name,
        "is_verified": db_credential.is_verified,
        "status_note": "Awaiting AI Transcription and Grading."
    }

# --------------------------------------------------------------------------
# 4.2. NEW ENDPOINT: SUBMIT SKILL CREDENTIAL GRADE (TASK 914)
# --------------------------------------------------------------------------
@app.post("/api/v1/work/submit_grade/{credential_id}")
def submit_skill_grade(
    credential_id: int, 
    grade_data: GradeSubmission, 
    db: GetDB
):
    """
    Submits the final grade/score for a SkillCredential and sets it as verified.
    This simulates the successful conclusion of the AI/Community review process.
    """
    # 1. Retrieve the credential
    db_credential = db.query(models.SkillCredential).filter(
        models.SkillCredential.id == credential_id
    ).first()

    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")

    # 2. Apply the final grade and verification status
    db_credential.grade_score = grade_data.grade_score
    db_credential.is_verified = True # Credential is now officially verified

    # The final_notes field isn't stored in models.SkillCredential, so we just log it.
    # In a later iteration, you might store this in a separate ReviewLog table.
    
    # 3. Commit changes
    db.commit()
    db.refresh(db_credential)

    return {
        "message": "Credential grade submitted and verification complete.",
        "credential_id": db_credential.id,
        "skill_name": db_credential.skill_name,
        "grade_score": db_credential.grade_score,
        "is_verified": db_credential.is_verified
    }

# --------------------------------------------------------------------------
# PLACEHOLDER ENDPOINTS (Unchanged)
# --------------------------------------------------------------------------

@app.post("/api/v1/wallet/initialize")
def initialize_wallet():
    return {"message": "Wallet initialization endpoint - Placeholder"}

@app.get("/api/v1/wallet/data/{user_id}")
def get_wallet_data(user_id: int):
    return {"message": f"Retrieving wallet data for user {user_id} - Placeholder"}

@app.post("/api/v1/wallet/issue_skill")
def issue_skill(request: SkillIssueRequest):
    return {"message": f"Skill '{request.skill_name}' issued to wallet '{request.wallet_hash}' - Placeholder"}

@app.post("/api/v1/audio/transcribe/{user_id}")
def transcribe_audio(user_id: int):
    return {"message": f"Audio transcription for user {user_id} - Placeholder"}

@app.get("/")
def read_root():
    """Returns the status of the API."""
    return {"message": "Skill Wallet API is running!", "status": "Ready"}

@app.get("/api/v1/health/twilio_check")
def twilio_health_check():
    try:
        # Initialize client here to test the loading of ACCOUNT_SID/AUTH_TOKEN
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Attempt to fetch the Account SID from the API (a lightweight test)
        account = client.api.v2010.accounts(settings.TWILIO_ACCOUNT_SID).fetch()
        
        # Check if the fetched account SID matches the configured one
        if account.sid == settings.TWILIO_ACCOUNT_SID:
            return {
                "status": "Healthy",
                "message": "Twilio client is initialized and authenticated successfully.",
                "account_sid": account.sid,
                "friendly_name": account.friendly_name
            }
        else:
            raise Exception("Twilio connection succeeded but returned unexpected Account SID.")

    except TwilioRestException as e:
        # Catch specific REST API errors (Bad credentials, etc.)
        print("-" * 50)
        print(f"!!! TWILIO CHECK FAILED (REST EXCEPTION) !!!")
        print(f"!!! CODE: {e.code} | STATUS: {e.status} | MESSAGE: {e.msg} !!!")
        print("-" * 50)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Twilio REST Error: Code {e.code}. Check Render logs."
        )
    except Exception as e:
        # Catch generic errors (e.g., settings.TWILIO_ACCOUNT_SID is None)
        print("-" * 50)
        print(f"!!! TWILIO CHECK FAILED (GENERIC ERROR) !!!")
        print(f"!!! Error: {type(e).__name__}: {e} !!!")
        print("-" * 50)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Twilio configuration failed. Environment variables not loading correctly."
        )
