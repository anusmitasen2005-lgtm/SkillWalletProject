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
# Optional Twilio imports (only needed if Twilio is configured)
try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("⚠️  Twilio package not installed. Running in development mode (OTP printed to console).")
import hashids # CRITICAL: Import hashids for wallet generation

# --- Database initialization ---
30→try:
31→    print("=" * 60)
32→    print("Initializing database...")
33→    # Create tables if they do not exist
34→    models.Base.metadata.create_all(bind=engine)
35→    print("✅ Database tables ensured!")
36→    print("=" * 60)
37→except Exception as e:
38→    print("=" * 60)
39→    print(f"❌ ERROR creating database tables: {e}")
40→    import traceback
41→    traceback.print_exc()
42→    print("=" * 60)
43→    # Don't exit - let the app start and show the error in API calls
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

# --- NEW: Schemas for Wallet Initialization (CRITICAL FIX) ---
class WalletInitializeRequest(BaseModel):
    phone_number: str = Field(pattern=r"^\+?[0-9]{10,14}$", example="+919876543210")

class WalletInitializeResponse(BaseModel):
    user_id: int
    wallet_hash: str


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
    
    # --- DEVELOPMENT MODE: Check if Twilio is configured and available ---
    twilio_configured = (
        TWILIO_AVAILABLE and
        settings.TWILIO_ACCOUNT_SID and 
        settings.TWILIO_AUTH_TOKEN and 
        settings.TWILIO_SERVICE_SID and
        settings.TWILIO_ACCOUNT_SID != "" and
        settings.TWILIO_AUTH_TOKEN != "" and
        settings.TWILIO_SERVICE_SID != ""
    )
    
    if not twilio_configured:
        # DEVELOPMENT MODE: Print OTP to console instead of sending via Twilio
        print("=" * 60)
        print("🔧 DEVELOPMENT MODE: Twilio not configured")
        print(f"📱 Phone Number: {phone_number}")
        print(f"🔑 OTP Code: {otp_code}")
        print("=" * 60)
        print("⚠️  Use this OTP code to verify. In production, configure Twilio credentials.")
        print("=" * 60)
        return {"message": "OTP sent successfully (Development Mode). Check backend terminal for code.", "status": "pending"}
    
    # --- PRODUCTION MODE: LIVE TWILIO SENDING LOGIC ---
    try:
        # CRITICAL: Initialize client here to avoid startup crash
        local_twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # CRITICAL FIX: Use the original TWILIO_SERVICE_SID variable name
        local_twilio_client.verify.v2.services(settings.TWILIO_SERVICE_SID) \
            .verifications \
            .create(to=phone_number, channel='sms')
        
        # SUCCESS: Return 200 OK status to the frontend
        print(f"✅ Successfully sent OTP via Twilio to {phone_number}.")
        return {"message": "OTP sent successfully via SMS.", "status": "pending"}
        
    except Exception as e:
        # Check if it's a Twilio exception
        if TWILIO_AVAILABLE and hasattr(e, 'code') and hasattr(e, 'status') and hasattr(e, 'msg'):
            # LOG THE REAL TWILIO ERROR
            print("-" * 50)
            print(f"!!! CRITICAL TWILIO REST EXCEPTION !!!")
            print(f"!!! CODE: {e.code} | STATUS: {e.status} | MESSAGE: {e.msg} !!!")
            print("-" * 50)
        else:
            # Catch any other failure (e.g., failed client initialization due to bad config)
            print("-" * 50)
            print(f"!!! GENERIC SERVER ERROR (Twilio Client Init/Call Failed): {type(e).__name__}: {e} !!!")
            print("-" * 50)
        
        # Fallback to development mode if Twilio fails
        print("=" * 60)
        print("⚠️  Twilio failed, falling back to Development Mode")
        print(f"📱 Phone Number: {phone_number}")
        print(f"🔑 OTP Code: {otp_code}")
        print("=" * 60)
        return {"message": "OTP sent successfully (Development Mode - Twilio failed). Check backend terminal for code.", "status": "pending"}


