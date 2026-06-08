"""Guarda de regressão sobre o artefato de métricas commitado (modelo real treinado)."""
import json

from src.backend.config import METRICS_PATH
from src.backend.ml.features import FEATURE_COLUMNS


def test_artefato_tem_importancia_de_todas_as_features():
    metrics = json.loads(METRICS_PATH.read_text())
    importances = metrics["feature_importances"]
    # toda feature do modelo deve aparecer e pesar > 0 (RandomForest distribui a importância;
    # vento_kmh e precipitation_mm — os dados reais da Open-Meteo — não podem zerar)
    assert set(importances.keys()) == set(FEATURE_COLUMNS)
    assert all(v > 0 for v in importances.values()), importances


def test_artefato_acuracia_em_faixa_crivel():
    metrics = json.loads(METRICS_PATH.read_text())
    assert 0.80 <= metrics["accuracy"] <= 0.97
