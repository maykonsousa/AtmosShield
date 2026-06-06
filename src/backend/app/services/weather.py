"""Camada macro: estimativa de vento como proxy do feed de satélite/meteorologia.

Numa versão de produção, viria de uma API meteorológica/satelital por coordenada.
Na POC, devolve um valor determinístico e reproduzível em função da localização.
"""


def estimate_wind_kmh(latitude: float, longitude: float) -> float:
    """Vento estimado (km/h) para uma coordenada — determinístico na POC."""
    base = (abs(latitude) * 1.7 + abs(longitude) * 0.9) % 35.0
    return round(5.0 + base, 1)  # faixa ~5..40 km/h
