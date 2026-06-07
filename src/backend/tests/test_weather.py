from src.backend.app.services.weather import estimate_wind_kmh


def test_determinismo_por_coordenada():
    assert estimate_wind_kmh(-3.5, -52.4) == estimate_wind_kmh(-3.5, -52.4)


def test_faixa_plausivel():
    v = estimate_wind_kmh(-3.5, -52.4)
    assert isinstance(v, float)
    assert 0.0 <= v <= 50.0


import src.backend.app.services.weather as weather
from src.backend.app.services.weather import get_weather, WeatherObservation


def _fake_forecast_payload():
    return {
        "current": {"wind_speed_10m": 23.4},
        "hourly": {
            "precipitation": [0.0, 0.5, 1.0, 0.0, 2.0, 0.5, 9.9, 9.9],
            "soil_moisture_0_to_1cm": [0.21, 0.20, 0.20, 0.19, 0.19, 0.18, 0.18, 0.18],
        },
    }


def test_forecast_parseia_vento_precip_6h_e_solo(monkeypatch):
    monkeypatch.setattr(weather, "_fetch", lambda url, params: _fake_forecast_payload())
    obs = get_weather(-3.5, -52.4)
    assert isinstance(obs, WeatherObservation)
    assert obs.wind_kmh == 23.4
    assert obs.precipitation_mm == 4.0   # soma das 6 primeiras horas
    assert obs.soil_moisture == 0.21
    assert obs.fonte == "open-meteo"
