"""Engenharia de features espaciais e climáticas para o modelo de risco."""
import math
import pandas as pd

FEATURE_COLUMNS = ["temperatura", "umidade_ar", "ppm_fumaca", "vento_kmh", "densidade_focos", "dist_foco_km", "precipitation_mm"]

_EARTH_RADIUS_KM = 6371.0
_FAR_AWAY_KM = 9999.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em km entre dois pontos (lat/lon em graus)."""
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def focus_metrics(lat: float, lon: float, focos_df: pd.DataFrame, radius_km: float = 10.0) -> tuple[int, float]:
    """Retorna (densidade de focos no raio, distância ao foco mais próximo em km)."""
    if focos_df.empty:
        return 0, _FAR_AWAY_KM
    dists = focos_df.apply(lambda r: haversine_km(lat, lon, r["latitude"], r["longitude"]), axis=1)
    densidade = int((dists <= radius_km).sum())
    return densidade, float(dists.min())


def build_features(readings_df: pd.DataFrame, focos_df: pd.DataFrame, radius_km: float = 10.0) -> pd.DataFrame:
    """Adiciona `densidade_focos` e `dist_foco_km` a partir das coordenadas de cada leitura."""
    out = readings_df.copy()
    metrics = out.apply(lambda r: focus_metrics(r["latitude"], r["longitude"], focos_df, radius_km), axis=1)
    out["densidade_focos"] = [m[0] for m in metrics]
    out["dist_foco_km"] = [m[1] for m in metrics]
    return out
