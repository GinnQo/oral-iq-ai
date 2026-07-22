import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector

Base = declarative_base()


class StudentVoiceProfile(Base):
    __tablename__ = "student_voice_profile"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    class_id = Column(String, nullable=True)
    embedding = Column(Vector(192), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
