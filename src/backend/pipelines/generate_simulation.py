"""Gera leituras simuladas de nós ESP32 com rótulo de risco (ground truth).

Temp/umidade/fumaça são sintéticas por cenário (perto/longe de foco). O clima usa
um BASELINE climatológico real da Open-Meteo (Archive) na data/hora do foco e aplica
uma variação sintética por nó — assim vento e chuva variam de forma realista entre
sensores próximos, em vez de serem constantes por foco.
"""
import numpy as np
import pandas as pd

from src.backend.ml.features import build_features
from src.backend.ml.risk_rules import label_risk
from src.backend.app.services.weather import get_weather, WeatherObservation


def generate_readings(focos_df: pd.DataFrame, n_nodes: int = 40, seed: int = 42) -> pd.DataFrame:
    """Cria `n_nodes` leituras de sensores. ~Metade próxima a focos (cenário quente)."""
    rng = np.random.default_rng(seed)
    focos = focos_df.reset_index(drop=True)
    clima_por_foco: dict[int, WeatherObservation] = {}   # baseline real memoizado por foco
    rows = []
    for i in range(n_nodes):
        perto_de_foco = i % 2 == 0
        idx = int(rng.integers(0, len(focos)))
        base = focos.iloc[idx]
        if idx not in clima_por_foco:
            when = base["datahora_gmt"] if "datahora_gmt" in focos.columns else None
            when = when.to_pydatetime() if hasattr(when, "to_pydatetime") else when
            clima_por_foco[idx] = get_weather(float(base["latitude"]), float(base["longitude"]), when=when)
        clima = clima_por_foco[idx]   # baseline climatológico real do foco

        if perto_de_foco:
            lat = base["latitude"] + rng.normal(0, 0.03)
            lon = base["longitude"] + rng.normal(0, 0.03)
            temperatura = rng.uniform(36, 46)
            umidade_ar = rng.uniform(12, 30)
            ppm_fumaca = rng.uniform(200, 500)
            # cenário quente: tende a ventar mais que o baseline, quase sem chuva
            vento_kmh = float(np.clip(clima.wind_kmh + rng.uniform(0, 20), 2, 60))
            # NOTE: faixas de chuva calibradas aos limiares de label_risk (>=5mm -2, >=15mm -4)
            if rng.random() < 0.30:
                # foco quente sob chuva forte → a precipitação suprime o risco (cenário-alvo da issue)
                precipitation_mm = max(0.0, clima.precipitation_mm + rng.uniform(15, 30))
            else:
                precipitation_mm = max(0.0, clima.precipitation_mm + rng.uniform(0, 4))
        else:
            lat = base["latitude"] + rng.normal(0, 0.6)
            lon = base["longitude"] + rng.normal(0, 0.6)
            temperatura = rng.uniform(20, 34)
            umidade_ar = rng.uniform(40, 85)
            ppm_fumaca = rng.uniform(20, 130)
            # cenário ameno: vento em torno do baseline, chuva eventual
            vento_kmh = float(np.clip(clima.wind_kmh + rng.uniform(-8, 6), 2, 60))
            chuva_extra = rng.uniform(8, 25) if rng.random() < 0.35 else 0.0
            precipitation_mm = max(0.0, clima.precipitation_mm + chuva_extra)
        rows.append({
            "device_id": f"ESP32-SIM-{i:03d}",
            "latitude": round(float(lat), 5),
            "longitude": round(float(lon), 5),
            "temperatura": round(float(temperatura), 1),
            "umidade_ar": round(float(umidade_ar), 1),
            "ppm_fumaca": round(float(ppm_fumaca), 1),
            "vento_kmh": round(float(vento_kmh), 1),
            "precipitation_mm": round(float(precipitation_mm), 2),
        })
    df = build_features(pd.DataFrame(rows), focos, radius_km=10.0)
    df["risco"] = df.apply(
        lambda r: label_risk(r["temperatura"], r["umidade_ar"], r["ppm_fumaca"],
                             r["dist_foco_km"], r["vento_kmh"], r["precipitation_mm"]),
        axis=1,
    )
    return df


if __name__ == "__main__":
    from src.backend.pipelines.ingest_inpe import load_inpe

    focos = load_inpe("data/inpe_focos_sample.csv")
    sim = generate_readings(focos, n_nodes=40, seed=42)
    print(sim["risco"].value_counts().sort_index())
