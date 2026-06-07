"""Camada macro de clima: Open-Meteo (real) com fallback determinístico.

Forecast API no fluxo live (condições atuais + precipitação das próximas horas);
Archive API no treino (clima histórico na data/hora do foco). Em falha de rede,
o live cai para cache válido e, por fim, para o stub determinístico.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime

import httpx

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

_TIMEOUT_S = 5.0
_CACHE_TTL_S = 15 * 60          # 15 min
_PRECIP_WINDOW_H = 6           # soma de precipitação das próximas horas (live)

_clock = time.monotonic        # injetável em teste
_cache: dict[tuple[float, float], tuple["WeatherObservation", float]] = {}


@dataclass
class WeatherObservation:
    wind_kmh: float
    precipitation_mm: float
    soil_moisture: float | None
    fonte: str                 # "open-meteo" | "cache" | "estimado"


def estimate_wind_kmh(latitude: float, longitude: float) -> float:
    """Vento estimado (km/h) — fallback determinístico e reproduzível."""
    base = (abs(latitude) * 1.7 + abs(longitude) * 0.9) % 35.0
    return round(5.0 + base, 1)  # faixa ~5..40 km/h


def _fetch(url: str, params: dict) -> dict:
    """GET JSON na Open-Meteo. Isolado para ser mockado em teste."""
    resp = httpx.get(url, params=params, timeout=_TIMEOUT_S)
    resp.raise_for_status()
    return resp.json()


def _forecast(lat: float, lon: float) -> WeatherObservation:
    data = _fetch(FORECAST_URL, {
        "latitude": lat, "longitude": lon,
        "current": "wind_speed_10m",
        "hourly": "precipitation,soil_moisture_0_to_1cm",
        "forecast_days": 1,
    })
    wind = float(data["current"]["wind_speed_10m"])
    precs = data["hourly"]["precipitation"][:_PRECIP_WINDOW_H]
    precip = float(sum(p for p in precs if p is not None))
    soils = data["hourly"].get("soil_moisture_0_to_1cm") or []
    soil = float(soils[0]) if soils and soils[0] is not None else None
    return WeatherObservation(round(wind, 1), round(precip, 2), soil, "open-meteo")


def _closest_hour_index(times: list[str], when: datetime) -> int:
    if not times:
        raise ValueError("Archive API returned no hourly timestamps for the requested date")
    target = when.replace(tzinfo=None, minute=0, second=0, microsecond=0)
    parsed = [datetime.fromisoformat(t) for t in times]
    return min(range(len(parsed)), key=lambda i: abs((parsed[i] - target).total_seconds()))


def _archive(lat: float, lon: float, when: datetime) -> WeatherObservation:
    day = when.date().isoformat()
    data = _fetch(ARCHIVE_URL, {
        "latitude": lat, "longitude": lon,
        "start_date": day, "end_date": day,
        "hourly": "wind_speed_10m,precipitation,soil_moisture_0_to_1cm",
    })
    h = data["hourly"]
    idx = _closest_hour_index(h["time"], when)
    wind = float(h["wind_speed_10m"][idx])
    precip = float(h["precipitation"][idx] or 0.0)
    soils = h.get("soil_moisture_0_to_1cm") or []
    soil = float(soils[idx]) if idx < len(soils) and soils[idx] is not None else None
    return WeatherObservation(round(wind, 1), round(precip, 2), soil, "open-meteo")


def get_weather(latitude: float, longitude: float, when: datetime | None = None) -> WeatherObservation:
    """Clima por coordenada. when=None → Forecast (live, com cache+fallback);
    when=<datetime> → Archive (treino, sem fallback — estoura para rerodar)."""
    if when is not None:
        return _archive(latitude, longitude, when)

    key = (round(latitude, 3), round(longitude, 3))
    try:
        obs = _forecast(latitude, longitude)
        _cache[key] = (obs, _clock() + _CACHE_TTL_S)
        return obs
    except Exception:
        cached = _cache.get(key)
        if cached is not None and cached[1] > _clock():
            o = cached[0]
            return WeatherObservation(o.wind_kmh, o.precipitation_mm, o.soil_moisture, "cache")
        return WeatherObservation(estimate_wind_kmh(latitude, longitude), 0.0, None, "estimado")