@app.post("/api/v1/auth/otp/verify", response_model=TokenResponse)
def verify_otp_endpoint(request: OTPVerification, db: GetDB):
    db_user = db.query(models.User).filter(models.User.phone_number == request.phone_number).first()
    
    if not db_user:
        # User should exist if OTP was sent, but handle defensively
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    is_valid = verify_otp(request.otp_code, db_user.otp_hash)

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP.")

    # --- CRITICAL FIX: DO NOT CREATE WALLET HERE ---
    # The wallet is created in /api/v1/wallet/initialize for a clean flow.
    # The OTP verification simply provides the access token.

    access_token = f"DEBUG_ACCESS_TOKEN_for_{db_user.id}"
    db_user.otp_hash = None
    db.commit()
    # db.refresh(db_user) # No need to refresh if we only commit OTP_hash=None

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
        "tier3_cibil_score": db_user.tier3_cibil_score,
        "wallet_initialized": db_user.skill_wallet is not None,
        # Include wallet_hash if wallet exists
        "wallet_hash": getattr(db_user.skill_wallet, 'wallet_hash', None) if db_user.skill_wallet else None
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
    
    # Format the data for the frontend (strictly real DB data; normalize local file paths)
    proof_list = []
    for cred in credentials:
        proof_url = cred.proof_url or None
        audio_url = cred.audio_description_url or None
        # Normalize local file paths saved under 'uploaded_files' to work with '/proofs/'
        def normalize_path(path: Optional[str]) -> Optional[str]:
            if not path:
                return None
            prefix = "uploaded_files" + os.sep
            if path.startswith(prefix):
                return path[len(prefix):].replace("\\", "/")
            return path
        proof_list.append({
            "title": cred.skill_name,
            "skill": cred.skill_name,
            "visualProofUrl": normalize_path(proof_url),
            "audioStoryUrl": normalize_path(audio_url),
            "language_code": cred.language_code,
            "grade_score": getattr(cred, 'grade_score', 0),
            "transcription": getattr(cred, 'transcription', None),
            "verification_status": getattr(cred, 'verification_status', 'PENDING'),
            "is_verified": getattr(cred, 'is_verified', False),
            "credential_id": cred.id,
            "token_id": cred.token_id
        })
    
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

    # 3. Update the database with the file's path (based on file_type)
    # The file_type is used to construct the column name: {file_type}_file_path
    column_name = f"{file_type}_file_path"
    
    db.query(models.User).filter(models.User.id == user_id).update({column_name: file_location})
    db.commit()

    return {
        "message": f"File '{safe_filename}' uploaded and saved successfully.",
        "file_location": file_location,
        "user_id": user_id
    }


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
    try:
        print(f"📝 Updating profile for user_id: {user_id}")
        print(f"   Name: {request.name}, Profession: {request.profession}")
        
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not db_user:
            print(f"❌ User {user_id} not found in database")
            print(f"   Available users in database:")
            all_users = db.query(models.User).all()
            for u in all_users:
                print(f"      User ID: {u.id}, Phone: {u.phone_number}")
            raise HTTPException(
                status_code=404, 
                detail=f"User {user_id} not found. Database may have been reset. Please log in again."
            )

        # Only update the fields provided in the request body
        db_user.name = request.name
        db_user.profession = request.profession
        
        db.commit()
        db.refresh(db_user)
        
        print(f"✅ Profile updated successfully for user {user_id}")

        return {"message": "Core profile updated successfully.", 
                "name": db_user.name, 
                "profession": db_user.profession}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR updating profile: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )
# --------------------------------------------------------------------------

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
    """
    Processes work submission proof and simulates minting the Skill Wallet Token.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # --- SIMULATE TOKEN MINTING LOGIC ---
    
    # 1. Generate a mock token hash
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_string = f"{user_id}:{request.skill_name}:{timestamp}"
    token_hash = hashlib.sha256(unique_string.encode()).hexdigest()

    # 2. Update the user's wallet with the new token (if not already initialized)
    if db_user.skill_wallet is None:
        db_user.skill_wallet = models.SkillWallet(
            user_id=user_id, 
            wallet_hash=f"WALLET-ID-{user_id}-{random.randint(1000, 9999)}"
        )
        db.add(db_user.skill_wallet)
        db.flush() 

    db_user.skill_wallet.last_minted_skill = request.skill_name
    db_user.skill_wallet.last_mint_date = datetime.now()
    
    # 3. Create a new Skill Credential entry - INSTANT TOKEN MINTING
    new_credential = models.SkillCredential(
        skill_wallet_id=db_user.skill_wallet.id,
        skill_name=request.skill_name,
        proof_url=request.image_url,
        audio_description_url=request.audio_file_url,
        token_id=f"SW-TKN-{token_hash[:8]}", 
        language_code=request.language_code,
        verification_status="PENDING",  # Enter verification cycle
        is_verified=False,  # Not verified yet
        grade_score=0,  # Will be assigned during grading
        transcription=None  # Will be populated during AI transcription
    )
    
    db.add(new_credential)

    # 4. Save changes
    db.commit()
    db.refresh(db_user)
    db.refresh(new_credential)

    return {
        "message": "Micro-Proof submitted successfully. Skill Wallet Token Minted!",
        "skill_token": new_credential.token_id,
        "skill_name": request.skill_name,
        "credential_id": new_credential.id,
        "verification_status": "PENDING",
        "note": "Credential entered verification cycle. AI transcription and grading will be processed."
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
    Starts the verification cycle for a SkillCredential.
    This automatically triggers AI transcription, then grading.
    """
    # 1. Retrieve the credential
    db_credential = db.query(models.SkillCredential).filter(
        models.SkillCredential.id == credential_id
    ).first()

    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")

    # 2. Start verification cycle: Set status to TRANSCRIBING
    db_credential.verification_status = "TRANSCRIBING"
    db_credential.is_verified = False
    
    db.commit()
    db.refresh(db_credential)

    # 3. In a real system, this would trigger async AI transcription
    # For now, we'll process it immediately via the transcription endpoint
    # The frontend should call /work/transcribe/{credential_id} next

    return {
        "message": "Verification cycle started. Processing AI transcription...",
        "credential_id": db_credential.id,
        "skill_name": db_credential.skill_name,
        "verification_status": "TRANSCRIBING",
        "next_step": "Call /work/transcribe/{credential_id} to process audio transcription"
    }

