# Backend/config.py

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import os

# Load environment variables from .env file (Only for local development)
load_dotenv()

class Settings(BaseSettings):
    # This tells pydantic to look for environment variables
    model_config = SettingsConfigDict(
        env_file='.env', 
        env_file_encoding='utf-8', 
        extra='ignore' # Ignore variables not defined below
    )

    # 1. Database Settings (Optional - defaults to SQLite if not set)
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # 2. Security Settings (Optional - defaults to a development key if not set)
    SECRET_KEY: str = "dev-secret-key-change-in-production-12345"
    ALGORITHM: str = "HS256"

    # 3. OTP/Twilio Settings (CRITICAL FIX: Allow empty string if not found, preventing crashes)
    TWILIO_ACCOUNT_SID: str = Field(default="")
    TWILIO_AUTH_TOKEN: str = Field(default="")
    TWILIO_SERVICE_SID: str = Field(default="")

    # 4. Admin/Owner Control
    OWNER_USER_ID: int = Field(default=1)

settings = Settings()
