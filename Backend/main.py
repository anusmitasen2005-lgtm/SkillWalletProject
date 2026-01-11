import models, database
from auth_utils import generate_otp, hash_otp, verify_otp
from database import engine, SessionLocal
from fastapi.staticfiles import StaticFiles 
from config import settings
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request, Path, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uvicorn
import hashlib
import random
from datetime import datetime, date, timedelta
from typing import Annotated, Optional, List, Dict, Any
import os 
import shutil 
import json
import hashids

# --- AI IMPORTS ---
from ai_utils import evaluate_skill_with_google, transcribe_audio
from search_utils import search_opportunities

# --- DB INIT ---
try:
    print("=" * 60)
    print("🔄 Checking Database Schema...")
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database ready!")
    print("=" * 60)
except Exception as e:
    print(f"❌ DB Error: {e}")

app = FastAPI(
    title="Skill Wallet Backend API",
    version="1.0.0"
)

# --- STATIC FILE MOUNTING ---
os.makedirs("uploads", exist_ok=True)
# 1. Standard mount
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# 2. Frontend-Specific mount (Fixes 404s)
app.mount("/proofs/uploads", StaticFiles(directory="uploads"), name="proofs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

GetDB = Annotated[Session, Depends(get_db)]

# --- SCHEMAS ---

class OtpRequest(BaseModel):
    phone_number: str

class OtpVerify(BaseModel):
    phone_number: str
    otp_code: str

class CoreProfileUpdate(BaseModel):
    name: str
    profession: str
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    local_area: str
    profile_photo_file_path: Optional[str] = None

class WorkSubmissionRequest(BaseModel):
    wallet_hash: str
    skill_name: str
    image_url: str
    audio_file_url: str
    language_code: str
    description: Optional[str] = None

class GradeSubmission(BaseModel):
    score: int = Field(ge=300, le=900)
    recommendations: Optional[List[Dict[str, Any]]] = None

class ReviewRequest(BaseModel):
    reviewer_comment: Optional[str] = None

@app.get("/api/v1/skillbank/opportunities/{user_id}")
def get_opportunities(user_id: int, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    profession = user.profession or "General"
    state = user.state or "India"
    district = user.district or ""
    
    return search_opportunities(db, profession, state, district)

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Skill Wallet API Online", "status": "Ready"}

@app.post("/api/v1/auth/otp/send")
def send_otp(request: OtpRequest, db: GetDB):
    phone = request.phone_number
    user = db.query(models.User).filter(models.User.phone_number == phone).first()
    if not user:
        user = models.User(phone_number=phone)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    otp = generate_otp()
    user.otp_hash = hash_otp(otp)
    db.commit()
    print(f"🔑 DEBUG OTP for {phone}: {otp}")
    return {"message": "OTP sent", "debug_otp": otp}

@app.post("/api/v1/auth/otp/verify")
def verify_user_otp(request: OtpVerify, db: GetDB):
    user = db.query(models.User).filter(models.User.phone_number == request.phone_number).first()
    if not user or not verify_otp(request.otp_code, user.otp_hash):
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if not user.skill_wallet:
        w_hash = hashids.Hashids(salt=settings.SECRET_KEY, min_length=16).encode(user.id, int(datetime.utcnow().timestamp()))
        wallet = models.SkillWallet(user_id=user.id, wallet_hash=w_hash)
        db.add(wallet)
        db.commit()

    return {"access_token": f"DEBUG_ACCESS_TOKEN_for_{user.id}", "token_type": "bearer", "user_id": user.id}

@app.get("/api/v1/user/profile/{user_id}")
def get_user_profile(user_id: int, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has uploaded any teaching content
    has_uploaded = db.query(models.SkillLesson).filter(models.SkillLesson.teacher_id == user.id).first() is not None

    # Return profile + wallet hash
    response = {
        "id": user.id,
        "name": user.name,
        "profession": user.profession,
        "phone_number": user.phone_number,
        "age": user.age,
        "state": user.state,
        "district": user.district,
        "local_area": user.local_area,
        "wallet_hash": user.skill_wallet.wallet_hash if user.skill_wallet else None,
        "profile_photo": user.profile_photo_file_path,
        "aadhaar_file_path": user.aadhaar_file_path,
        "pan_card_file_path": user.pan_card_file_path,
        "training_letter_file_path": user.training_letter_file_path,
        "apprenticeship_proof_file_path": user.apprenticeship_proof_file_path,
        "local_authority_proof_file_path": user.local_authority_proof_file_path,
        "has_uploaded": has_uploaded
    }
    return response

@app.post("/api/v1/user/update_core_profile/{user_id}")
def update_core_profile(user_id: int, request: CoreProfileUpdate, db: GetDB):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user: raise HTTPException(status_code=404, detail="User not found")

    db_user.name = request.name
    db_user.profession = request.profession
    db_user.age = request.age
    db_user.state = request.state
    db_user.district = request.district
    db_user.local_area = request.local_area
    if request.date_of_birth:
        try: db_user.date_of_birth = datetime.strptime(request.date_of_birth, "%Y-%m-%d").date()
        except: pass
    
    db.commit()
    return {"message": "Profile updated"}

@app.post("/api/v1/identity/tier2/upload/{user_id}")
async def upload_tier2_doc(user_id: int, db: GetDB, file: UploadFile = File(...), file_type: str = "document"):
    upload_dir = f"uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = file.filename.replace(" ", "_")
    file_path = f"{upload_dir}/{file_type}_{safe_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        field_map = {
            "profile_photo": "profile_photo_file_path",
            "aadhaar": "aadhaar_file_path",
            "pan_card": "pan_card_file_path",
            "training_letter": "training_letter_file_path",
            "apprenticeship_proof": "apprenticeship_proof_file_path",
            "local_authority_proof": "local_authority_proof_file_path",
            "daily_task_photo": "daily_task_photo_file_path",
            "work_video": "work_video_file_path",
            "community_recording": "community_recording_file_path"
        }
        if file_type in field_map:
            setattr(db_user, field_map[file_type], file_path)
            db.commit()
            
            # Auto-transcribe if it's a community recording or audio
            if file_type == "community_recording" or file.content_type.startswith("audio/") or file.filename.endswith((".webm", ".mp3", ".wav", ".m4a")):
                try:
                    print(f"Auto-transcribing {file_path}...")
                    transcript = transcribe_audio(file_path)
                    
                    # Save transcript to .txt file
                    txt_path = os.path.splitext(file_path)[0] + ".txt"
                    with open(txt_path, "w", encoding="utf-8") as f:
                        f.write(transcript)
                    print(f"Transcription saved to {txt_path}")
                except Exception as e:
                    print(f"Auto-transcription failed: {e}")

    return {"filename": file.filename, "file_path": file_path}

@app.post("/api/v1/work/submit/{user_id}")
def submit_work(user_id: int, request: WorkSubmissionRequest, db: GetDB):
    wallet = db.query(models.SkillWallet).filter(models.SkillWallet.user_id == user_id).first()
    if not wallet: raise HTTPException(status_code=404, detail="Wallet not initialized")

    cred = models.SkillCredential(
        skill_wallet_id=wallet.id,
        skill_name=request.skill_name,
        token_id=f"TOKEN_{random.randint(1000,9999)}",
        proof_url=request.image_url,
        audio_description_url=request.audio_file_url,
        language_code=request.language_code,
        transcription=request.description,
        verification_status="PENDING"
    )
    db.add(cred)
    db.commit()
    db.refresh(cred)

    user = db.query(models.User).filter(models.User.id == user_id).first()
    context_data = {
        "local_area": user.local_area,
        "district": user.district,
        "state": user.state,
        "age": user.age
    }
    
    try:
        # Trigger Forensic Check + Grading
        eval_result = evaluate_skill_with_google(
            work_proof_path=request.image_url,
            audio_path=request.audio_file_url,
            profession=user.profession or "General Worker",
            context_data=context_data,
            user_description=request.description or ""
        )
        
        cred.skill_trust_score = eval_result.get("score", 300)
        cred.transcription = eval_result.get("transcription", "No audio summary")
        cred.evaluation_feedback = json.dumps(eval_result.get("feedback", {}))
        
        if cred.skill_trust_score >= 500:
            cred.is_verified = True
            cred.verification_status = "VERIFIED"
        
        db.commit()
        return {"message": "Evaluated", "score": cred.skill_trust_score, "feedback": eval_result.get("feedback")}
        
    except Exception as e:
        print(f"AI Failure: {e}")
        return {"message": "Submitted but AI failed. Saved as pending.", "credential_id": cred.id}

@app.post("/api/v1/work/submit_grade/{credential_id}")
def submit_grade(credential_id: int, grade: GradeSubmission, db: GetDB):
    cred = db.query(models.SkillCredential).filter(models.SkillCredential.id == credential_id).first()
    if not cred: raise HTTPException(status_code=404, detail="Credential not found")
        
    cred.skill_trust_score = grade.score
    cred.is_verified = True
    if grade.recommendations:
        cred.evaluation_feedback = json.dumps(grade.recommendations)
    db.commit()
    return {"message": "Grade manually updated"}

@app.get("/api/v1/user/proofs/{user_id}")
def get_user_proofs(user_id: int, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    proofs = []
    if user.daily_task_photo_file_path:
        proofs.append({
            "title": "Daily Task",
            "skill": "Work Discipline",
            "grade_score": 85, 
            "transcription": "Photo evidence of daily work.",
            "visualProofUrl": user.daily_task_photo_file_path,
            "language_code": "en"
        })

    if user.work_video_file_path:
        proofs.append({
            "title": "Work Video",
            "skill": "Practical Demonstration",
            "grade_score": 90, 
            "transcription": "Video evidence of work.",
            "visualProofUrl": user.work_video_file_path,
            "language_code": "en"
        })

    if user.community_recording_file_path:
        is_audio = user.community_recording_file_path.endswith(('.webm', '.mp3', '.wav', '.m4a'))
        transcription_text = "Your skill story."
        
        # Check for sidecar text file (generated by auto-transcription)
        txt_path = os.path.splitext(user.community_recording_file_path)[0] + ".txt"
        if os.path.exists(txt_path):
            try:
                with open(txt_path, 'r', encoding='utf-8') as f:
                    transcription_text = f.read()
            except Exception as e:
                print(f"Error reading transcription text: {e}")
        elif not is_audio and os.path.exists(user.community_recording_file_path):
             # Legacy fallback: if the main file itself is text (unlikely now)
            try:
                with open(user.community_recording_file_path, 'r', encoding='utf-8') as f:
                    transcription_text = f.read()
            except Exception as e:
                print(f"Error reading story text: {e}")

        proofs.append({
            "title": "My Skill Story",
            "skill": "Communication",
            "grade_score": 80,
            "transcription": transcription_text,
            "visualProofUrl": None,
            "audioProofUrl": user.community_recording_file_path if is_audio else None,
            "language_code": "en"
        })

    if user.skill_wallet and user.skill_wallet.credentials:
        for cred in user.skill_wallet.credentials:
            proofs.append({
                "title": cred.skill_name or "Work Evidence",
                "skill": cred.skill_name,
                "grade_score": cred.skill_trust_score,
                "transcription": cred.transcription or "No description",
                "visualProofUrl": cred.proof_url,
                "audioProofUrl": cred.audio_description_url,
                "language_code": cred.language_code
            })

    return proofs

# --------------------------------------------------------------------------
# 6. DYNAMIC SKILL RECOMMENDATIONS
# --------------------------------------------------------------------------
@app.get("/api/v1/skills/recommended/{user_id}")
def get_skill_recommendations(user_id: int, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404)

    profession = user.profession.lower() if user.profession else "general"
    skill_database = {
        "painter": [
            {"title": "Texture Painting", "subtitle": "Earn ₹800/day", "icon_type": "pen_tool", "progress": 0, "badge": "High Value"},
            {"title": "Damp Proofing", "subtitle": "High Demand", "icon_type": "shield", "progress": 0, "badge": "Urgent"}
        ],
        "general": [
            {"title": "Work Safety", "subtitle": "Essential", "icon_type": "shield", "progress": 0, "badge": "Mandatory"}
        ]
    }
    recommended = skill_database["painter"] if "painter" in profession else skill_database["general"]
    return {"user_id": user_id, "profession": user.profession, "recommendations": recommended}

# --------------------------------------------------------------------------
# 7. PUBLIC SKILL CARD API (For QR Code Verification)
# --------------------------------------------------------------------------
@app.get("/api/v1/public/profile/{wallet_hash}")
def get_public_profile(wallet_hash: str, db: GetDB):
    """
    Read-only public profile access via QR Code.
    Strictly filters out private data (Aadhaar, PAN, Phone).
    """
    wallet = db.query(models.SkillWallet).filter(models.SkillWallet.wallet_hash == wallet_hash).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Skill Card not found")
    
    user = wallet.owner
    
    verified_skills = []
    if wallet.credentials:
        for cred in wallet.credentials:
            if cred.is_verified:
                verified_skills.append({
                    "skill_name": cred.skill_name,
                    "trust_score": cred.skill_trust_score,
                    "issued_date": cred.issued_date,
                    "proof_url": cred.proof_url,
                    # We might limit audio access in public mode for privacy
                    "transcription": cred.transcription
                })

    public_data = {
        "name": user.name,
        "profession": user.profession,
        "location": f"{user.district}, {user.state}" if user.district else "India",
        "profile_photo": user.profile_photo_file_path,
        "member_since": wallet.created_at.strftime("%b %Y"),
        "verified_skills": verified_skills,
        "total_verified": len(verified_skills),
        "card_status": "Active" if len(verified_skills) > 0 else "Pending Activation"
    }
    
    return public_data

# --------------------------------------------------------------------------
# 8. SKILL BANK API
# --------------------------------------------------------------------------

@app.get("/api/v1/skillbank/lessons")
def get_skill_lessons(db: GetDB, type: Optional[str] = None, language: Optional[str] = None, difficulty: Optional[str] = None):
    query = db.query(models.SkillLesson)
    if type and type != 'All':
        query = query.filter(models.SkillLesson.type == type)
    if language and language != 'All':
        query = query.filter(models.SkillLesson.language == language)
    if difficulty and difficulty != 'All':
        query = query.filter(models.SkillLesson.difficulty == difficulty)
        
    lessons = query.all()
    
    # SEED DATA REMOVED as per user request
    # ...

    return [
        {
            "id": l.id,
            "title": l.title,
            "description": l.description,
            "type": l.type,
            "price": l.price,
            "teacher_name": l.teacher.name if l.teacher else "Unknown",
            "teacher_profession": l.teacher.profession if l.teacher else "Instructor",
            "duration_minutes": l.duration_minutes,
            "language": l.language,
            "difficulty": l.difficulty
        }
        for l in lessons
    ]

@app.get("/api/v1/skillbank/sessions")
def get_live_sessions(db: GetDB, user_id: Optional[int] = None, language: Optional[str] = None, difficulty: Optional[str] = None, teacher_id: Optional[int] = None):
    query = db.query(models.LiveSession).filter(models.LiveSession.scheduled_at > datetime.utcnow())
    
    if language and language != 'All':
        query = query.filter(models.LiveSession.language == language)
    if difficulty and difficulty != 'All':
        query = query.filter(models.LiveSession.difficulty == difficulty)
    if teacher_id:
        query = query.filter(models.LiveSession.teacher_id == teacher_id)
        
    sessions = query.all()
    
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "scheduled_at": s.scheduled_at,
            "price": s.price,
            "teacher_name": s.teacher.name if s.teacher else "Unknown",
            "meeting_link": s.meeting_link,
            "language": s.language,
            "difficulty": s.difficulty,
            "is_reminder_set": db.query(models.LiveSessionReminder).filter(
                models.LiveSessionReminder.session_id == s.id,
                models.LiveSessionReminder.user_id == user_id
            ).first() is not None if user_id else False
        }
        for s in sessions
    ]

class CreateReminderRequest(BaseModel):
    session_id: int
    phone_number: str
    date: str
    time: str

@app.post("/api/v1/skillbank/reminders/{user_id}")
def create_reminder(user_id: int, request: CreateReminderRequest, db: GetDB):
    # Check if session exists
    session = db.query(models.LiveSession).filter(models.LiveSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    reminder = models.LiveSessionReminder(
        user_id=user_id,
        session_id=request.session_id,
        phone_number=request.phone_number,
        reminder_date=request.date,
        reminder_time=request.time
    )
    db.add(reminder)
    db.commit()
    return {"message": "Reminder set successfully", "reminder_id": reminder.id}


class CreateLessonRequest(BaseModel):
    title: str
    description: str
    type: str # 'video' or 'document'
    price: int
    language: str = "English"
    difficulty: str = "Beginner"

@app.post("/api/v1/skillbank/create_lesson/{user_id}")
def create_skill_lesson(user_id: int, request: CreateLessonRequest, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    lesson = models.SkillLesson(
        teacher_id=user_id,
        title=request.title,
        description=request.description,
        type=request.type,
        price=request.price,
        file_path="placeholder.mp4", # In real app, would upload
        language=request.language,
        difficulty=request.difficulty
    )
    db.add(lesson)
    db.commit()
    return {"message": "Lesson created", "lesson_id": lesson.id}

class CreateSessionRequest(BaseModel):
    title: str
    description: str
    scheduled_at: datetime
    price: int
    language: str = "English"
    difficulty: str = "Beginner"

@app.post("/api/v1/skillbank/create_session/{user_id}")
def create_live_session(user_id: int, request: CreateSessionRequest, db: GetDB):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    session = models.LiveSession(
        teacher_id=user_id,
        title=request.title,
        description=request.description,
        scheduled_at=request.scheduled_at,
        price=request.price,
        meeting_link=f"https://meet.skillwallet.com/{random.randint(10000,99999)}",
        language=request.language,
        difficulty=request.difficulty
    )
    db.add(session)
    db.commit()
    return {"message": "Session scheduled", "session_id": session.id, "meeting_link": session.meeting_link}

# --- LEARNING DASHBOARD & ENROLLMENT ENDPOINTS ---

# --- TEACHING DASHBOARD ENDPOINTS ---

@app.get("/api/v1/teaching/dashboard/{user_id}")
def get_teaching_dashboard(user_id: int, db: GetDB):
    # 1. Fetch Content
    videos = db.query(models.SkillLesson).filter(
        models.SkillLesson.teacher_id == user_id, 
        models.SkillLesson.type == 'video'
    ).all()
    
    docs = db.query(models.SkillLesson).filter(
        models.SkillLesson.teacher_id == user_id, 
        models.SkillLesson.type == 'document'
    ).all()
    
    live_classes = db.query(models.LiveSession).filter(
        models.LiveSession.teacher_id == user_id
    ).order_by(models.LiveSession.scheduled_at.desc()).all()
    
    # 2. Calculate Stats
    
    # Total Students: Unique students enrolled in any lesson OR session by this teacher
    # Get lesson IDs
    lesson_ids = [l.id for l in videos] + [l.id for l in docs]
    lesson_students = db.query(models.LessonEnrollment.user_id).filter(
        models.LessonEnrollment.lesson_id.in_(lesson_ids)
    ).distinct().all() if lesson_ids else []
    
    # Get session IDs
    session_ids = [s.id for s in live_classes]
    session_students = db.query(models.SessionEnrollment.user_id).filter(
        models.SessionEnrollment.session_id.in_(session_ids)
    ).distinct().all() if session_ids else []
    
    unique_student_ids = set([s[0] for s in lesson_students] + [s[0] for s in session_students])
    total_students = len(unique_student_ids)
    
    # Earnings
    # Lesson earnings
    lesson_earnings = 0
    for l in videos + docs:
        enrollment_count = db.query(models.LessonEnrollment).filter(models.LessonEnrollment.lesson_id == l.id).count()
        lesson_earnings += (l.price or 0) * enrollment_count
        
    # Live Session earnings
    session_earnings = 0
    for s in live_classes:
        enrollment_count = db.query(models.SessionEnrollment).filter(models.SessionEnrollment.session_id == s.id).count()
        session_earnings += (s.price or 0) * enrollment_count
        
    total_earnings = lesson_earnings + session_earnings

    # Process Live Classes for response (add attendee count)
    processed_live_classes = []
    for s in live_classes:
        attendee_count = db.query(models.SessionEnrollment).filter(models.SessionEnrollment.session_id == s.id).count()
        processed_live_classes.append({
            "id": s.id,
            "title": s.title,
            "scheduled_at": s.scheduled_at,
            "attendees": attendee_count,
            "price": s.price
        })

    # Process Videos and Docs to be JSON serializable
    processed_videos = []
    for v in videos:
        processed_videos.append({
            "id": v.id,
            "title": v.title,
            "description": v.description,
            "type": v.type,
            "file_path": v.file_path,
            "price": v.price,
            "duration_minutes": v.duration_minutes,
            "language": v.language,
            "difficulty": v.difficulty,
            "created_at": v.created_at
        })

    processed_docs = []
    for d in docs:
        processed_docs.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "type": d.type,
            "file_path": d.file_path,
            "price": d.price,
            "duration_minutes": d.duration_minutes,
            "language": d.language,
            "difficulty": d.difficulty,
            "created_at": d.created_at
        })

    return {
        "stats": {
            "total_students": total_students,
            "total_videos": len(videos),
            "live_scheduled": len([s for s in live_classes if s.scheduled_at > datetime.utcnow()]),
            "earnings": total_earnings
        },
        "videos": processed_videos,
        "documents": processed_docs,
        "live_classes": processed_live_classes
    }

@app.post("/api/v1/skillbank/enroll/lesson/{user_id}/{lesson_id}")
def enroll_in_lesson(user_id: int, lesson_id: int, db: GetDB):
    # Check if already enrolled
    existing = db.query(models.LessonEnrollment).filter(
        models.LessonEnrollment.user_id == user_id,
        models.LessonEnrollment.lesson_id == lesson_id
    ).first()
    
    if existing:
        return {"message": "Already enrolled", "enrollment_id": existing.id}
        
    enrollment = models.LessonEnrollment(
        user_id=user_id,
        lesson_id=lesson_id,
        status="ENROLLED",
        progress_percent=0
    )
    db.add(enrollment)
    db.commit()
    return {"message": "Enrolled successfully", "enrollment_id": enrollment.id}

@app.post("/api/v1/skillbank/enroll/session/{user_id}/{session_id}")
def enroll_in_session(user_id: int, session_id: int, db: GetDB):
    existing = db.query(models.SessionEnrollment).filter(
        models.SessionEnrollment.user_id == user_id,
        models.SessionEnrollment.session_id == session_id
    ).first()
    
    if existing:
        return {"message": "Already registered", "enrollment_id": existing.id}
        
    enrollment = models.SessionEnrollment(
        user_id=user_id,
        session_id=session_id,
        status="REGISTERED"
    )
    db.add(enrollment)
    db.commit()
    return {"message": "Registered successfully", "enrollment_id": enrollment.id}

class UpdateProgressRequest(BaseModel):
    progress: int
    status: str

@app.post("/api/v1/skillbank/progress/{enrollment_id}")
def update_lesson_progress(enrollment_id: int, request: UpdateProgressRequest, db: GetDB):
    enrollment = db.query(models.LessonEnrollment).filter(models.LessonEnrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
        
    enrollment.progress_percent = request.progress
    enrollment.status = request.status
    enrollment.last_accessed = datetime.utcnow() # Update last accessed
    if request.status == "COMPLETED" and not enrollment.completed_at:
        enrollment.completed_at = datetime.utcnow()
        
    db.commit()
    return {"message": "Progress updated"}

@app.get("/api/v1/skillbank/enrollments/{user_id}")
def get_user_enrollments(user_id: int, db: GetDB):
    enrollments = db.query(models.LessonEnrollment).filter(models.LessonEnrollment.user_id == user_id).all()
    return [
        {
            "id": e.id,
            "status": e.status,
            "progress_percent": e.progress_percent,
            "enrolled_at": e.enrolled_at,
            "last_accessed": e.last_accessed,
            "lesson": {
                "id": e.lesson.id,
                "title": e.lesson.title,
                "type": e.lesson.type,
                "description": e.lesson.description,
                "duration_minutes": e.lesson.duration_minutes,
                "language": e.lesson.language,
                "difficulty": e.lesson.difficulty,
                "teacher_name": e.lesson.teacher.name if e.lesson.teacher else "Unknown"
            }
        }
        for e in enrollments if e.lesson 
    ]

@app.get("/api/v1/dashboard/stats/{user_id}")
def get_dashboard_stats(user_id: int, db: GetDB):
    # 1. Enrollment Stats
    enrollments = db.query(models.LessonEnrollment).filter(models.LessonEnrollment.user_id == user_id).all()
    
    total_enrolled = len(enrollments)
    not_started = len([e for e in enrollments if e.status == "ENROLLED" or e.progress_percent == 0])
    in_progress = len([e for e in enrollments if e.status == "IN_PROGRESS"])
    completed = len([e for e in enrollments if e.status == "COMPLETED"])
    
    # 2. Learning Time Calculation
    total_minutes = 0
    weekly_minutes = 0
    monthly_minutes = 0
    
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    
    for e in enrollments:
        if e.lesson: # Ensure lesson exists
            duration = e.lesson.duration_minutes or 15 # Default to 15 if null
            time_spent = 0
            
            if e.status == "COMPLETED":
                time_spent = duration
            elif e.status == "IN_PROGRESS":
                time_spent = int(duration * (e.progress_percent / 100))
            
            total_minutes += time_spent
            
            # Check for weekly/monthly
            # Use last_accessed if available, else enrolled_at as fallback
            activity_date = e.last_accessed or e.enrolled_at
            if activity_date:
                 if activity_date >= week_start:
                     weekly_minutes += time_spent
                 if activity_date >= month_start:
                     monthly_minutes += time_spent
    
    def format_time(mins):
        h = mins // 60
        m = mins % 60
        return f"{h}h {m}m" if h > 0 else f"{m}m"

    time_str = format_time(total_minutes)

    # 3. Skill Growth (Based on Credentials)
    # Get user's wallet first
    wallet = db.query(models.SkillWallet).filter(models.SkillWallet.user_id == user_id).first()
    current_score = 0
    previous_score = 0 # Simulated "Last Month"
    
    if wallet:
        credentials = db.query(models.SkillCredential).filter(models.SkillCredential.skill_wallet_id == wallet.id).all()
        if credentials:
            # Average score
            scores = [c.skill_trust_score for c in credentials if c.skill_trust_score]
            if scores:
                current_score = int(sum(scores) / len(scores))
                # Simulate previous score as slightly lower to show growth
                previous_score = max(300, current_score - 45) 
            else:
                 # Default baseline if no scored credentials
                current_score = 300
                previous_score = 300
        else:
            current_score = 300 # Baseline
            previous_score = 300

    return {
        "enrollment": {
            "total": total_enrolled,
            "not_started": not_started,
            "in_progress": in_progress,
            "completed": completed
        },
        "learning_time": {
            "total_minutes": total_minutes,
            "display": time_str,
            "weekly_display": format_time(weekly_minutes),
            "monthly_display": format_time(monthly_minutes)
        },
        "skill_growth": {
            "current_score": current_score,
            "previous_score": previous_score,
            "growth_message": "Your skill score increased because you completed practical lessons." if current_score > previous_score else "Start learning to grow your skill score."
        }
    }

@app.get("/api/v1/user/learning_dashboard/{user_id}")
def get_learning_dashboard(user_id: int, db: GetDB):
    # 1. Progress Stats
    enrollments = db.query(models.LessonEnrollment).filter(models.LessonEnrollment.user_id == user_id).all()
    
    stats = {
        "enrolled": len(enrollments),
        "not_started": len([e for e in enrollments if e.progress_percent == 0 and e.status != "COMPLETED"]),
        "in_progress": len([e for e in enrollments if e.progress_percent > 0 and e.status != "COMPLETED"]),
        "completed": len([e for e in enrollments if e.status == "COMPLETED"])
    }
    
    # 2. Skill Growth (from Credentials)
    # Fetch all credentials, group by skill_name
    credentials = db.query(models.SkillCredential).join(models.SkillWallet).filter(
        models.SkillWallet.user_id == user_id
    ).order_by(models.SkillCredential.issued_date.asc()).all()
    
    skill_growth = []
    # Simple logic: Find the most recent skill with >1 entry, or just the most recent one
    # Group by skill name
    skills_map = {}
    for c in credentials:
        if c.skill_name not in skills_map:
            skills_map[c.skill_name] = []
        skills_map[c.skill_name].append(c)
        
    for name, creds in skills_map.items():
        if not creds: continue
        current = creds[-1]
        previous_score = creds[-2].skill_trust_score if len(creds) > 1 else (current.skill_trust_score - 50 if current.skill_trust_score > 350 else 300)
        target_score = current.skill_trust_score + 100
        
        skill_growth.append({
            "skill_name": name,
            "previous_score": previous_score,
            "current_score": current.skill_trust_score,
            "target_score": target_score,
            "label": "You improved by showing better finishing work" if len(creds) > 1 else "Keep practicing to improve your score!"
        })
        
    return {
        "stats": stats,
        "skill_growth": skill_growth,
        "enrollments": [
            {
                "id": e.id,
                "lesson_title": e.lesson.title,
                "lesson_type": e.lesson.type,
                "progress": e.progress_percent,
                "status": e.status,
                "last_accessed": e.enrolled_at # Using enrolled_at as proxy for now
            } for e in enrollments
        ]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)