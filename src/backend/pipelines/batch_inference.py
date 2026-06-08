"""Inferência em lote: classifica leituras e escreve data/alerts.json."""
import json

import joblib
import pandas as pd

from src.backend.ml.features import FEATURE_COLUMNS
from src.backend.ml.risk_rules import RISK_LABELS
from src.backend.config import ALERTS_JSON as ALERTS_PATH, MODEL_PATH, FOCOS_CSV


def run_batch(model, df: pd.DataFrame) -> list[dict]:
    """Prediz o risco de cada leitura e devolve uma lista de alertas serializáveis."""
    preds = model.predict(df[FEATURE_COLUMNS])
    alerts = []
    for (_, row), risco in zip(df.iterrows(), preds):
        risco = int(risco)
        alerts.append(
            {
                "device_id": row["device_id"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "temperatura": float(row["temperatura"]),
                "umidade_ar": float(row["umidade_ar"]),
                "ppm_fumaca": float(row["ppm_fumaca"]),
                "vento_kmh": float(row["vento_kmh"]),
                "precipitation_mm": float(row["precipitation_mm"]),
                "densidade_focos": int(row["densidade_focos"]),
                "risco": risco,
                "risco_label": RISK_LABELS[risco],
            }
        )
    return alerts


def main() -> None:
    from src.backend.pipelines.generate_simulation import generate_readings
    from src.backend.pipelines.ingest_inpe import load_inpe

    model = joblib.load(MODEL_PATH)
    focos = load_inpe(str(FOCOS_CSV))
    df = generate_readings(focos, n_nodes=80, seed=99)
    alerts = run_batch(model, df)
    ALERTS_PATH.write_text(json.dumps(alerts, indent=2, ensure_ascii=False))
    criticos = sum(1 for a in alerts if a["risco"] == 2)
    print(f"{len(alerts)} alertas escritos em {ALERTS_PATH} ({criticos} críticos)")


if __name__ == "__main__":
    main()
