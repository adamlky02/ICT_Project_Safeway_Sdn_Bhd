import sys
import os
import bcrypt
import secrets
import string

# Local Module Path (allows this standalone script to import backend modules)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database
from database import SessionLocal, Base, configure_database, get_current_database_url
import models

# Password Hashing (creates a bcrypt hash suitable for database storage)
def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')


# Seed Password Generation (uses a private environment override or creates a one-time random password)
def seed_password(environment_name: str) -> str:
    configured_password = os.getenv(environment_name, "")
    if configured_password:
        if len(configured_password) < 12:
            raise ValueError(f"{environment_name} must contain at least 12 characters")
        return configured_password
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*_-=+"
    return ''.join(secrets.choice(alphabet) for _ in range(16))

# Database Seeding (creates tables and inserts the default accounts when absent)
def seed_data():
    configure_database(get_current_database_url())
    print("🚀 Connecting to database...")

    try:
        # Table Preparation (ensures all model tables exist before inserting records)
        Base.metadata.create_all(bind=database.engine)
        print("✅ Database tables verified/created.")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return

    db = SessionLocal()

    # Default Accounts (defines local identities without committing reusable passwords)
    mock_users = [
        {"email": "admin@safeway.com", "password_env": "SEED_ADMIN_PASSWORD", "role": "admin"},
        {"email": "staff@safeway.com", "password_env": "SEED_STAFF_PASSWORD", "role": "staff"},
        {"email": "mr.teo@safeway.com", "password_env": "SEED_MR_TEO_PASSWORD", "role": "staff"}
    ]

    print("🌱 Seeding users into 'User_list'...")

    try:
        for user_data in mock_users:
            exists = db.query(models.User).filter(models.User.email == user_data["email"]).first()

            if not exists:
                generated_password = seed_password(user_data["password_env"])
                new_user = models.User(
                    email=user_data["email"],
                    password_hash=hash_password(generated_password),
                    role=user_data["role"]
                )
                db.add(new_user)
                print(f"   ➕ Added: {user_data['email']}")
                print(f"      One-time password: {generated_password}")
            else:
                print(f"   ⏩ Skipped: {user_data['email']}")

        db.commit()
        print("✨ Seeding complete! Check your Neon Console to see the data.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

# Script Entry Point (runs the seed operation only when executed directly)
if __name__ == "__main__":
    seed_data()