# --------------------------------------------------------------------------
# 4.2. NEW ENDPOINT: SUBMIT SKILL CREDENTIAL GRADE (TASK 914)
# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# 4.4. EXTERNAL GRADING SERVICE ENDPOINT (Verification Cycle Step 2)
# --------------------------------------------------------------------------
@app.post("/api/v1/work/grade/{credential_id}")
def grade_credential(
    credential_id: int,
    db: GetDB
):
    """
    External grading service that assigns a grade score (0-100) to a SkillCredential.
    This is Step 2 of the verification cycle, after transcription.
    In production, this would be called by an external AI/ML grading service.
    """
    db_credential = db.query(models.SkillCredential).filter(
        models.SkillCredential.id == credential_id
    ).first()

    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")

    if db_credential.verification_status != "GRADING":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot grade. Current status: {db_credential.verification_status}. Expected: GRADING"
        )

    if not db_credential.transcription:
        raise HTTPException(
            status_code=400,
            detail="Cannot grade. Transcription is required. Please complete transcription first."
        )

    # --- EXTERNAL GRADING SERVICE LOGIC ---
    # In a real system, this would call an external AI/ML service that:
    # 1. Analyzes the visual proof (image/video)
    # 2. Reviews the transcription
    # 3. Evaluates skill quality, technique, outcome
    # 4. Assigns a score 0-100
    
    # Simulated grading algorithm (in production, this would be from actual AI service)
    # For now, we generate a score based on some heuristics
    import random
    base_score = random.randint(70, 95)  # Base score range
    
    # Adjust score based on whether transcription exists
    if db_credential.transcription and len(db_credential.transcription) > 50:
        base_score += random.randint(0, 5)  # Bonus for good transcription
    
    final_score = min(100, base_score)  # Cap at 100

    # Update credential with grade
    db_credential.grade_score = final_score
    db_credential.verification_status = "VERIFIED"
    db_credential.is_verified = True  # Credential is now officially verified and permanent
    
    db.commit()
    db.refresh(db_credential)

    return {
        "message": "Credential graded and verified successfully. Skill is now permanent in your digital wallet.",
        "credential_id": db_credential.id,
        "skill_name": db_credential.skill_name,
        "grade_score": db_credential.grade_score,
        "verification_status": "VERIFIED",
        "is_verified": True,
        "note": "This skill credential is now permanently recorded and verifiable in your Skill Wallet."
    }

# --------------------------------------------------------------------------
# 4.5. LEGACY ENDPOINT: Manual Grade Submission (for admin/reviewer use)
# --------------------------------------------------------------------------
@app.post("/api/v1/work/submit_grade/{credential_id}")
def submit_skill_grade(
    credential_id: int, 
    grade_data: GradeSubmission, 
    db: GetDB
):
    """
    Manual grade submission endpoint (for admin/reviewer override).
    This allows manual assignment of grades if needed.
    """
    db_credential = db.query(models.SkillCredential).filter(
        models.SkillCredential.id == credential_id
    ).first()

    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")

    # Apply the manual grade and mark as verified
    db_credential.grade_score = grade_data.grade_score
    db_credential.verification_status = "VERIFIED"
    db_credential.is_verified = True
    
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
# 5. WALLET ENDPOINTS (FIXED INITIALIZE LOGIC)
# --------------------------------------------------------------------------

