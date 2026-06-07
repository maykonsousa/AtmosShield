import pytest
import src.backend.app.services.scoring as scoring
from src.backend.app.services.scoring import load_model, load_focos, score_reading
from src.backend.app.services.weather import WeatherObservation


@pytest.fixture(autouse=True)
def _mock_weather(monkeypatch):
    monkeypatch.setattr(scoring, "get_weather",
                        lambda lat, lon, when=None: WeatherObservation(22.0, 0.0, 0.12, "open-meteo"))


def test_leitura_quente_perto_de_foco_classifica_alto():
    res = score_reading(
        latitude=-3.4712, longitude=-52.3812,
        temperatura=44.0, umidade_ar=16.0, ppm_fumaca=420.0,
        model=load_model(), focos_df=load_focos(),
    )
    assert res["risco"] == 2
    assert res["risco_label"] == "Critico"
    assert res["densidade_focos"] >= 1
    assert isinstance(res["vento_kmh"], float)
    assert isinstance(res["precipitation_mm"], float)
    assert res["vento_fonte"] == "open-meteo"


def test_leitura_fria_e_longe_classifica_baixo():
    res = score_reading(
        latitude=0.0, longitude=0.0,
        temperatura=24.0, umidade_ar=70.0, ppm_fumaca=30.0,
        model=load_model(), focos_df=load_focos(),
    )
    assert res["risco"] == 0
    assert res["risco_label"] == "Baixo"
