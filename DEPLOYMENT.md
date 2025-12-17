# Cloud Deployment Guide

## Overview
- Backend: FastAPI + Uvicorn
- Frontend: React + Vite (served by Nginx)
- Database: Postgres
- Proof storage: container volume (migrate to S3 later)

## Local Compose Preview
1. Install Docker Desktop
2. From project root:
   - `docker compose up --build`
3. Open:
   - Backend: `http://127.0.0.1:8000/` and `http://127.0.0.1:8000/docs`
   - Frontend: `http://127.0.0.1:5173`

## Environment
Copy `.env.example` to `.env` and set secrets for production:
- `DATABASE_URL`: managed Postgres URL
- `SECRET_KEY`: strong random string
- `TWILIO_*`: optional for OTP in production
- `OPENAI_API_KEY`, `LLM_MODEL`: optional for LLM scoring
- `VITE_API_BASE_URL`: frontend points to backend `/api/v1`

## Render + Vercel (Recommended)
### Backend (Render)
- Web Service: root repo, start command: `cd Backend && uvicorn main:app --host 0.0.0.0 --port 10000`
- Env: set values from `.env`
- Disk: mount persistent disk at `/app/Backend/uploaded_files`
- Health: `GET /`

### Frontend (Vercel)
- Project: `Frontend/`
- Build: `npm install && npm run build`
- Env: `VITE_API_BASE_URL=https://<render-service>/api/v1`

### CORS
- Add your production origins to `origins` in `Backend/main.py`

## AWS ECS/EC2 (Optional)
- Build images and push to ECR
- ECS services:
  - Backend service with volume mount for proofs
  - Frontend service behind ALB
  - RDS Postgres

## S3 Migration (Optional)
- Replace local save in upload endpoints with S3 upload
- Return S3 URLs for `proof_url` and `audio_story_url`

## Notes
- Never commit secrets
- Rotate tokens regularly
- Monitor logs and set alerts
