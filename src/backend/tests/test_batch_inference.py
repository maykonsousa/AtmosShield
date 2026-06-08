import pandas as pd
import pytest
from src.backend.pipelines.batch_inference import run_batch
from src.backend.pipelines.generate_simulation import generate_readings
from src.backend.pipelines.train_model import train
import src.backend.pipelines.generate_simulation as gensim
from src.backend.app.services.weather import WeatherObservation


def _focos():
    return pd.DataFrame({
        "latitude": [-3.50, -5.78, -12.54],
        "longitude": [-52.38, -53.00, -55.72],
        "datahora_gmt": pd.to_datetime(["2025-08-12 16:00", "2025-08-13 14:00", "2025-08-14 12:00"]),
    })


@pytest.fixture(autouse=True)
def _mock_weather(monkeypatch):
    # vento alto + sem chuva → mantém variedade de risco; offline
    monkeypatch.setattr(gensim, "get_weather",
                        lambda lat, lon, when=None: WeatherObservation(wind_kmh=28.0, precipitation_mm=0.0, soil_moisture=0.12, fonte="open-meteo"))


def test_run_batch_gera_alertas():
    df = generate_readings(_focos(), n_nodes=120, seed=42)
    model, _ = train(df)
    alerts = run_batch(model, df)
    assert len(alerts) == len(df)
    primeiro = alerts[0]
    assert {"device_id", "latitude", "longitude", "vento_kmh", "precipitation_mm", "risco", "risco_label"}.issubset(primeiro.keys())
    assert primeiro["risco_label"] in {"Baixo", "Moderado", "Critico"}
    assert primeiro["risco"] in {0, 1, 2}
