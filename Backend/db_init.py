# Backend/db_init.py

import sys
# Add the directory containing 'main.py' and other modules to the path
sys.path.append('.') 
from database import Base, engine, SessionLocal
from main import app # Importing app triggers execution of modules, including models/Base

print("Attempting to create database tables...")

try:
    # 1. Ensure the engine creates all tables defined in Base/models
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully or already exist.")
except Exception as e:
    print(f"Error during database initialization: {e}")
    sys.exit(1)

print("Database initialization script finished.")