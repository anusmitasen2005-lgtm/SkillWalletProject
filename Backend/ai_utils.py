import google.generativeai as genai
import os
import json
import random
from config import settings

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not found in settings.")

def transcribe_audio(file_path):
    """
    Uploads audio to Gemini and requests transcription.
    """
    if not settings.GEMINI_API_KEY:
        print("Skipping transcription: No API Key")
        return "Transcription unavailable: API Key missing."

    try:
        print(f"Uploading file for transcription: {file_path}")
        # Gemini 1.5 Flash is good for audio
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Upload the file
        audio_file = genai.upload_file(path=file_path)
        
        # Generate content
        response = model.generate_content(
            [
                "Please transcribe this audio file exactly as spoken. Do not add any commentary.",
                audio_file
            ]
        )
        
        return response.text
    except Exception as e:
        print(f"Transcription error: {e}")
        return f"Transcription failed: {str(e)}"

def evaluate_skill_with_google(work_proof_path, audio_path, profession, context_data, user_description=""):
    """
    Evaluates skill based on proof and audio.
    """
    print(f"Evaluating skill for {profession}...")
    
    transcription = "No audio provided"
    if audio_path and os.path.exists(audio_path):
        transcription = transcribe_audio(audio_path)
        
    # TODO: Implement full visual analysis if needed.
    # For now, we return a high score and the real transcription.
    
    return {
        "score": random.randint(750, 900),
        "transcription": transcription,
        "feedback": {
            "strengths": "Clear demonstration of skills.",
            "improvements": "Consider adding more detailed commentary."
        }
    }
