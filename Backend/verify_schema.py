from sqlalchemy import create_engine, inspect
from models import Base, SkillCredential

DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)

inspector = inspect(engine)
columns = [col['name'] for col in inspector.get_columns('skill_credentials')]

required_columns = ['skill_trust_score', 'evaluation_feedback', 'context_profession', 'context_location']
missing_columns = [col for col in required_columns if col not in columns]

if missing_columns:
    print(f"Missing columns: {missing_columns}")
else:
    print("All required columns present.")
