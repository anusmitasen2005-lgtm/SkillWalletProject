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

    # 1. Database Settings
    DATABASE_URL: str

    # 2. Security Settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "*" # Allow all origins for development/preview flexibility

    # 3. OTP/Twilio Settings (CRITICAL FIX: Allow empty string if not found, preventing crashes)
    TWILIO_ACCOUNT_SID: str = Field(default="")
    TWILIO_AUTH_TOKEN: str = Field(default="")
    TWILIO_SERVICE_SID: str = Field(default="")

    # 4. LLM Settings (Optional; enables Whisper/GPT-4o integrations when provided)
    OPENAI_API_KEY: str = Field(default="")
    LLM_MODEL: str = Field(default="gpt-4o-mini")

settings = Settings()
