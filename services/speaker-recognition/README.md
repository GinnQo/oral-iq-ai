Speaker Recognition service (scaffold)

This service provides endpoints to enroll student voice profiles and identify speakers using voice embeddings stored in PostgreSQL with pgvector.

Quick start (requires Docker and docker-compose):

1. Build and start services:

```bash
docker-compose up --build
```

2. The FastAPI app will be available at `http://localhost:8000`.

Notes:
- `app/embeddings.py` contains a placeholder embedding function; replace with ECAPA-TDNN inference.
- Run `services/speaker-recognition/alembic_init.sql` against the database to create the table and index.
