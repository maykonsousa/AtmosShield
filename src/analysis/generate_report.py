"""Gera todas as visualizações do AtmosShield em docs/images/."""
import json

from src.backend.config import FOCOS_CSV, ALERTS_JSON, METRICS_PATH, IMAGES_DIR
from src.backend.pipelines.ingest_inpe import load_inpe
from src.analysis.visuals import (
    build_risk_heatmap, plot_confusion_matrix, plot_feature_importance, plot_risk_distribution,
)


def main() -> None:
    focos = load_inpe(str(FOCOS_CSV))
    alerts = json.loads(ALERTS_JSON.read_text())
    metrics = json.loads(METRICS_PATH.read_text())

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    build_risk_heatmap(focos, alerts).save(str(IMAGES_DIR / "mapa_calor.html"))
    plot_confusion_matrix(metrics, IMAGES_DIR / "matriz_confusao.png")
    plot_feature_importance(metrics, IMAGES_DIR / "feature_importance.png")
    plot_risk_distribution(alerts, IMAGES_DIR / "distribuicao_risco.png")
    print(f"Visualizações geradas em {IMAGES_DIR}")


if __name__ == "__main__":
    main()
