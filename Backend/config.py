from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # 1. Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # 2. Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"

    # 3. OTP/Twilio Settings (Placeholders for now)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_SERVICE_SID: str = os.getenv("TWILIO_SERVICE_SID")

settings = Settings()