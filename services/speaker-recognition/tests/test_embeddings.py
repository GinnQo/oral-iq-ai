import io
import numpy as np
import soundfile as sf

from app.embeddings import embedding_from_file


def test_embedding_from_file():
    sr = 16000
    length = sr // 4
    wave = 0.1 * np.sin(2 * np.pi * 440 * np.linspace(0, 0.25, length, endpoint=False)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, wave, sr, format="WAV")
    buf.seek(0)

    vec = embedding_from_file(buf)

    assert vec.shape == (1, 192)
    assert vec.dtype == np.float32
    assert np.allclose(np.linalg.norm(vec), 1.0)
