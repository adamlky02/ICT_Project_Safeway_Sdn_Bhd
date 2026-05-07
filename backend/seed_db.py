import sys
import os
import bcrypt # Using direct bcrypt instead of passlib

# Ensure the script can find the other local files
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Base, configure_database, get_current_database_url
import models

def hash_password(password: str) -> str:
    # Bcrypt requires bytes, so we encode the string
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Return as string to store in DB
    return hashed_password.decode('utf-8')

def seed_data():
    configure_database(get_current_database_url())
    print("🚀 Connecting to database...")

    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables verified/created.")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return

    db = SessionLocal()

    mock_users = [
        {"email": "admin@safeway.com", "password": "admin123", "role": "admin"},
        {"email": "staff@safeway.com", "password": "staff123", "role": "staff"},
        {"email": "mr.teo@safeway.com", "password": "password123", "role": "staff"}
    ]

    print("🌱 Seeding users into 'User_list'...")

    try:
        for user_data in mock_users:
            exists = db.query(models.User).filter(models.User.email == user_data["email"]).first()

            if not exists:
                new_user = models.User(
                    email=user_data["email"],
                    # Using our new hash function
                    password_hash=hash_password(user_data["password"]),
                    role=user_data["role"]
                )
                db.add(new_user)
                print(f"   ➕ Added: {user_data['email']}")
            else:
                print(f"   ⏩ Skipped: {user_data['email']}")

        db.commit()
        print("✨ Seeding complete! Check your Neon Console to see the data.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()