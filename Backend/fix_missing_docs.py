import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def fix_missing_docs():
    db: Session = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"Found {len(users)} users. Checking for missing docs...")
        
        updated_count = 0
        
        for user in users:
            upload_dir = f"uploads/{user.id}"
            if not os.path.exists(upload_dir):
                continue
                
            files = os.listdir(upload_dir)
            
            # Map of file_prefix -> (db_column, file_type_key)
            # The file naming convention in main.py is: f"{upload_dir}/{file_type}_{safe_name}"
            # So we look for files starting with file_type + "_"
            
            mapping = {
                "pan_card": "pan_card_file_path",
                "training_letter": "training_letter_file_path",
                "apprenticeship_proof": "apprenticeship_proof_file_path",
                "local_authority_proof": "local_authority_proof_file_path",
                "aadhaar": "aadhaar_file_path",
                "profile_photo": "profile_photo_file_path",
                "daily_task_photo": "daily_task_photo_file_path",
                "work_video": "work_video_file_path",
                "community_recording": "community_recording_file_path"
            }
            
            user_updated = False
            
            for file_type, db_col in mapping.items():
                # Check if DB column is empty
                if not getattr(user, db_col):
                    # Look for file starting with file_type
                    # We need to be careful with prefixes. e.g. "pan_card" matches "pan_card_xyz.jpg"
                    
                    found_file = None
                    # Sort files to get the latest one if possible (though os.listdir order is arbitrary)
                    # Ideally we pick any matching file
                    for f in files:
                        if f.startswith(f"{file_type}_"):
                            found_file = f"{upload_dir}/{f}"
                            break
                    
                    if found_file:
                        print(f"  [User {user.id}] Found missing {file_type} on disk: {found_file}")
                        setattr(user, db_col, found_file)
                        user_updated = True
            
            if user_updated:
                updated_count += 1
                
        if updated_count > 0:
            db.commit()
            print(f"✅ Successfully updated {updated_count} users with missing docs.")
        else:
            print("✅ No missing docs found (or no files on disk to match).")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_missing_docs()
