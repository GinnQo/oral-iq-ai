import io
from typing import BinaryIO

import numpy as np
import soundfile as sf
import torch
import torchaudio
from speechbrain.pretrained import EncoderClassifier


class ECAPATDNNEmbedder:
    TARGET_SR = 16000

    def __init__(self):
        self.model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="pretrained_models/spkrec-ecapa-voxceleb",
        )
        self.model.eval()

    def _load_audio(self, file_obj: BinaryIO):
        file_obj.seek(0)
        audio_bytes = file_obj.read()

        try:
            waveform, sample_rate = torchaudio.load(io.BytesIO(audio_bytes))
        except Exception:
            file_obj.seek(0)
            data, sample_rate = sf.read(io.BytesIO(audio_bytes), dtype="float32")
            if data.ndim == 1:
                waveform = torch.from_numpy(data).unsqueeze(0)
            else:
                waveform = torch.from_numpy(data.T)

        return waveform, sample_rate

    def embed(self, file_obj: BinaryIO) -> np.ndarray:
        waveform, sample_rate = self._load_audio(file_obj)

        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        if sample_rate != self.TARGET_SR:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate,
                new_freq=self.TARGET_SR,
            )
            waveform = resampler(waveform)

        with torch.inference_mode():
            embeddings = self.model.encode_batch(waveform)

        vec = embeddings.squeeze(0).cpu().numpy().astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec


_embedder = ECAPATDNNEmbedder()


def embedding_from_file(file_obj) -> np.ndarray:
    return _embedder.embed(file_obj)
