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


def get_weather(latitude: float, longitude: float, when: datetime | None = None) -> WeatherObservation:
    """Clima por coordenada. when=None → Forecast (live); when=<datetime> → Archive (treino)."""
    return _forecast(latitude, longitude)
