"""Serviço de classificação: combina micro (sensor), macro (vento) e espacial (focos)."""
import joblib
import pandas as pd

from src.backend.config import MODEL_PATH, FOCOS_CSV
from src.backend.ml.features import FEATURE_COLUMNS, focus_metrics
from src.backend.ml.risk_rules import RISK_LABELS
from src.backend.pipelines.ingest_inpe import load_inpe
from src.backend.app.services.weather import estimate_wind_kmh


def load_model(path=MODEL_PATH):
    """Carrega o modelo treinado (joblib)."""
    return joblib.load(path)


def load_focos(path=FOCOS_CSV):
    """Carrega os focos do INPE para o cálculo espacial."""
    return load_inpe(str(path))


def score_reading(latitude, longitude, temperatura, umidade_ar, ppm_fumaca, model, focos_df) -> dict:
    """Enriquece a leitura do sensor e classifica o risco de alastramento."""
    densidade, dist = focus_metrics(latitude, longitude, focos_df)
    vento = estimate_wind_kmh(latitude, longitude)
    row = pd.DataFrame([{
        "temperatura": temperatura,
        "umidade_ar": umidade_ar,
        "ppm_fumaca": ppm_fumaca,
        "vento_kmh": vento,
        "densidade_focos": densidade,
        "dist_foco_km": dist,
    }])[FEATURE_COLUMNS]
    risco = int(model.predict(row)[0])
    return {
        "vento_kmh": float(vento),
        "densidade_focos": int(densidade),
        "dist_foco_km": float(dist),
        "risco": risco,
        "risco_label": RISK_LABELS[risco],
    }
