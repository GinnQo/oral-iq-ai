from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import numpy as np

from .db import get_db_session, init_db
from .embeddings import embedding_from_file
from .models import StudentVoiceProfile

app = FastAPI(title="OralIQ Speaker Recognition")


@app.on_event("startup")
def startup():
    init_db()


@app.post("/enroll")
def enroll(
    audio: UploadFile = File(...),
    student_id: str = Form(...),
    name: str = Form(...),
    class_id: str = Form(None),
):
    # compute embedding
    try:
        vec = embedding_from_file(audio.file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    session = get_db_session()
    profile = StudentVoiceProfile(
        student_id=student_id,
        name=name,
        class_id=class_id,
        embedding=vec.tolist(),
    )

    session.add(profile)
    session.commit()

    return JSONResponse({"id": profile.id, "student_id": profile.student_id})


@app.post("/identify")
def identify(audio: UploadFile = File(...), top_k: int = Form(5)):
    try:
        vec = embedding_from_file(audio.file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    session = get_db_session()

    # Use raw SQL to leverage pgvector cosine operator
    sql = (
        "SELECT id, student_id, name, class_id, embedding, "
        "(embedding <#> :q) as distance "
        "FROM student_voice_profile "
        "ORDER BY distance ASC LIMIT :k"
    )

    results = session.execute(
        sql, {"q": list(vec.astype(float)), "k": top_k}
    ).fetchall()

    matches = [
        {
            "id": r[0],
            "student_id": r[1],
            "name": r[2],
            "class_id": r[3],
            "distance": float(r[5] if len(r) > 5 else 0),
        }
        for r in results
    ]

    return {"matches": matches}


@app.get("/profiles")
def list_profiles(limit: int = 100):
    session = get_db_session()
    rows = session.query(StudentVoiceProfile).limit(limit).all()
    return [{"id": r.id, "student_id": r.student_id, "name": r.name} for r in rows]


@app.get("/health")
def health():
    return {"status": "ok"}
