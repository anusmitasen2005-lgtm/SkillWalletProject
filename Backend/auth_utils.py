# Backend/auth_utils.py

import random
import hashlib
import os
from datetime import datetime, timedelta

# Secret salt for hashing (use SECRET_KEY from .env for security)
SECRET_SALT = os.getenv("SECRET_KEY", "your-fallback-default-secret")

def generate_otp(length=6):
    """Generates a random numeric OTP."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])

def hash_otp(otp_code: str, grace_period=False) -> str:
    """
    Hashes the OTP code with a salt, optionally for the previous hour (grace period).
    """
    now = datetime.utcnow()
    if grace_period:
        now = now - timedelta(hours=1)
        
    expiry_time_str = now.strftime('%Y%m%d%H')
    data = f"{otp_code}:{SECRET_SALT}:{expiry_time_str}"
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def verify_otp(otp_code: str, hashed_otp: str) -> bool:
    """
    Verifies the submitted OTP against the stored hash.
    Checks the current hour's hash and the previous hour's hash for a grace period.
    """
    if hashed_otp is None:
        return False
        
    # 1. Check current hour's hash
    current_hash = hash_otp(otp_code)
    if current_hash == hashed_otp:
        return True
        
    # 2. Check previous hour's hash (grace period)
    previous_hour_hash = hash_otp(otp_code, grace_period=True)
    if previous_hour_hash == hashed_otp:
        return True
        
    return False