from pydantic import BaseModel
from typing import List, Optional


class EnrollResponse(BaseModel):
    id: str
    student_id: str


class IdentifyMatch(BaseModel):
    id: str
    student_id: str
    name: str
    class_id: Optional[str]
    distance: float


class IdentifyResponse(BaseModel):
    matches: List[IdentifyMatch]
