-- Initial SQL to enable pgvector extension and create table
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS student_voice_profile (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  class_id TEXT,
  embedding vector(192) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ivfflat index for ANN (requires ANALYZE after populate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'student_voice_profile' AND indexname = 'student_voice_profile_embedding_idx'
  ) THEN
    EXECUTE 'CREATE INDEX student_voice_profile_embedding_idx ON student_voice_profile USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);';
  END IF;
END$$;
