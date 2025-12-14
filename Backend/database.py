import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from config import settings

# Get the database URL from config (which has defaults)
DATABASE_URL = settings.DATABASE_URL

# Ensure we're using SQLite for local development (safer and simpler)
if not DATABASE_URL.startswith("sqlite"):
    print(f"Warning: DATABASE_URL is not SQLite. Using SQLite for local development: sqlite:///./sql_app.db")
    DATABASE_URL = "sqlite:///./sql_app.db"

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
    except HTTPException as he:
        try:
            db.rollback()
        except Exception:
            pass
        raise he
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print("=" * 60)
        print(f"DATABASE ERROR DETAILS:")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print(f"Traceback:")
        traceback.print_exc()
        print("=" * 60)
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=f"Database service unavailable: {str(e)}",
        )
    finally:
        db.close()