@app.post("/api/v1/wallet/initialize", response_model=WalletInitializeResponse)
def initialize_wallet(
    request: WalletInitializeRequest, 
    db: GetDB
):
    """
    Initializes a new Skill Wallet for a new user, or retrieves data for an existing one.
    This is the first endpoint called post-OTP verification.
    """
    print(f"🔄 Attempting to initialize wallet for: {request.phone_number}")
    
    # 1. Check if User Already Exists
    db_user = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()

    # 2. User Does NOT Exist - Create New User (Defensive, main creation happens in send_otp)
    if not db_user:
        print(f"   User not found. Creating new user...")
        # CRITICAL: Replicating User creation logic from send_otp for robustness
        new_user = models.User(
            phone_number=request.phone_number,
            verification_status="PENDING",
            tier_level=0,
            kyc_data={},
            last_login_at=datetime.utcnow()
        )
        db.add(new_user)
        db.flush() # Flush to get the new_user.id before committing
        db_user = new_user # Use db_user variable for consistency

    # 3. Check/Create New Skill Wallet
    db_wallet = db_user.skill_wallet
    
    if not db_wallet:
        print(f"   Wallet not found for User {db_user.id}. Creating new wallet...")
        # Generate a unique hash for the wallet
        wallet_hash = hashids.Hashids(
            salt=settings.SECRET_KEY, 
            min_length=16
        ).encode(db_user.id, int(datetime.utcnow().timestamp()))

        new_wallet = models.SkillWallet(
            user_id=db_user.id,
            wallet_hash=wallet_hash,
            last_minted_skill=None,
            last_mint_date=None
        )
        db.add(new_wallet)
        db.commit()
        db.refresh(new_wallet)
        db_wallet = new_wallet
        print(f"   ✅ Wallet created: {wallet_hash}")
    else:
        # Update last login for existing user
        db_user.last_login_at = datetime.utcnow()
        db.commit()
        print(f"   ✅ Existing user/wallet found: {db_wallet.wallet_hash}")


    # 4. Return Success
    return {
        "user_id": db_user.id,
        "wallet_hash": db_wallet.wallet_hash
    }


@app.get("/api/v1/wallet/data/{user_id}")
def get_wallet_data(user_id: int):
    return {"message": f"Retrieving wallet data for user {user_id} - Placeholder"}

@app.post("/api/v1/wallet/issue_skill")
def issue_skill(request: SkillIssueRequest):
    return {"message": f"Skill '{request.skill_name}' issued to wallet '{request.wallet_hash}' - Placeholder"}

# --------------------------------------------------------------------------
# PLACEHOLDER ENDPOINTS (Continued)
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# 4.3. AI TRANSCRIPTION ENDPOINT (Verification Cycle Step 1)
# --------------------------------------------------------------------------
@app.post("/api/v1/work/transcribe/{credential_id}")
def transcribe_credential_audio(credential_id: int, db: GetDB):
    """
    Processes AI transcription of the audio description for a SkillCredential.
    This is Step 1 of the verification cycle.
    """
    db_credential = db.query(models.SkillCredential).filter(
        models.SkillCredential.id == credential_id
    ).first()

    if not db_credential:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")

    if db_credential.verification_status != "TRANSCRIBING":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot transcribe. Current status: {db_credential.verification_status}. Expected: TRANSCRIBING"
        )

    # --- AI TRANSCRIPTION LOGIC ---
    # In a real system, this would call an external AI service (e.g., OpenAI Whisper, Google Speech-to-Text)
    # For now, we simulate the transcription process
    
    # Simulate AI transcription based on language code
    language_names = {
        "hi": "Hindi",
        "en": "English",
        "ta": "Tamil",
        "te": "Telugu",
        "kn": "Kannada",
        "ml": "Malayalam"
    }
    lang_name = language_names.get(db_credential.language_code, db_credential.language_code)
    
    # Simulated transcription (in production, this would be from actual AI service)
    simulated_transcription = f"[AI Transcription in {lang_name}] This is a simulated transcription of the audio description for the skill '{db_credential.skill_name}'. The audio describes the work performed, techniques used, and outcomes achieved. In production, this would be generated by an AI transcription service processing the audio file at: {db_credential.audio_description_url}"

    # Update credential with transcription
    db_credential.transcription = simulated_transcription
    db_credential.verification_status = "GRADING"  # Move to next step: Grading
    
    db.commit()
    db.refresh(db_credential)

    return {
        "message": "AI transcription completed successfully.",
        "credential_id": db_credential.id,
        "skill_name": db_credential.skill_name,
        "transcription": db_credential.transcription,
        "verification_status": "GRADING",
        "next_step": "Call /work/grade/{credential_id} to assign grade score"
    }

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

    except Exception as e:
        # Check if it's a Twilio REST exception
        if TWILIO_AVAILABLE and hasattr(e, 'code') and hasattr(e, 'status') and hasattr(e, 'msg'):
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
