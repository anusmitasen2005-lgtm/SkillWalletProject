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

    # 1. Database Settings (Added default for safety)
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # 2. Security Settings (Added default for safety)
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"

    # 3. OTP/Twilio Settings
    TWILIO_ACCOUNT_SID: str = Field(default="")
    TWILIO_AUTH_TOKEN: str = Field(default="")
    TWILIO_SERVICE_SID: str = Field(default="")

    # 4. --- NEW: Google Gemini Settings ---
    # This was missing and causing the AttributeError
    GEMINI_API_KEY: str = Field(default="")

settings = Settings()