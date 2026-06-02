"""
CrowdLens — LSTM Training Script
=================================
Trains one LSTM model per location using the historical ForecastRecords stored
in crowdlens.db, then saves each model to ml/models/lstm_{location_id}.pt.

Architecture
------------
Input  : sequence of 24 hourly readings, 5 features each
         [score_norm, hour_sin, hour_cos, dow_sin, dow_cos]
Output : next HORIZON (6) normalised density scores
Model  : LSTM(64 hidden, 2 layers, dropout=0.2) → FC(32) → FC(6)

Usage
-----
  cd Crowdlens-backend/ml
  pip install -r requirements.txt
  python train.py

Outputs
-------
  models/lstm_{id}.pt    — trained weights for each location
  models/meta.json       — validation metrics (RMSE, sample count)
"""

import os
import json
import math
import sqlite3
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split

# ── Hyper-parameters ──────────────────────────────────────────────────────────
WINDOW    = 24      # hours of history fed into the LSTM
HORIZON   = 6       # hours ahead to predict
HIDDEN    = 64      # LSTM hidden units
LAYERS    = 2       # stacked LSTM layers
DROPOUT   = 0.2
LR        = 1e-3
EPOCHS    = 80
PATIENCE  = 12      # early-stopping patience (epochs without improvement)
BATCH     = 64
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DB_PATH   = os.path.join(BASE_DIR, '..', 'crowdlens.db')
MODEL_DIR = os.path.join(BASE_DIR, 'models')


# ── Feature engineering ───────────────────────────────────────────────────────

def cyclic_encode(value: float, period: float):
    """
    Encode a cyclic integer (hour 0-23, weekday 0-6) as a (sin, cos) pair
    so the model sees that hour 23 is adjacent to hour 0.
    """
    rad = 2 * math.pi * value / period
    return math.sin(rad), math.cos(rad)


# ── Data loading ──────────────────────────────────────────────────────────────

def load_sequences(db_path: str, location_id: int):
    """
    Read all ForecastRecord rows for one location, sort by time, and build
    overlapping (input-window, target-horizon) pairs.

    Returns
    -------
    X : ndarray (N, WINDOW, 5)   — input sequences
    y : ndarray (N, HORIZON)     — target sequences (normalised 0-1)
    Returns (None, None) when there are fewer than WINDOW + HORIZON rows.
    """
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        """
        SELECT RecordedAt, DensityScore
        FROM   ForecastRecords
        WHERE  LocationId = ?
        ORDER  BY RecordedAt ASC
        """,
        (location_id,),
    ).fetchall()
    conn.close()

    if len(rows) < WINDOW + HORIZON:
        return None, None

    X, y = [], []
    for i in range(len(rows) - WINDOW - HORIZON + 1):
        seq = []
        for j in range(WINDOW):
            ts_str, score = rows[i + j]
            ts = datetime.fromisoformat(ts_str)
            h_sin, h_cos = cyclic_encode(ts.hour,     24)
            d_sin, d_cos = cyclic_encode(ts.weekday(), 7)
            seq.append([score / 5.0, h_sin, h_cos, d_sin, d_cos])

        target = [rows[i + WINDOW + k][1] / 5.0 for k in range(HORIZON)]
        X.append(seq)
        y.append(target)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


# ── Model definition ──────────────────────────────────────────────────────────

class CrowdLSTM(nn.Module):
    """
    Two-layer LSTM that ingests a 24-hour feature window and outputs a
    6-step density forecast.  Dropout is applied between LSTM layers and
    kept active during inference for Monte Carlo uncertainty estimation.
    """

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
        return self.head(out[:, -1, :])   # use the last hidden state only


# ── Training loop ─────────────────────────────────────────────────────────────

def train_one(X: np.ndarray, y: np.ndarray, location_id: int):
    """Train and return the best model found with early stopping."""

    X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.15, random_state=42)

    tr_dl  = DataLoader(TensorDataset(torch.from_numpy(X_tr),  torch.from_numpy(y_tr)),
                        batch_size=BATCH, shuffle=True)
    val_dl = DataLoader(TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val)),
                        batch_size=BATCH)

    model     = CrowdLSTM()
    optimiser = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.MSELoss()

    best_val_loss  = float('inf')
    patience_count = 0
    best_state     = None

    for epoch in range(1, EPOCHS + 1):
        # ---- train ----
        model.train()
        for xb, yb in tr_dl:
            optimiser.zero_grad()
            criterion(model(xb), yb).backward()
            optimiser.step()

        # ---- validate ----
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for xb, yb in val_dl:
                val_loss += criterion(model(xb), yb).item()
        val_loss /= len(val_dl)

        # ---- early stopping ----
        if val_loss < best_val_loss:
            best_val_loss  = val_loss
            patience_count = 0
            best_state     = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            patience_count += 1

        if epoch % 10 == 0:
            print(f"  loc {location_id:2d} | epoch {epoch:3d} | val_loss={val_loss:.5f}")

        if patience_count >= PATIENCE:
            print(f"  Early stop at epoch {epoch}  (best val_loss={best_val_loss:.5f})")
            break

    model.load_state_dict(best_state)
    return model, best_val_loss


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    conn         = sqlite3.connect(DB_PATH)
    location_ids = [r[0] for r in conn.execute("SELECT Id FROM Locations").fetchall()]
    conn.close()

    if not location_ids:
        print("No locations found in database.  Run the .NET backend first to seed data.")
        return

    all_meta = {}

    for lid in location_ids:
        print(f"\n{'='*50}")
        print(f"Training LSTM for location ID={lid}…")

        X, y = load_sequences(DB_PATH, lid)

        if X is None or len(X) < 50:
            print(f"  Skipping — not enough data ({0 if X is None else len(X)} samples).")
            continue

        print(f"  {len(X)} training sequences  |  input shape {X.shape}")
        model, val_mse = train_one(X, y, lid)

        out_path = os.path.join(MODEL_DIR, f'lstm_{lid}.pt')
        torch.save(model.state_dict(), out_path)

        all_meta[str(lid)] = {
            'val_mse'  : round(float(val_mse), 6),
            'val_rmse' : round(float(val_mse ** 0.5), 4),
            'samples'  : int(len(X)),
        }
        rmse = all_meta[str(lid)]['val_rmse']
        print(f"  Saved → {out_path}   val RMSE={rmse}  (on 0-1 scale → ×5 = {rmse*5:.3f} density levels)")

    meta_path = os.path.join(MODEL_DIR, 'meta.json')
    with open(meta_path, 'w') as f:
        json.dump(all_meta, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Done.  Models saved to {MODEL_DIR}/")
    print(f"Meta  saved to {meta_path}")
    print("\nNext: start the prediction server with  uvicorn serve:app --port 8000")


if __name__ == '__main__':
    main()
