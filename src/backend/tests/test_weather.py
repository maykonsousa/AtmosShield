import pytest
import httpx
from datetime import datetime

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


def _fake_archive_payload():
    return {
        "hourly": {
            "time": ["2025-08-12T14:00", "2025-08-12T15:00", "2025-08-12T16:00", "2025-08-12T17:00"],
            "wind_speed_10m": [10.0, 12.0, 31.5, 14.0],
            "precipitation": [0.0, 0.0, 0.0, 1.0],
            "soil_moisture_0_to_1cm": [0.10, 0.10, 0.09, 0.09],
        },
    }


def test_archive_seleciona_hora_mais_proxima(monkeypatch):
    captured = {}

    def fake_fetch(url, params):
        captured["url"] = url
        return _fake_archive_payload()

    monkeypatch.setattr(weather, "_fetch", fake_fetch)
    obs = get_weather(-3.4712, -52.3812, when=datetime(2025, 8, 12, 16, 20))
    assert captured["url"] == weather.ARCHIVE_URL          # usou Archive, não Forecast
    assert obs.wind_kmh == 31.5                            # hora 16:00 (mais próxima de 16:20)
    assert obs.precipitation_mm == 0.0
    assert obs.soil_moisture == 0.09
    assert obs.fonte == "open-meteo"


import pytest as _pytest_for_guard


def test_archive_times_vazio_estoura(monkeypatch):
    monkeypatch.setattr(weather, "_fetch", lambda url, params: {"hourly": {"time": [], "wind_speed_10m": [], "precipitation": [], "soil_moisture_0_to_1cm": []}})
    with _pytest_for_guard.raises(ValueError):
        get_weather(-3.5, -52.4, when=datetime(2025, 8, 12, 16, 20))


def test_archive_aceita_when_tz_aware(monkeypatch):
    from datetime import timezone
    monkeypatch.setattr(weather, "_fetch", lambda url, params: {
        "hourly": {
            "time": ["2025-08-12T15:00", "2025-08-12T16:00", "2025-08-12T17:00"],
            "wind_speed_10m": [12.0, 31.5, 14.0],
            "precipitation": [0.0, 0.0, 1.0],
            "soil_moisture_0_to_1cm": [0.10, 0.09, 0.09],
        }})
    obs = get_weather(-3.5, -52.4, when=datetime(2025, 8, 12, 16, 20, tzinfo=timezone.utc))
    assert obs.wind_kmh == 31.5


@pytest.fixture(autouse=True)
def _limpa_cache():
    weather._cache.clear()
    yield
    weather._cache.clear()


def test_falha_sem_cache_cai_no_stub(monkeypatch):
    def boom(url, params):
        raise httpx.ConnectError("sem rede")
    monkeypatch.setattr(weather, "_fetch", boom)
    obs = get_weather(-3.5, -52.4)
    assert obs.fonte == "estimado"
    assert obs.wind_kmh == weather.estimate_wind_kmh(-3.5, -52.4)
    assert obs.precipitation_mm == 0.0
    assert obs.soil_moisture is None


def test_falha_com_cache_valido_serve_do_cache(monkeypatch):
    monkeypatch.setattr(weather, "_clock", lambda: 1000.0)
    monkeypatch.setattr(weather, "_fetch", lambda url, params: _fake_forecast_payload())
    primeiro = get_weather(-3.5, -52.4)          # popula o cache, fonte open-meteo
    assert primeiro.fonte == "open-meteo"

    def boom(url, params):
        raise httpx.ConnectError("sem rede")
    monkeypatch.setattr(weather, "_fetch", boom)
    segundo = get_weather(-3.5, -52.4)           # API caiu, cache ainda válido
    assert segundo.fonte == "cache"
    assert segundo.wind_kmh == 23.4


def test_cache_expirado_cai_no_stub(monkeypatch):
    agora = {"t": 1000.0}
    monkeypatch.setattr(weather, "_clock", lambda: agora["t"])
    monkeypatch.setattr(weather, "_fetch", lambda url, params: _fake_forecast_payload())
    get_weather(-3.5, -52.4)                      # cache expira em 1000 + TTL
    agora["t"] = 1000.0 + weather._CACHE_TTL_S + 1
    monkeypatch.setattr(weather, "_fetch", lambda url, params: (_ for _ in ()).throw(httpx.ConnectError("x")))
    obs = get_weather(-3.5, -52.4)
    assert obs.fonte == "estimado"
