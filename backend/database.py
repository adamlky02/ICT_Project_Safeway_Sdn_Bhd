import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DEFAULT_DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = None
SessionLocal = None
Base = declarative_base()


def configure_database(database_url: str | None = None):
    global engine, SessionLocal

    target_url = (database_url or os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL or "").strip()
    if not target_url:
        raise RuntimeError("DATABASE_URL is not configured")

    previous_engine = engine
    engine = create_engine(target_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    os.environ["DATABASE_URL"] = target_url

    if previous_engine and previous_engine is not engine:
        try:
            previous_engine.dispose()
        except Exception:
            pass

    return engine


def get_default_database_url() -> str:
    return DEFAULT_DATABASE_URL


def get_current_database_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def create_tables():
    Base.metadata.create_all(bind=engine)


configure_database(DEFAULT_DATABASE_URL)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()