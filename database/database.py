# =============================================================================
# HR-HIRE-AGENT/database/database.py
# =============================================================================
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from logger.logger import logger
from config.config_loader import config
from exception.custom_exception import DatabaseError

# Ensure the database URL is loaded
DATABASE_URL = config.DATABASE_URL

if not DATABASE_URL:
    logger.error("DATABASE_URL is not set in environment variables or config.yaml")
    raise ValueError("DATABASE_URL is not configured. Please set it in .env or config.yaml")

# Create a SQLAlchemy engine
try:
    engine = create_engine(DATABASE_URL)
    logger.info("SQLAlchemy engine created successfully.")
except Exception as e:
    logger.critical(f"Failed to create SQLAlchemy engine: {e}")
    raise DatabaseError(f"Failed to initialize database connection: {e}")

# Create a SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for declarative models
Base = declarative_base()

def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database operation failed: {e}")
        raise DatabaseError(f"Database transaction failed: {e}")
    finally:
        db.close()

def init_db():
    """Initializes the database by creating all tables."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/checked successfully.")
    except Exception as e:
        logger.critical(f"Failed to initialize database tables: {e}")
        raise DatabaseError(f"Failed to initialize database tables: {e}")

# Call init_db once, typically when the application starts
# from models.models import * # Import models to ensure they are registered with Base.metadata
# init_db() # This will be called from main.py