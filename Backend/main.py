import models, database
from auth_utils import generate_otp, hash_otp, verify_otp
from database import engine
from fastapi.staticfiles import StaticFiles 

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
# 2. TIER 1 PHONE AUTHENTICATION ENDPOINTS (Unchanged)
# --------------------------------------------------------------------------

@app.post("/api/v1/auth/otp/send")
def send_otp(request: PhoneRequest, db: GetDB):
    phone_number = request.phone_number
    otp_code = generate_otp(6)
    hashed_otp = hash_otp(otp_code)

    db_user = db.query(models.User).filter(models.User.phone_number == phone_number).first()
    
    if not db_user:
        db_user = models.User(phone_number=phone_number)
        db.add(db_user)
    
    db_user.otp_hash = hashed_otp
    db.commit()
    db.refresh(db_user)

    print("-" * 50)
    print(f"DEBUG: OTP for {phone_number} is: {otp_code}") 
    print(f"DEBUG: HASHED OTP stored: {hashed_otp[:10]}...") 
    print("-" * 50)

    return {"message": "OTP sent successfully (Check terminal for DEBUG code).", "status": "pending"}


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
        "phone_number": db_user.phone_number,
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

    update_fields = {k: v for k, v in data.dict().items() if v is not None}

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
        
    update_fields = {k: v for k, v in data.dict().items() if v is not None}

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
    
    # 3. Create a new Skill Credential entry
    new_credential = models.SkillCredential(
        skill_wallet_id=db_user.skill_wallet.id,
        skill_name=request.skill_name,
        proof_url=request.image_url,
        audio_description_url=request.audio_file_url,
        token_id=f"SW-TKN-{token_hash[:8]}", 
        language_code=request.language_code
    )
    
    # --- PHASE 6: AI SCORING/TRANSCRIPTION PLACEHOLDERS ---
    # In a real app, this would trigger an async AI service.
    # We simulate a random score and a placeholder transcription.
    new_credential.grade_score = random.randint(65, 95) # Generate a score
    new_credential.transcription = f"Transcription placeholder for {request.language_code} audio."
    # ---------------------------------------------------
    
    db.add(new_credential)

    # 4. Save changes
    db.commit()
    db.refresh(db_user)
    db.refresh(new_credential)

    return {
        "message": "Micro-Proof submitted successfully. Skill Wallet Token Minted!",
        "skill_token": new_credential.token_id,
        "skill_name": request.skill_name
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
