import folium
import pandas as pd
from src.analysis.visuals import (
    build_risk_heatmap, plot_confusion_matrix, plot_feature_importance, plot_risk_distribution,
)

FOCOS = pd.DataFrame({"latitude": [-3.5, -5.8], "longitude": [-52.4, -53.0], "municipio": ["A", "B"]})
ALERTS = [
    {"device_id": "n1", "latitude": -3.5, "longitude": -52.4, "risco": 2, "risco_label": "Critico"},
    {"device_id": "n2", "latitude": -5.8, "longitude": -53.0, "risco": 0, "risco_label": "Baixo"},
]
METRICS = {
    "confusion_matrix": [[10, 0, 0], [0, 5, 1], [0, 1, 8]],
    "feature_importances": {
        "temperatura": 0.70, "vento_kmh": 0.10, "umidade_ar": 0.05,
        "ppm_fumaca": 0.05, "dist_foco_km": 0.05, "densidade_focos": 0.05,
    },
}


def test_heatmap_retorna_mapa_folium():
    m = build_risk_heatmap(FOCOS, ALERTS)
    assert isinstance(m, folium.Map)


def test_confusion_matrix_gera_imagem(tmp_path):
    p = plot_confusion_matrix(METRICS, tmp_path / "cm.png")
    assert p.exists() and p.stat().st_size > 0


def test_feature_importance_gera_imagem(tmp_path):
    p = plot_feature_importance(METRICS, tmp_path / "fi.png")
    assert p.exists() and p.stat().st_size > 0


def test_risk_distribution_gera_imagem(tmp_path):
    p = plot_risk_distribution(ALERTS, tmp_path / "rd.png")
    assert p.exists() and p.stat().st_size > 0
