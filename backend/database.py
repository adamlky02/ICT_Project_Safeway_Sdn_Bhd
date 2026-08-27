import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Database State (stores the configured connection, session factory, and model base)
DEFAULT_DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = None
SessionLocal = None
Base = declarative_base()


# Database Configuration (creates a connection pool and safely replaces any previous engine)
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


# Default Database URL (returns the connection string captured when the module loaded)
def get_default_database_url() -> str:
    return DEFAULT_DATABASE_URL


# Current Database URL (returns the active environment connection string)
def get_current_database_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


# Table Creation (creates any missing tables from the registered SQLAlchemy models)
def create_tables():
    Base.metadata.create_all(bind=engine)


# Initial Database Connection (configures the application with its default database)
configure_database(DEFAULT_DATABASE_URL)

# Request Database Session (provides a session and guarantees it closes after use)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
