#!/bin/bash
# Initialize database tables before starting Uvicorn server

# DEBUG LINE: Verify the TWILIO_SERVICE_SID variable is set
echo "DEBUG: TWILIO_SERVICE_SID is set to: $TWILIO_SERVICE_SID"

# Run the Python script to ensure database tables are created
python db_init.py

# Start the application server
uvicorn main:app --host 0.0.0.0 --port $PORT