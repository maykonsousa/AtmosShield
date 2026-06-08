"""Serviço de classificação: combina micro (sensor), macro (clima) e espacial (focos)."""
import logging
import joblib
import pandas as pd

from src.backend.config import MODEL_PATH, FOCOS_CSV
from src.backend.ml.features import FEATURE_COLUMNS, focus_metrics
from src.backend.ml.risk_rules import RISK_LABELS
from src.backend.pipelines.ingest_inpe import load_inpe
from src.backend.app.services.weather import get_weather
from src.backend.data_quality import flag_calibracao_solo

logger = logging.getLogger(__name__)


def load_model(path=MODEL_PATH):
    """Carrega o modelo treinado (joblib)."""
    return joblib.load(path)


def load_focos(path=FOCOS_CSV):
    """Carrega os focos do INPE para o cálculo espacial."""
    return load_inpe(str(path))


def score_reading(latitude, longitude, temperatura, umidade_ar, ppm_fumaca, model, focos_df) -> dict:
    """Enriquece a leitura do sensor com clima real e classifica o risco de alastramento."""
    densidade, dist = focus_metrics(latitude, longitude, focos_df)
    clima = get_weather(latitude, longitude)   # Forecast live (com cache+fallback)
    if flag_calibracao_solo(umidade_ar, clima.soil_moisture):
        logger.warning("Possível descalibração do sensor %s: umidade_ar=%.1f%% vs soil_moisture=%.2f",
                       "device", umidade_ar, clima.soil_moisture)
    row = pd.DataFrame([{
        "temperatura": temperatura,
        "umidade_ar": umidade_ar,
        "ppm_fumaca": ppm_fumaca,
        "vento_kmh": clima.wind_kmh,
        "densidade_focos": densidade,
        "dist_foco_km": dist,
        "precipitation_mm": clima.precipitation_mm,
    }])[FEATURE_COLUMNS]
    risco = int(model.predict(row)[0])
    return {
        "vento_kmh": float(clima.wind_kmh),
        "precipitation_mm": float(clima.precipitation_mm),
        "vento_fonte": clima.fonte,
        "densidade_focos": int(densidade),
        "dist_foco_km": float(dist),
        "risco": risco,
        "risco_label": RISK_LABELS[risco],
    }
