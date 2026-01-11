import random
import json
from trust_layer import TrustPipeline

class GeminiEvaluator:
    """
    Simulates the Google Gemini LLM evaluation logic for Skill Wallet.
    
    Now integrated with the Trust & Authenticity Layer (SynthID, Vertex AI, Chirp, Gemini 1.5 Pro).
    """

    @staticmethod
    def construct_system_prompt(profession, context_data):
        """
        Constructs the strict system prompt for Gemini with detailed context.
        """
        location_str = f"{context_data.get('local_area', '')}, {context_data.get('district', '')}, {context_data.get('state', '')}"
        
        return f"""
        You are the Skill Wallet Evaluator, a structured assessor of real-world evidence.
        
        YOUR GOAL:
        Assign a Skill Trust Score (300-900) based strictly on visible work proof and voice explanation.
        
        INPUT CONTEXT (Use to evaluate fairly based on access/infrastructure):
        - Profession: {profession}
        - Location: {location_str}
        - Age/Maturity: {context_data.get('age', 'Unknown')} (Context for experience curve)
        
        RUBRIC & CONSTRAINTS:
        1. VISIBLE PROOF: Check correctness, safety, completeness. IGNORE aesthetics/camera quality.
        2. SKILL STORY: Check logic, step awareness, error explanation. IGNORE grammar/accent.
        3. NO JUDGMENT: Do not judge intelligence, education, or background.
        4. NO INFERENCE: Do not infer skill from certificates alone.
        
        SCORING RANGE:
        - 300-500: Early-stage / Assisted
        - 500-700: Functional / Independent
        - 700-900: Strong / Industry-ready
        - >= 750: Ideal / Expert
        
        OUTPUT FORMAT (JSON):
        {{
            "score": <int>,
            "transcription": <string>,
            "feedback": {{
                "contributing_factors": [<string>, ...],
                "limiting_factors": [<string>, ...],
                "improvement_tips": [<string>, ...],
                "recommendations": [
                    {{
                        "gap_identified": <string>,
                        "learning_pathway": <string (Course/Scheme/Workshop)>,
                        "benefit_explanation": <string>
                    }}
                ]
            }}
        }}
        """

    @staticmethod
    def evaluate(work_proof_path, audio_path, profession, context_data, user_description=None):
        """
        Simulates the evaluation process with enhanced context and recommendations.
        """
        
        print(f"--- GEMINI EVALUATOR STARTED ---")
        print(f"Analyzing Proof: {work_proof_path}")
        print(f"Context: {profession}, {context_data}")
        
        # Mock Transcription
        if user_description:
            mock_transcription = user_description
        else:
            mock_transcription = f"Standard work description for {profession}."

        # Mock Scoring Logic
        base_score = 600
        if user_description:
            if len(user_description) > 50: base_score += 50
            if len(user_description) > 100: base_score += 50
            
        score = random.randint(base_score - 50, base_score + 50)
        score = max(300, min(900, score))
        
        # Generate Recommendations based on Score & Context
        recommendations = []
        if score < 750:
            recommendations.append({
                "gap_identified": "Advanced safety protocols",
                "learning_pathway": f"Certified Safety Workshop in {context_data.get('district', 'your district')}",
                "benefit_explanation": "Formal safety certification will boost your score above 750."
            })
            recommendations.append({
                "gap_identified": "Modern tool usage",
                "learning_pathway": "PM Vishwakarma Toolkit Scheme",
                "benefit_explanation": "Access to modern tools will improve finish quality and efficiency."
            })
        
        if score < 500:
            status = "Early-stage"
            factors = ["Basic attempt visible"]
            limitations = ["Incomplete process"]
            tips = ["Wear full safety gear"]
        elif score < 700:
            status = "Functional"
            factors = ["Correct tool usage", "Good safety awareness"]
            limitations = ["Minor finish issues"]
            tips = ["Focus on final polish"]
        else:
            status = "Industry-ready"
            factors = ["Perfect execution", "Advanced problem solving"]
            limitations = ["None visible"]
            tips = ["Ready for certification"]

        result = {
            "score": score,
            "transcription": mock_transcription,
            "feedback": {
                "contributing_factors": factors,
                "limiting_factors": limitations,
                "improvement_tips": tips,
                "recommendations": recommendations
            }
        }
        
        print(f"--- EVALUATION COMPLETE: Score {score} ({status}) ---")
        return result
