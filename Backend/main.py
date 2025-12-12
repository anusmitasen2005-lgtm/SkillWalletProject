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

# --- TWILIO CLIENT INITIALIZATION ---
# Initialize the client globally using settings from config.py
# This will use the TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN from Render Env Vars.
TWILIO_CLIENT = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
# ------------------------------------

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

# --------------------------------------------------------------------------
# CORS CONFIGURATION (Unchanged)
# --------------------------------------------------------------------------
origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
]

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
    
    # --- LIVE TWILIO SENDING LOGIC WITH CRITICAL ERROR LOGGING ---
    try:
        # CRITICAL: Call the Twilio Verify API to send the OTP
        TWILIO_CLIENT.verify.v2.services(settings.TWILIO_SERVICE_SID) \
            .verifications \
            .create(to=phone_number, channel='sms')
        
    except TwilioRestException as e:
        # LOG THE REAL ERROR TO RENDER CONSOLE
        print("-" * 50)
        print(f"!!! CRITICAL TWILIO REST EXCEPTION !!!")
        print(f"!!! CODE: {e.code} | STATUS: {e.status} | MESSAGE: {e.msg} !!!")
        print("-" * 50)
        
        # Raise an HTTPException for the frontend to handle the failure cleanly
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP service failed. Check server logs for error code (TwilioRestException)."
        )
    except Exception as e:
        # Catch any other initialization/generic errors (e.g., config error)
        print("-" * 50)
        print(f"!!! GENERIC SERVER ERROR DURING TWILIO CALL: {e} !!!")
        print("-" * 50)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server encountered an internal error during OTP process."
        )

    # NOTE: The OTP code is still printed to logs for debugging (but not for production)
    print("-" * 50)
    print(f"DEBUG: Successfully triggered Twilio send for {phone_number}. DB hash saved.")
    print("-" * 50)

    # SUCCESS: Return 200 OK status to the frontend
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

    profile_data = {
        "user_id": db_user.id,
        "phone_number": db_user.phone_number
 # CRITICAL FIX: Include Name and Profession
        "name": db_user.name,
        "profession": db_user.profession,
