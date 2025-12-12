import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the database URL we just set
DATABASE_URL = os.getenv("DATABASE_URL")

# ----------------------------------------------------------------------
# 1. DATABASE CONNECTION ENGINE
# ----------------------------------------------------------------------
# SQLite does not support multiple threads sharing the same connection,
# so we add connect_args to allow concurrent requests.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL
    )

# ----------------------------------------------------------------------
# 2. SESSION FACTORY
# ----------------------------------------------------------------------
# Create a SessionLocal class to create new sessions for transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ----------------------------------------------------------------------
# 3. BASE CLASS FOR MODELS
# ----------------------------------------------------------------------
# This is the base class which our database models will inherit from
Base = declarative_base()

# ----------------------------------------------------------------------
# 4. DEPENDENCY: Get Database Session
# This function is used by FastAPI to inject a database session into endpoints.
# ----------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        # In SQLite, errors are rare here, but catch them just in case.
        print(f"DATABASE ERROR: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database service unavailable.",
        )
    finally:
        db.close()