import sqlite3
import os

def check_schema():
    print(f"CWD: {os.getcwd()}")
    
    # Try multiple possible paths
    possible_paths = [
        "sql_app.db",
        "Backend/sql_app.db",
        "SkillWalletProject/Backend/sql_app.db"
    ]
    
    db_path = None
    for p in possible_paths:
        if os.path.exists(p):
            db_path = p
            break
            
    if not db_path:
        print("❌ Database file not found in common locations!")
        print("Files in CWD:", os.listdir("."))
        if os.path.exists("Backend"):
            print("Files in Backend:", os.listdir("Backend"))
        return

    print(f"✅ Found DB at: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("--- Checking skill_lessons table ---")
        cursor.execute("PRAGMA table_info(skill_lessons)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Columns: {columns}")
        if "language" in columns and "difficulty" in columns:
            print("✅ language and difficulty columns present in skill_lessons")
        else:
            print("❌ MISSING columns in skill_lessons")

        print("\n--- Checking live_sessions table ---")
        cursor.execute("PRAGMA table_info(live_sessions)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Columns: {columns}")
        if "language" in columns and "difficulty" in columns:
            print("✅ language and difficulty columns present in live_sessions")
        else:
            print("❌ MISSING columns in live_sessions")

        conn.close()
    except Exception as e:
        print(f"❌ Error accessing DB: {e}")

if __name__ == "__main__":
    check_schema()
