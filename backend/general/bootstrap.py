import os
import warnings
import bcrypt
from . import database, models


def ensure_bootstrap_developer() -> None:
    bootstrap_email = os.getenv("BOOTSTRAP_DEVELOPER_EMAIL", "").strip().lower()
    if not bootstrap_email:
        return

    db = database.SessionLocal()
    try:
        if db.query(models.User).filter(models.User.role == "developer").first():
            return
        account = db.query(models.User).filter(models.User.email == bootstrap_email).first()
        if account:
            if account.role != "admin":
                warnings.warn("BOOTSTRAP_DEVELOPER_EMAIL must identify an existing administrator.", RuntimeWarning)
                return
            account.role = "developer"
            db.commit()
            return

        bootstrap_password = os.getenv("BOOTSTRAP_DEVELOPER_PASSWORD", "")
        if len(bootstrap_password) < 12:
            warnings.warn("BOOTSTRAP_DEVELOPER_PASSWORD must contain at least 12 characters when creating a new account.", RuntimeWarning)
            return
        account = models.User(
            email=bootstrap_email,
            password_hash=bcrypt.hashpw(bootstrap_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            full_name=os.getenv("BOOTSTRAP_DEVELOPER_NAME", "System Developer").strip() or "System Developer",
            role="developer",
        )
        db.add(account)
        db.commit()
    except Exception:
        db.rollback()
        warnings.warn("The bootstrap developer account could not be prepared.", RuntimeWarning)
    finally:
        db.close()
