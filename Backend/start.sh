#!/bin/bash
# Initialize database tables before starting Uvicorn server

# Run the Python script to ensure database tables are created
python db_init.py

# Start the application server
uvicorn main:app --host 0.0.0.0 --port $PORT