import models, database
from auth_utils import generate_otp, hash_otp, verify_otp
from database import engine
from fastapi.staticfiles import StaticFiles
from config import settings

from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import hashlib
import random
from datetime import datetime
from typing import Annotated, Optional
import os
import shutil
from math import floor
from fastapi import Body

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
import hashids

try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    import traceback
    print(f"ERROR creating database tables: {e}")
    traceback.print_exc()

app = FastAPI(
    title="Skill Wallet Backend API",
    description="The Digital Infrastructure for Verifiable Skills",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.isdir("uploaded_files"):
    os.makedirs("uploaded_files")
app.mount("/proofs", StaticFiles(directory="uploaded_files"), name="proofs")

GetDB = Annotated[Session, Depends(database.get_db)]

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
    image_url: str = Field(example="s3://proof/pottery_final.jpg")
    audio_file_url: str = Field(example="s3://audio/pottery_desc_hindi.mp3")
    language_code: str = Field(example="hi")

class SkillUpdate(BaseModel):
    skill_tag: str
    power_skill_tag: str

class CoreProfileUpdate(BaseModel):
    name: str
    profession: str

class IdentityUpdate(BaseModel):
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None

class ReviewRequest(BaseModel):
    reviewer_comment: Optional[str] = None

class GradeSubmission(BaseModel):
    grade_score: int = Field(ge=0, le=100, example=85)
    final_notes: Optional[str] = None

class WalletInitializeRequest(BaseModel):
    phone_number: str = Field(pattern=r"^\+?[0-9]{10,14}$", example="+919876543210")

class WalletInitializeResponse(BaseModel):
    user_id: int
    wallet_hash: str

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
        print(f"DEV MODE OTP for {phone_number}: {otp_code}")
        return {"message": "OTP sent (development mode). Check backend terminal.", "status": "pending"}

    try:
        local_twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        local_twilio_client.verify.v2.services(settings.TWILIO_SERVICE_SID).verifications.create(to=phone_number, channel='sms')
        return {"message": "OTP sent successfully via SMS.", "status": "pending"}
    except Exception:
        print(f"Twilio failed. DEV MODE OTP for {phone_number}: {otp_code}")
        return {"message": "OTP sent (development fallback). Check backend terminal.", "status": "pending"}

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

@app.get("/api/v1/user/profile/{user_id}")
def get_user_profile(user_id: int, db: GetDB):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    dob_str = db_user.date_of_birth.strftime("%Y-%m-%d") if db_user.date_of_birth else None
    def normalize_path(path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        prefix = "uploaded_files" + os.sep
        p = path
        if p.startswith(prefix):
            p = p[len(prefix):]
        return p.replace("\\", "/")

    profile_data = {
        "user_id": db_user.id,
        "phone_number": db_user.phone_number,
        "email": db_user.email,
        "date_of_birth": dob_str,
        "gender": db_user.gender,
        "name": db_user.name,
        "profession": db_user.profession,
        "profile_photo_file_path": normalize_path(getattr(db_user, 'profile_photo_file_path', None)),
        "skill_tag": db_user.skill_tag,
        "power_skill_tag": getattr(db_user, 'power_skill_tag', 'Unassigned'),
        "aadhaar_number": db_user.aadhaar_number,
        "aadhaar_file_path": normalize_path(db_user.aadhaar_file_path),
        "pan_card_number": db_user.pan_card_number,
        "pan_card_file_path": normalize_path(db_user.pan_card_file_path),
        "voter_id_number": db_user.voter_id_number,
        "voter_id_file_path": normalize_path(db_user.voter_id_file_path),
        "driving_license_number": db_user.driving_license_number,
        "driving_license_file_path": normalize_path(db_user.driving_license_file_path),
        "ration_card_number": db_user.ration_card_number,
        "ration_card_file_path": normalize_path(db_user.ration_card_file_path),
        "recommendation_file_path": normalize_path(getattr(db_user, 'recommendation_file_path', None)),
        "community_verifier_id": getattr(db_user, 'community_verifier_id', None),
        "previous_certificates_file_path": normalize_path(getattr(db_user, 'previous_certificates_file_path', None)),
        "past_jobs_proof_file_path": normalize_path(getattr(db_user, 'past_jobs_proof_file_path', None)),
        "tier3_cibil_score": db_user.tier3_cibil_score,
        "wallet_initialized": db_user.skill_wallet is not None,
        "wallet_hash": getattr(db_user.skill_wallet, 'wallet_hash', None) if db_user.skill_wallet else None
    }
    return profile_data

@app.get("/api/v1/user/proofs/{user_id}")
def get_user_proofs(user_id: int, db: GetDB, scope: Optional[str] = "latest"):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or db_user.skill_wallet is None:
        return []

    q = db.query(models.SkillCredential).filter(
        models.SkillCredential.skill_wallet_id == db_user.skill_wallet.id
    )
    creds = q.all()
    # Sort newest first by issued_date (fallback to id)
    creds.sort(key=lambda c: getattr(c, "issued_date", None) or datetime.min, reverse=True)

    if scope == "latest" and len(creds) > 0:
        creds = [creds[0]]
    elif scope == "session" and getattr(db_user, "last_login_at", None) is not None:
        last_login = db_user.last_login_at
        creds = [c for c in creds if getattr(c, "issued_date", None) and c.issued_date >= last_login]
    else:
        # scope == 'all' or unknown -> keep all
        pass

    def normalize_path(path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        prefix = "uploaded_files" + os.sep
        if path.startswith(prefix):
            return path[len(prefix):].replace("\\", "/")
        return path

    return [
        {
            "title": cred.skill_name,
            "skill": cred.skill_name,
            "visualProofUrl": normalize_path(cred.proof_url or None),
            "audioStoryUrl": normalize_path(cred.audio_description_url or None),
            "language_code": cred.language_code,
            "grade_score": getattr(cred, 'grade_score', 0),
            "transcription": getattr(cred, 'transcription', None),
            "verification_status": getattr(cred, 'verification_status', 'PENDING'),
            "is_verified": getattr(cred, 'is_verified', False),
            "credential_id": cred.id,
            "token_id": cred.token_id,
            "issued_date": getattr(cred, 'issued_date', None).strftime("%Y-%m-%d %H:%M:%S") if getattr(cred, 'issued_date', None) else None
        }
        for cred in creds
    ]

@app.post("/api/v1/identity/tier2/upload/{user_id}")
async def upload_tier2_document(
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
    file_location = os.path.join(user_folder, f"{file_type}_{safe_filename}")

    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        if not os.path.isdir(user_folder):
            raise HTTPException(status_code=500, detail="File system error. Could not create or write to the 'uploaded_files' directory.")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    column_name = f"{file_type}_file_path"
    if hasattr(db_user, column_name):
        setattr(db_user, column_name, file_location)
        db.commit()

    return {
        "message": f"File '{safe_filename}' uploaded and saved successfully.",
        "file_location": file_location,
        "user_id": user_id
    }

# ----------------------------------------------------------------------
# WORK SCORING (Skill Score)
# ----------------------------------------------------------------------
def _count_user_docs(u: models.User) -> int:
    fields = [
        u.aadhaar_file_path,
        u.pan_card_file_path,
        u.voter_id_file_path,
        u.driving_license_file_path,
        u.ration_card_file_path,
    ]
    return sum(1 for f in fields if f)

def _is_local_proof(path: Optional[str]) -> bool:
    if not path or path == "N/A":
        return False
    return str(path).startswith("uploaded_files") or "/proofs/" in str(path)

def _get_local_fs_path(rel_or_url: Optional[str]) -> Optional[str]:
    if not rel_or_url or rel_or_url == "N/A":
        return None
    p = str(rel_or_url)
    if p.startswith("uploaded_files"):
        return p
    if "/proofs/" in p:
        parts = p.split("/proofs/")
        tail = parts[-1]
        return os.path.join("uploaded_files", tail.replace("\\", "/"))
    # Already-normalized path (e.g., '1/file.jpg')
    if not p.startswith("http") and not p.startswith("s3://"):
        return os.path.join("uploaded_files", p.replace("\\", "/"))
    return None

def analyze_visual_proof(cred: models.SkillCredential) -> dict:
    visual_path = _get_local_fs_path(cred.proof_url)
    strengths = []
    weaknesses = []
    craftsmanship_score = 0
    media_type = None
    file_size_kb = 0

    if visual_path and os.path.exists(visual_path):
        craftsmanship_score += 4
        try:
            file_size_kb = max(1, os.path.getsize(visual_path) // 1024)
        except Exception:
            file_size_kb = 0
        _, ext = os.path.splitext(visual_path.lower())
        img_exts = {".jpg", ".jpeg", ".png", ".webp"}
        vid_exts = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
        if ext in img_exts:
            media_type = "image"
            craftsmanship_score += 2
        elif ext in vid_exts:
            media_type = "video"
            craftsmanship_score += 2
        else:
            weaknesses.append("Unknown media type; use common image/video formats.")
        if file_size_kb >= 50:
            craftsmanship_score += 2
            strengths.append("High-quality visual evidence (file size suggests detail).")
        else:
            weaknesses.append("Visual proof appears low-quality; upload a clearer image/video.")
        strengths.append("Real, locally uploaded media used for verification.")
    else:
        weaknesses.append("No local visual proof found; upload image/video to proceed.")

    craftsmanship_score = max(0, min(10, craftsmanship_score))
    return {
        "craftsmanship_score": craftsmanship_score,
        "media_type": media_type,
        "file_size_kb": file_size_kb,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }

def analyze_transcription(text: Optional[str]) -> dict:
    strengths = []
    weaknesses = []
    clarity_score = 0

    if text and text.strip():
        words = [w for w in text.strip().split() if w.isalpha()]
        word_count = len(words)
        clarity_score = min(10, max(1, word_count // 30))
        if word_count >= 120:
            strengths.append("Detailed explanation with clear steps.")
        else:
            weaknesses.append("Add more step-by-step detail about process and tools.")
        if any(k in text.lower() for k in ["tool", "material", "step", "process", "made", "built"]):
            clarity_score = min(10, clarity_score + 2)
            strengths.append("Mentions tools/materials and process.")
        else:
            weaknesses.append("Mention the tools, materials, and specific steps used.")
    else:
        weaknesses.append("No transcription available; record and transcribe your explanation.")

    clarity_score = max(0, min(10, clarity_score))
    return {
        "clarity_score": clarity_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }

def check_consistency(cred: models.SkillCredential, transcription: Optional[str]) -> dict:
    if not transcription:
        return {"is_consistent": False, "confidence": 0.3, "reason": "No transcription provided"}
    skill_term = (cred.skill_name or "").lower()
    tx = transcription.lower()
    is_consistent = True if skill_term and skill_term in tx else False
    reason = "Skill name not referenced in explanation" if not is_consistent else "Consistent"
    return {"is_consistent": is_consistent, "confidence": 0.7 if is_consistent else 0.4, "reason": reason}

@app.post("/api/v1/work/verify_media/{credential_id}")
def verify_media_authenticity(credential_id: int, db: GetDB):
    cred = db.query(models.SkillCredential).filter(models.SkillCredential.id == credential_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")
    if not _is_local_proof(cred.proof_url):
        raise HTTPException(status_code=422, detail="Authenticity check failed: visual proof must be an uploaded local file.")
    lp = _get_local_fs_path(cred.proof_url)
    if not lp or not os.path.exists(lp):
        raise HTTPException(status_code=422, detail="Authenticity check failed: file missing on server.")
    _, ext = os.path.splitext(lp.lower())
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".avi", ".mkv", ".webm"}:
        raise HTTPException(status_code=422, detail="Authenticity check failed: unsupported media type.")
    cred.verification_status = "AUTHENTICATED"
    db.commit()
    db.refresh(cred)
    return {"credential_id": cred.id, "verification_status": cred.verification_status, "media_type": ext}

@app.post("/api/v1/work/transcribe/{credential_id}")
def transcribe_audio_story(credential_id: int, db: GetDB):
    cred = db.query(models.SkillCredential).filter(models.SkillCredential.id == credential_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")
    if not cred.audio_description_url or cred.audio_description_url == "N/A":
        raise HTTPException(status_code=422, detail="No audio story provided to transcribe.")
    local_audio = _get_local_fs_path(cred.audio_description_url)
    transcription_text = None
    if local_audio and os.path.exists(local_audio):
        _, aext = os.path.splitext(local_audio.lower())
        if aext in {".txt", ".vtt"}:
            try:
                with open(local_audio, "r", encoding="utf-8", errors="ignore") as f:
                    transcription_text = f.read()
            except Exception:
                transcription_text = None
        else:
            transcription_text = f"[Auto-transcribed placeholder] Language={cred.language_code or 'unknown'}; Source={cred.audio_description_url}"
    else:
        transcription_text = f"[Auto-transcribed placeholder] Language={cred.language_code or 'unknown'}; Source={cred.audio_description_url}"
    cred.transcription = transcription_text
    cred.verification_status = "TRANSCRIBED"
    db.commit()
    db.refresh(cred)
    return {"credential_id": cred.id, "verification_status": cred.verification_status, "transcription": cred.transcription}

@app.post("/api/v1/work/score/{credential_id}")
def score_skill_credential(credential_id: int, db: GetDB, notes: Optional[str] = Body(None)):
    cred = db.query(models.SkillCredential).filter(models.SkillCredential.id == credential_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Skill Credential not found.")
    wallet = db.query(models.SkillWallet).filter(models.SkillWallet.id == cred.skill_wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found for credential.")
    user = db.query(models.User).filter(models.User.id == wallet.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found for credential.")

    # Authenticity gate: must pass verify_media step first
    if cred.verification_status not in ("AUTHENTICATED", "TRANSCRIBED"):
        raise HTTPException(status_code=412, detail="Authenticity not confirmed. Run /work/verify_media/{credential_id} first.")
    if not _is_local_proof(cred.proof_url):
        raise HTTPException(status_code=422, detail="Authenticity check failed.")

    breakdown = {}
    visual = analyze_visual_proof(cred)
    verbal = analyze_transcription(cred.transcription)
    consistency = check_consistency(cred, cred.transcription)

    breakdown["visual_craftsmanship"] = round(visual["craftsmanship_score"] * 10)
    breakdown["verbal_clarity"] = round(verbal["clarity_score"] * 10)
    breakdown["consistency_pass"] = 1 if consistency["is_consistent"] else 0
    breakdown["language_code"] = cred.language_code

    raw_score = (visual["craftsmanship_score"] * 0.6) + (verbal["clarity_score"] * 0.4)
    if not consistency["is_consistent"]:
        raw_score *= 0.7
    normalized_score = max(0, min(100, round(raw_score * 10)))
    cred.grade_score = normalized_score
    if cred.grade_score >= 60:
        cred.verification_status = "VERIFIED"
        cred.is_verified = True
    else:
        cred.verification_status = "REVIEW"
        cred.is_verified = False

    db.commit()
    db.refresh(cred)

    # Confidence based on verification completeness and optional identity docs (context only)
    doc_count = _count_user_docs(user)
    confidence = 0
    confidence += 50 if cred.verification_status in ("AUTHENTICATED", "TRANSCRIBED", "VERIFIED") else 0
    confidence += 20 if cred.audio_description_url and cred.audio_description_url != "N/A" else 0
    confidence += min(doc_count * 10, 30)
    confidence = min(confidence, 100)

    strengths = []
    improvements = []
    strengths.extend(visual["strengths"])
    strengths.extend(verbal["strengths"])
    improvements.extend(visual["weaknesses"])
    improvements.extend(verbal["weaknesses"])
    if not consistency["is_consistent"]:
        improvements.append("Ensure verbal explanation matches the visual evidence.")

    return {
        "credential_id": cred.id,
        "skill_name": cred.skill_name,
        "grade_score": cred.grade_score,
        "verification_status": cred.verification_status,
        "confidence": confidence,
        "breakdown": breakdown,
        "explanation": {
            "strengths": strengths,
            "improvements": improvements,
            "notes": notes or ""
        }
    }

@app.post("/api/v1/work/grade/{credential_id}")
def grade_alias(credential_id: int, db: GetDB, notes: Optional[str] = Body(None)):
    return score_skill_credential(credential_id, db, notes)

@app.get("/api/v1/user/score/{user_id}")
def get_user_skill_score(user_id: int, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not user.skill_wallet:
        return {"user_id": user_id, "tier3_cibil_score": 0, "verified_credentials": 0, "average_grade": 0}
    creds = db.query(models.SkillCredential).filter(models.SkillCredential.skill_wallet_id == user.skill_wallet.id).all()
    grades = [c.grade_score for c in creds if isinstance(c.grade_score, int)]
    avg = floor(sum(grades) / len(grades)) if grades else 0
    user.tier3_cibil_score = avg
    db.commit()
    return {"user_id": user_id, "tier3_cibil_score": avg, "verified_credentials": len([c for c in creds if c.is_verified]), "average_grade": avg}

@app.post("/api/v1/identity/tier2/{user_id}")
def submit_tier2_verification(
    user_id: int,
    data: Tier2Update,
    db: GetDB
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    for field, value in update_fields.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    return {
        "message": "Tier 2 identity documents updated successfully. Optionality maintained.",
        "status": "Submission Saved",
        "user_id": user_id
    }

@app.post("/api/v1/identity/tier3/{user_id}")
def submit_tier3_verification(
    user_id: int,
    data: Tier3Update,
    db: GetDB,
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    for field, value in update_fields.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    return {
        "message": "Tier 3 professional proofs submitted successfully. Optionality maintained.",
        "status": "Review Pending",
        "user_id": user_id
    }

@app.post("/api/v1/user/update_skill_tag/{user_id}")
def update_user_skills(user_id: int, request: SkillUpdate, db: GetDB):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    setattr(db_user, 'skill_tag', request.skill_tag)
    setattr(db_user, 'power_skill_tag', request.power_skill_tag)

    db.commit()
    db.refresh(db_user)

    return {"message": "Skill tags updated successfully.",
            "primary_domain": db_user.skill_tag,
            "power_skill": db_user.power_skill_tag}

@app.post("/api/v1/user/update_core_profile/{user_id}")
def update_core_profile(user_id: int, request: CoreProfileUpdate, db: GetDB):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail=f"User {user_id} not found. Database may have been reset. Please log in again."
        )

    db_user.name = request.name
    db_user.profession = request.profession
    db.commit()
    db.refresh(db_user)

    return {"message": "Core profile updated successfully.",
            "name": db_user.name,
            "profession": db_user.profession}

@app.post("/api/v1/user/update_identity_info/{user_id}")
def update_user_identity_info(user_id: int, request: IdentityUpdate, db: GetDB):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = request.model_dump(exclude_none=True)

    if "date_of_birth" in update_fields:
        try:
            dob_date = datetime.strptime(update_fields["date_of_birth"], "%Y-%m-%d").date()
            update_fields["date_of_birth"] = dob_date
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD."
            )

    for field, value in update_fields.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)

    return {"message": "User identity information updated successfully.",
            "user_id": user_id,
            "email": db_user.email,
            "date_of_birth": db_user.date_of_birth.strftime("%Y-%m-%d") if db_user.date_of_birth else None,
            "gender": db_user.gender}

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

    new_credential = models.SkillCredential(
        skill_wallet_id=db_user.skill_wallet.id,
        skill_name=request.skill_name,
        proof_url=request.image_url,
        audio_description_url=request.audio_file_url,
        token_id=f"SW-TKN-{token_hash[:8]}",
        language_code=request.language_code,
        verification_status="PENDING",
        is_verified=False,
        grade_score=0,
        transcription=None
    )

    db.add(new_credential)
    db.commit()
    db.refresh(db_user)
    db.refresh(new_credential)

    return {
        "message": "Micro-Proof submitted successfully. Skill Wallet Token Minted!",
        "skill_token": new_credential.token_id,
        "skill_name": request.skill_name,
        "credential_id": new_credential.id,
        "verification_status": "PENDING",
        "note": "Credential entered verification cycle."
    }

@app.post("/api/v1/wallet/initialize", response_model=WalletInitializeResponse)
def initialize_wallet(
    request: WalletInitializeRequest,
    db: GetDB
):
    db_user = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()

    if not db_user:
        new_user = models.User(
            phone_number=request.phone_number,
            verification_status="PENDING",
            tier_level=0,
            kyc_data={},
            last_login_at=datetime.utcnow()
        )
        db.add(new_user)
        db.flush()
        db_user = new_user

    db_wallet = db_user.skill_wallet
    if not db_wallet:
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
    else:
        db_user.last_login_at = datetime.utcnow()
        db.commit()

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

@app.get("/")
def read_root():
    return {"message": "Skill Wallet API is running!", "status": "Ready"}

def require_owner(user_id: int = Depends(get_current_user_id)) -> int:
    if user_id != settings.OWNER_USER_ID:
        raise HTTPException(status_code=403, detail="Owner access required.")
    return user_id

@app.get("/api/v1/admin/users")
def list_all_users(db: GetDB, _: int = Depends(require_owner)):
    users = db.query(models.User).all()
    result = []
    for u in users:
        wallet = getattr(u, "skill_wallet", None)
        creds = []
        if wallet:
            creds = db.query(models.SkillCredential).filter(models.SkillCredential.skill_wallet_id == wallet.id).all()
        last_date = None
        if creds:
            last_date = max([c.issued_date for c in creds if getattr(c, "issued_date", None)], default=None)
        result.append({
            "user_id": u.id,
            "name": u.name,
            "profession": u.profession,
            "phone_number": u.phone_number,
            "email": u.email,
            "wallet_initialized": wallet is not None,
            "docs_submitted": _count_user_docs(u),
            "verified_credentials": len([c for c in creds if getattr(c, "is_verified", False)]),
            "total_credentials": len(creds),
            "last_submission_date": last_date.strftime("%Y-%m-%d %H:%M:%S") if last_date else None,
            "last_login_at": getattr(u, "last_login_at", None).strftime("%Y-%m-%d %H:%M:%S") if getattr(u, "last_login_at", None) else None
        })
    return result

@app.get("/api/v1/admin/users/{user_id}")
def admin_user_details(user_id: int, db: GetDB, _: int = Depends(require_owner)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    def normalize_path(path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        prefix = "uploaded_files" + os.sep
        p = path
        if p.startswith(prefix):
            p = p[len(prefix):]
        return p.replace("\\", "/")
    profile = {
        "user_id": u.id,
        "name": u.name,
        "profession": u.profession,
        "phone_number": u.phone_number,
        "email": u.email,
        "date_of_birth": u.date_of_birth.strftime("%Y-%m-%d") if u.date_of_birth else None,
        "gender": u.gender,
        "skill_tag": u.skill_tag,
        "power_skill_tag": getattr(u, 'power_skill_tag', None),
        "profile_photo_file_path": normalize_path(getattr(u, 'profile_photo_file_path', None)),
        "aadhaar_file_path": normalize_path(getattr(u, 'aadhaar_file_path', None)),
        "pan_card_file_path": normalize_path(getattr(u, 'pan_card_file_path', None)),
        "voter_id_file_path": normalize_path(getattr(u, 'voter_id_file_path', None)),
        "driving_license_file_path": normalize_path(getattr(u, 'driving_license_file_path', None)),
        "ration_card_file_path": normalize_path(getattr(u, 'ration_card_file_path', None)),
        "recommendation_file_path": normalize_path(getattr(u, 'recommendation_file_path', None)),
        "previous_certificates_file_path": normalize_path(getattr(u, 'previous_certificates_file_path', None)),
        "past_jobs_proof_file_path": normalize_path(getattr(u, 'past_jobs_proof_file_path', None)),
        "wallet_initialized": u.skill_wallet is not None,
        "wallet_hash": getattr(u.skill_wallet, 'wallet_hash', None) if u.skill_wallet else None,
        "last_login_at": getattr(u, "last_login_at", None).strftime("%Y-%m-%d %H:%M:%S") if getattr(u, "last_login_at", None) else None
    }
    proofs = []
    if u.skill_wallet:
        creds = db.query(models.SkillCredential).filter(models.SkillCredential.skill_wallet_id == u.skill_wallet.id).order_by(models.SkillCredential.issued_date.desc()).all()
        for cred in creds:
            proofs.append({
                "title": cred.skill_name,
                "skill": cred.skill_name,
                "visualProofUrl": normalize_path(cred.proof_url or None),
                "audioStoryUrl": normalize_path(cred.audio_description_url or None),
                "language_code": cred.language_code,
                "grade_score": getattr(cred, 'grade_score', 0),
                "transcription": getattr(cred, 'transcription', None),
                "verification_status": getattr(cred, 'verification_status', 'PENDING'),
                "is_verified": getattr(cred, 'is_verified', False),
                "credential_id": cred.id,
                "token_id": cred.token_id,
                "issued_date": getattr(cred, 'issued_date', None).strftime("%Y-%m-%d %H:%M:%S") if getattr(cred, 'issued_date', None) else None
            })
    return {"profile": profile, "proofs": proofs}
