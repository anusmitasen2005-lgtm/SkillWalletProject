from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # 1. Database Settings
    DATABASE_URL: str = Field(os.getenv("DATABASE_URL"))

    # 2. Security Settings
    SECRET_KEY: str = Field(os.getenv("SECRET_KEY"))
    ALGORITHM: str = "HS256"

    # 3. OTP/Twilio Settings (Add Union[str, None] to allow None or string)
    # CRITICAL FIX: Add default empty strings to prevent startup crash if not set
    TWILIO_ACCOUNT_SID: str | None = Field(default="")
    TWILIO_AUTH_TOKEN: str | None = Field(default="")
    TWILIO_SERVICE_SID: str | None = Field(default="")

settings = Settings()