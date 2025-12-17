import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from fastapi import status
from config import settings # CRITICAL: Use config.settings for loading config

# Get the database URL from config (which has defaults)
DATABASE_URL = settings.DATABASE_URL
# Normalize driver: prefer psycopg2 for Postgres to avoid asyncpg incompatibilities
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
# Use DATABASE_URL from configuration for all environments

# ----------------------------------------------------------------------
# 1. DATABASE CONNECTION ENGINE
# ----------------------------------------------------------------------
# SQLite does not support multiple threads sharing the same connection,
# so we add connect_args to allow concurrent requests.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
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
# 4. DEPENDENCY: Get Database Session (CRITICAL FIX: Added Rollback and Logging)
# ----------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        # Log the full error for debugging
        import traceback
        print("=" * 60)
        print(f"DATABASE ERROR DETAILS:")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print(f"Traceback:")
        traceback.print_exc()
        print("=" * 60)
        
        # CRITICAL: Rollback on error to release locks and clean the transaction state
        db.rollback() 
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database service unavailable: {str(e)}",
        )
    finally:
        db.close()
