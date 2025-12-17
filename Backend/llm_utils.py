import os
import base64
from typing import Optional, Dict, Any
from config import settings
def is_openai_configured() -> bool:
    return bool(getattr(settings, "OPENAI_API_KEY", ""))
def _local_file_path_from_url(url: str) -> Optional[str]:
    if not url:
        return None
    if url.startswith("/proofs/"):
        tail = url.split("/proofs/")[-1]
        return os.path.join("uploaded_files", tail)
    if url.startswith("uploaded_files"):
        return url
    return None
def _read_bytes(path: Optional[str]) -> Optional[bytes]:
    if not path:
        return None
    try:
        with open(path, "rb") as f:
            return f.read()
    except Exception:
        return None
def transcribe_audio_llm(audio_url: str, language_code: str) -> str:
    if not is_openai_configured() or not audio_url:
        return ""
    path = _local_file_path_from_url(audio_url)
    data = _read_bytes(path)
    if not data:
        return ""
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    tmp = os.path.join("uploaded_files", f"tmp_{os.path.basename(path)}")
    with open(tmp, "wb") as f:
        f.write(data)
    resp = client.audio.transcriptions.create(
        model="whisper-1",
        file=open(tmp, "rb"),
        language=language_code if language_code else None
    )
    try:
        os.remove(tmp)
    except Exception:
        pass
    return resp.text or ""
def evaluate_with_llm(skill_name: str, transcription: str, image_url: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
    path = _local_file_path_from_url(image_url)
    data = _read_bytes(path)
    ext = (os.path.splitext(image_url or "")[1] or "").lower()
    size = len(data) if data else 0
    if not is_openai_configured():
        vis_score = 10
        if ext in [".mp4", ".mov", ".webm"]:
            vis_score += 40
        if ext in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
            vis_score += 30
        if size > 500_000:
            vis_score += 10
        if size > 2_000_000:
            vis_score += 10
        t = transcription.lower() if transcription else ""
        markers = ["step", "process", "material", "tool", "then", "next", "finally"]
        hits = sum(1 for m in markers if m in t)
        exp_score = 20 + min(50, hits * 10) + (10 if len(t) > 200 else 0)
        final_300_900 = max(300, min(900, 300 + int((vis_score + exp_score) * 3)))
        narrative = "Evaluation generated without LLM. Visual execution and process understanding inferred from file type, size, and transcript markers."
        strengths = []
        if ext in [".mp4", ".mov", ".webm"]:
            strengths.append("Video evidence supports completeness and execution.")
        if hits >= 3:
            strengths.append("Transcript shows step awareness and tool/material references.")
        weaknesses = []
        if len(t) < 120:
            weaknesses.append("Explanation is brief; add more process detail.")
        recommendations = [
            {"type": "course", "level": "foundational", "title": "Basics of the trade", "reason": "Strengthen fundamentals and standard workflow."},
            {"type": "workshop", "level": "intermediate", "title": "Hands-on technique refinement", "reason": "Improve finishing and precision."},
            {"type": "scheme", "title": "Government skilling program", "reason": "Access subsidized training and tools."}
        ]
        return {
            "visual_execution_score": int(max(0, min(100, vis_score))),
            "process_understanding_score": int(max(0, min(100, exp_score))),
            "final_score_300_900": int(final_300_900),
            "overall_judgment": narrative,
            "feedback": {
                "strengths": strengths,
                "weaknesses": weaknesses,
                "recommendations": recommendations
            }
        }
    img_b64 = base64.b64encode(data).decode("ascii") if data else ""
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    user_info = {
        "name": user_context.get("name"),
        "profession": user_context.get("profession"),
        "date_of_birth": user_context.get("date_of_birth"),
        "state": user_context.get("state"),
        "district": user_context.get("district"),
        "locality": user_context.get("locality"),
        "education_docs": user_context.get("education_docs")
    }
    content = [
        {"type": "text", "text": (
            "Judge demonstrated skill only. Do not rely on identity or peer comparison.\n"
            f"Skill: {skill_name}\n"
            f"Explanation:\n{transcription}\n"
            f"User context:\n{user_info}\n"
            f"Visual proof type: {ext}\n"
            f"File size bytes: {size}\n"
            "Score channels:\n"
            "- visual_execution_score: 0–100 based on execution quality, completeness, precision, finishing, craftsmanship.\n"
            "- process_understanding_score: 0–100 based on process clarity, step sequencing, tools/materials correctness, technical reasoning.\n"
            "Synthesize:\n"
            "- final_score_300_900: integer 300–900 where 900 is highest.\n"
            "Include:\n"
            "- overall_judgment: concise synthesis referencing both channels.\n"
            "- feedback: provide strengths and weaknesses grounded in explicit observations.\n"
            "- recommendations: actionable items tailored to profession, language, and region (state/district/locality). Include:\n"
            "  • courses (foundational/intermediate/advanced),\n"
            "  • hands-on workshops,\n"
            "  • certifications,\n"
            "  • government schemes/skilling programs/apprenticeships/financial or welfare initiatives relevant to the user's region.\n"
            "Each recommendation must include a brief reason mapping directly to observed gaps.\n"
            "Return only JSON with keys: visual_execution_score, process_understanding_score, final_score_300_900, overall_judgment, feedback."
        )}
    ]
    if img_b64:
        content.append({"type": "input_image", "image_data": {"data": img_b64, "mime_type": "image/jpeg"}})
    completion = client.chat.completions.create(
        model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_object"},
        temperature=0
    )
    return completion.choices[0].message.parsed
