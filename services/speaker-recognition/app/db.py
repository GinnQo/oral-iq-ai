import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get(
    "SR_DATABASE_URL", "postgresql://postgres:postgres@db:5432/speaker_recognition"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def get_db_session():
    return SessionLocal()


def init_db():
    # create tables if they do not exist
    from . import models

    models.Base.metadata.create_all(bind=engine)
