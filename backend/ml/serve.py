"""
CrowdLens — LSTM Prediction Server
====================================
FastAPI microservice that loads trained LSTM models and serves predictions to
the .NET ForecastController.

Confidence is estimated via Monte Carlo Dropout:
  - keep dropout ACTIVE during inference
  - run MC_SAMPLES forward passes
  - mean  → predicted density score
  - std   → uncertainty → confidence percentage

Usage
-----
  cd Crowdlens-backend/ml
  uvicorn serve:app --port 8000 --reload

Endpoints
---------
  POST /api/predict    — returns 6-hour forecast for a location
  GET  /health         — lists loaded models
"""

import os
import json
import math
import sqlite3
from datetime import datetime
from typing import List

import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ── Hyper-parameters (must match train.py) ───────────────────────────────────
WINDOW      = 24
HORIZON     = 6
HIDDEN      = 64
LAYERS      = 2
DROPOUT     = 0.2
MC_SAMPLES  = 30    # Monte Carlo inference passes — more = smoother uncertainty
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DB_PATH   = os.path.join(BASE_DIR, '..', 'crowdlens.db')
MODEL_DIR = os.path.join(BASE_DIR, 'models')


# ── Model definition (identical to train.py) ─────────────────────────────────

class CrowdLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=5,
            hidden_size=HIDDEN,
            num_layers=LAYERS,
            batch_first=True,
            dropout=DROPOUT,
        )
        self.head = nn.Sequential(
            nn.Linear(HIDDEN, 32),
            nn.ReLU(),
            nn.Linear(32, HORIZON),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])


# ── Feature helpers ───────────────────────────────────────────────────────────

def cyclic_encode(value: float, period: float):
    rad = 2 * math.pi * value / period
    return math.sin(rad), math.cos(rad)


def get_recent_window(location_id: int) -> np.ndarray | None:
    """
    Fetch the 24 most-recent ForecastRecord rows for a location and build a
    feature tensor of shape (1, WINDOW, 5) ready for the model.
    """
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        """
        SELECT RecordedAt, DensityScore
        FROM   ForecastRecords
        WHERE  LocationId = ?
        ORDER  BY RecordedAt DESC
        LIMIT  ?
        """,
        (location_id, WINDOW),
    ).fetchall()
    conn.close()

    if len(rows) < WINDOW:
        return None

    rows = list(reversed(rows))   # chronological order (oldest → newest)

    seq = []
    for ts_str, score in rows:
        ts = datetime.fromisoformat(ts_str)
        h_sin, h_cos = cyclic_encode(ts.hour,      24)
        d_sin, d_cos = cyclic_encode(ts.weekday(),  7)
        seq.append([score / 5.0, h_sin, h_cos, d_sin, d_cos])

    return np.array([seq], dtype=np.float32)   # (1, 24, 5)


# ── Monte Carlo inference ─────────────────────────────────────────────────────

def mc_predict(model: CrowdLSTM, x: np.ndarray):
    """
    Run MC_SAMPLES stochastic forward passes with dropout active.
    Returns (mean_scores, std_scores) in the original 1–5 scale.

    Higher std → the model is less certain → lower confidence percentage.
    """
    model.train()   # keep dropout layers active during inference
    tensor  = torch.from_numpy(x)
    samples = []

    with torch.no_grad():
        for _ in range(MC_SAMPLES):
            pred = model(tensor).numpy()[0]   # shape (HORIZON,)
            samples.append(pred * 5.0)        # un-normalise back to 1–5

    arr  = np.array(samples)           # (MC_SAMPLES, HORIZON)
    mean = arr.mean(axis=0).tolist()
    std  = arr.std(axis=0).tolist()
    return mean, std


def std_to_confidence(std: float) -> float:
    """
    Convert a standard deviation (spread of MC samples) to a 0–100 confidence.
    std ≈ 0   → near 95%
    std ≈ 1   → ~75%
    std ≈ 2+  → floors at 20%
    """
    return max(20.0, min(95.0, 95.0 - (std * 20.0)))


# ── Model loader ─────────────────────────────────────────────────────────────

def load_all_models():
    """Load every lstm_{id}.pt found in MODEL_DIR at server startup."""
    loaded = {}
    meta   = {}

    meta_path = os.path.join(MODEL_DIR, 'meta.json')
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            meta = json.load(f)

    if not os.path.isdir(MODEL_DIR):
        return loaded, meta

    for fname in os.listdir(MODEL_DIR):
        if not (fname.startswith('lstm_') and fname.endswith('.pt')):
            continue
        loc_id = int(fname[5:-3])
        m = CrowdLSTM()
        m.load_state_dict(
            torch.load(
                os.path.join(MODEL_DIR, fname),
                map_location='cpu',
                weights_only=True,
            )
        )
        m.eval()
        loaded[loc_id] = m
        print(f"  Loaded model for location {loc_id}")

    return loaded, meta


# ── FastAPI application ───────────────────────────────────────────────────────

app = FastAPI(
    title="CrowdLens LSTM Prediction Service",
    description="Serves per-location crowd density forecasts using trained LSTM models.",
    version="1.0.0",
)

# Global model registry — populated on startup
_models: dict[int, CrowdLSTM] = {}
_meta:   dict                  = {}


@app.on_event("startup")
async def on_startup():
    global _models, _meta
    print(f"Loading LSTM models from {MODEL_DIR}…")
    _models, _meta = load_all_models()
    if not _models:
        print("  WARNING: No trained models found.  Run train.py first.")
    else:
        print(f"  {len(_models)} model(s) ready: locations {sorted(_models.keys())}")


# ── Schemas ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    location_id: int
    hours_ahead: int = 6


class PredictResponse(BaseModel):
    predictions:       List[float]   # density scores 1–5, one per future hour
    confidence_scores: List[float]   # percentage 0–100 per slot
    model_available:   bool


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Return LSTM-based crowd density predictions for the next `hours_ahead` hours.

    The .NET ForecastController calls this endpoint and falls back to its own
    statistical model if this service is unavailable.
    """
    if req.location_id not in _models:
        raise HTTPException(
            status_code=404,
            detail=f"No trained LSTM model for location {req.location_id}.  "
                   f"Available: {sorted(_models.keys())}",
        )

    window = get_recent_window(req.location_id)
    if window is None:
        raise HTTPException(
            status_code=422,
            detail=f"Not enough recent data to build the {WINDOW}-hour input window.",
        )

    mean_scores, std_scores = mc_predict(_models[req.location_id], window)

    hours = min(req.hours_ahead, HORIZON)

    predictions       = [round(max(1.0, min(5.0, s)), 2) for s in mean_scores[:hours]]
    confidence_scores = [round(std_to_confidence(s), 1) for s in std_scores[:hours]]

    return PredictResponse(
        predictions=predictions,
        confidence_scores=confidence_scores,
        model_available=True,
    )


@app.get("/health")
def health():
    """Quick liveness check — also shows which location models are loaded."""
    return {
        "status":        "ok",
        "models_loaded": sorted(_models.keys()),
        "model_count":   len(_models),
    }
