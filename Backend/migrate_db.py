import sqlite3
import os

# Use absolute path to ensure we find the DB file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "sql_app.db")

def migrate():
    print(f"Using database: {DB_FILE}")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # List of new columns to add
    new_columns = [
        ("email", "VARCHAR"),
        ("date_of_birth", "DATE"),
        ("gender", "VARCHAR"),
        ("name", "VARCHAR"),
        ("profession", "VARCHAR"),
        ("age", "INTEGER"),
        ("local_area", "VARCHAR"),
        ("profile_photo_file_path", "VARCHAR"),
        ("training_letter_file_path", "VARCHAR"),
        ("apprenticeship_proof_file_path", "VARCHAR"),
        ("local_authority_proof_file_path", "VARCHAR"),
        ("recommendation_file_path", "VARCHAR"),
        ("community_verifier_id", "VARCHAR"),
        ("previous_certificates_file_path", "VARCHAR"),
        ("past_jobs_proof_file_path", "VARCHAR"),
        ("daily_task_photo_file_path", "VARCHAR"),
        ("work_video_file_path", "VARCHAR"),
        ("campus_lab_doc_file_path", "VARCHAR"),
        ("community_recording_file_path", "VARCHAR"),
        ("tier3_cibil_score", "INTEGER DEFAULT 0"),
        ("state", "VARCHAR"),
        ("district", "VARCHAR")
    ]
    
    print("--- MIGRATING DATABASE ---")
    
    for col_name, col_type in new_columns:
        try:
            print(f"Adding column: {col_name}...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"  -> Success")
        except sqlite3.OperationalError as e:
             # Check for "duplicate column" error which varies by SQLite version/driver
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"  -> Column already exists (Skipped)")
            else:
                print(f"  -> Error: {e}")

    # Add duration_minutes to skill_lessons
    try:
        print("Adding duration_minutes to skill_lessons...")
        cursor.execute("ALTER TABLE skill_lessons ADD COLUMN duration_minutes INTEGER DEFAULT 15")
        print("  -> Success")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("  -> Column already exists (Skipped)")
        else:
            print(f"  -> Error: {e}")

    # Add language to skill_lessons
    try:
        print("Adding language to skill_lessons...")
        cursor.execute("ALTER TABLE skill_lessons ADD COLUMN language VARCHAR DEFAULT 'English'")
        print("  -> Success")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("  -> Column already exists (Skipped)")
        else:
            print(f"  -> Error: {e}")

    # Add difficulty to skill_lessons
    try:
        print("Adding difficulty to skill_lessons...")
        cursor.execute("ALTER TABLE skill_lessons ADD COLUMN difficulty VARCHAR DEFAULT 'Beginner'")
        print("  -> Success")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("  -> Column already exists (Skipped)")
        else:
            print(f"  -> Error: {e}")

    # Add last_accessed to lesson_enrollments
    try:
        print("Adding last_accessed to lesson_enrollments...")
        cursor.execute("ALTER TABLE lesson_enrollments ADD COLUMN last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP")
        print("  -> Success")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("  -> Column already exists (Skipped)")
        else:
            print(f"  -> Error: {e}")

    # Add language to live_sessions
    try:
        print("Adding language to live_sessions...")
        cursor.execute("ALTER TABLE live_sessions ADD COLUMN language VARCHAR DEFAULT 'English'")
        print("  -> Success")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("  -> Column already exists (Skipped)")
        else:
            print(f"  -> Error: {e}")

    # Add difficulty to live_sessions
    try:
        print("Adding difficulty to live_sessions...")
        cursor.execute("ALTER TABLE live_sessions ADD COLUMN difficulty VARCHAR DEFAULT 'Beginner'")
        print("  -> Success")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("  -> Column already exists (Skipped)")
        else:
            print(f"  -> Error: {e}")

    conn.commit()
    conn.close()
    print("--- MIGRATION COMPLETE ---")

if __name__ == "__main__":
    migrate()