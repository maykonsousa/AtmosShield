"""Gera leituras simuladas de nós ESP32 com rótulo de risco (ground truth)."""
import numpy as np
import pandas as pd

from src.backend.ml.features import build_features
from src.backend.ml.risk_rules import label_risk


def generate_readings(focos_df: pd.DataFrame, n_nodes: int = 40, seed: int = 42) -> pd.DataFrame:
    """Cria `n_nodes` leituras de sensores. ~Metade próxima a focos (cenário quente)."""
    rng = np.random.default_rng(seed)
    focos = focos_df.reset_index(drop=True)
    rows = []
    for i in range(n_nodes):
        perto_de_foco = i % 2 == 0  # alterna nós quentes e nós normais
        base = focos.iloc[rng.integers(0, len(focos))]
        if perto_de_foco:
            lat = base["latitude"] + rng.normal(0, 0.03)   # ~3 km
            lon = base["longitude"] + rng.normal(0, 0.03)
            temperatura = rng.uniform(36, 46)
            umidade_ar = rng.uniform(12, 30)
            ppm_fumaca = rng.uniform(200, 500)
            vento_kmh = rng.uniform(15, 40)
        else:
            lat = base["latitude"] + rng.normal(0, 0.6)    # ~60 km, longe
            lon = base["longitude"] + rng.normal(0, 0.6)
            temperatura = rng.uniform(20, 34)
            umidade_ar = rng.uniform(40, 85)
            ppm_fumaca = rng.uniform(20, 130)
            vento_kmh = rng.uniform(2, 20)
        rows.append(
            {
                "device_id": f"ESP32-SIM-{i:03d}",
                "latitude": round(float(lat), 5),
                "longitude": round(float(lon), 5),
                "temperatura": round(float(temperatura), 1),
                "umidade_ar": round(float(umidade_ar), 1),
                "ppm_fumaca": round(float(ppm_fumaca), 1),
                "vento_kmh": round(float(vento_kmh), 1),
            }
        )
    df = build_features(pd.DataFrame(rows), focos, radius_km=10.0)
    df["risco"] = df.apply(
        lambda r: label_risk(r["temperatura"], r["umidade_ar"], r["ppm_fumaca"], r["dist_foco_km"], r["vento_kmh"]), axis=1
    )
    return df


if __name__ == "__main__":
    from src.backend.pipelines.ingest_inpe import load_inpe

    focos = load_inpe("data/inpe_focos_sample.csv")
    sim = generate_readings(focos, n_nodes=40, seed=42)
    print(sim["risco"].value_counts().sort_index())
