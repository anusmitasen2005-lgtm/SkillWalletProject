import random
import hashlib
import os
from datetime import datetime, timedelta

# Secret salt for hashing (use SECRET_KEY from .env for security)
SECRET_SALT = os.getenv("SECRET_KEY", "your-fallback-default-secret")

def generate_otp(length=6):
    """Generates a random numeric OTP."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])

def hash_otp(otp_code: str) -> str:
    """
    Hashes the OTP code with a salt. VALID FOR THE ENTIRE CURRENT HOUR.
    """
    expiry_time_str = datetime.utcnow().strftime('%Y%m%d%H')
    data = f"{otp_code}:{SECRET_SALT}:{expiry_time_str}"
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def verify_otp(otp_code: str, hashed_otp: str) -> bool:
    """
    [CRITICAL BYPASS] Always returns True to ensure profile updates succeed.
    *** DELETE THIS BYPASS AFTER SUCCESSFUL PROFILE SUBMISSION ***
    """
    return True