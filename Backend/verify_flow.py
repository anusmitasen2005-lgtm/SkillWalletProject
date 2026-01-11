import requests
import json
import os

BASE_URL = "http://localhost:8000/api/v1"

def run_verification():
    print("--- STARTING VERIFICATION ---")
    
    # 1. Create/Login User (Simulated)
    # We'll just pick a user ID that likely exists or create one if we had the endpoint handy.
    # Assuming user ID 1 exists (or we can use the 'create_mock_user.py' logic if needed).
    # Let's try to get profile for ID 1.
    user_id = 123
    print(f"Checking user {user_id}...")
    response = requests.get(f"{BASE_URL}/user/profile/{user_id}")
    if response.status_code != 200:
        print(f"User {user_id} not found. Creating mock user via shell script or manual...")
        # Fallback: Just assume user 1 is valid for now or use the create_mock_user script logic
        # But wait, I can use the create_mock_user.py logic directly?
        # Let's just try to create a new user via the API if possible.
        # Registration endpoint: /auth/register_phone (step 1) -> /auth/verify_otp (step 2)
        # This is complicated to script. Let's assume user 1 exists or use an existing one.
        pass
    else:
        print("User 1 exists.")

    # 2. Submit Work Proof
    print("Submitting Work Proof...")
    
    # Create dummy files
    with open("dummy_image.png", "wb") as f:
        f.write(b"fake image content")
    with open("dummy_audio.webm", "wb") as f:
        f.write(b"fake audio content")
        
    # Upload Image
    with open('dummy_image.png', 'rb') as f_img:
        files = {'file': ('dummy_image.png', f_img, 'image/png')}
        resp_img = requests.post(f"{BASE_URL}/work/upload/{user_id}", files=files)
    
    if resp_img.status_code != 200:
        print(f"Image upload failed: {resp_img.text}")
        return
    image_url = resp_img.json()['file_path']
    print(f"Image uploaded: {image_url}")

    # Upload Audio
    with open('dummy_audio.webm', 'rb') as f_audio:
        files = {'file': ('dummy_audio.webm', f_audio, 'audio/webm')}
        resp_audio = requests.post(f"{BASE_URL}/work/upload/{user_id}", files=files)
    
    if resp_audio.status_code != 200:
        print(f"Audio upload failed: {resp_audio.text}")
        return
    audio_url = resp_audio.json()['file_path']
    print(f"Audio uploaded: {audio_url}")

    # Submit
    payload = {
        "skill_name": "Test Skill",
        "image_url": image_url,
        "audio_file_url": audio_url,
        "language_code": "en"
    }
    # Note: Need a valid token if auth is enforced?
    # The submit endpoint signature: submit_work_portfolio(user_id: int, request: WorkSubmissionRequest, db: GetDB)
    # It doesn't seem to require Bearer token in the decorator, but let's check main.py
    # It just uses 'user_id' path param.
    
    resp_submit = requests.post(f"{BASE_URL}/work/submit/{user_id}", json=payload)
    if resp_submit.status_code != 200:
        print(f"Submission failed: {resp_submit.text}")
        return
    
    print("Submission successful!")
    print(resp_submit.json())
    
    # 3. Verify Feedback in Database (via API)
    print("Verifying Feedback...")
    resp_proofs = requests.get(f"{BASE_URL}/user/proofs/{user_id}")
    proofs = resp_proofs.json()
    
    # Find the latest proof
    latest_proof = proofs[-1]
    print("Latest Proof Feedback:")
    # The API returns the key 'feedback', which is already a dict (json.loads is done in backend)
    feedback = latest_proof.get('feedback')
    print(feedback)
    
    # Check structure
    if feedback and "contributing_factors" in feedback and "limiting_factors" in feedback:
        print("SUCCESS: Structured feedback verified!")
    else:
        print("FAILURE: Feedback structure missing or incorrect.")

    # Cleanup
    os.remove("dummy_image.png")
    os.remove("dummy_audio.webm")

if __name__ == "__main__":
    run_verification()
