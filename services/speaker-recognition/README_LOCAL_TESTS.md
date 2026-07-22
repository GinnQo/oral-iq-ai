# Local Speaker Recognition Tests

This repository includes a quick local test for the speaker embedding function.

## Run the test

From `services/speaker-recognition`:

```bash
python3 -m pip install -r requirements.txt
python3 -m pip install pytest
pytest tests/test_embeddings.py
```

## What it checks

- that `app.embeddings.embedding_from_file` imports successfully
- that a synthetic WAV file produces a vector shape `(1, 192)`
- that the result is normalized to unit length
