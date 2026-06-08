import pandas as pd
import pytest
import src.backend.pipelines.generate_simulation as gensim
from src.backend.pipelines.generate_simulation import generate_readings
from src.backend.ml.features import FEATURE_COLUMNS
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


def test_determinismo_por_seed():
    a = generate_readings(_focos(), n_nodes=30, seed=42)
    b = generate_readings(_focos(), n_nodes=30, seed=42)
    pd.testing.assert_frame_equal(a, b)


def test_tem_colunas_e_target():
    df = generate_readings(_focos(), n_nodes=30, seed=42)
    assert len(df) == 30
    assert set(FEATURE_COLUMNS).issubset(df.columns)
    assert {"device_id", "latitude", "longitude", "risco"}.issubset(df.columns)
    assert set(df["risco"].unique()).issubset({0, 1, 2})


def test_gera_variedade_de_risco():
    # com nós perto e longe de focos, espera-se mais de uma classe de risco
    df = generate_readings(_focos(), n_nodes=60, seed=7)
    assert df["risco"].nunique() >= 2


def test_inclui_coluna_precipitation_mm():
    df = generate_readings(_focos(), n_nodes=10, seed=1)
    assert "precipitation_mm" in df.columns
    assert "vento_kmh" in df.columns
