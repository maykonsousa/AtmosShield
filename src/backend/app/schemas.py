"""Modelos Pydantic do contrato da API AtmosShield."""
from pydantic import BaseModel


class Leitura(BaseModel):
    temperatura: float
    umidade_ar: float
    ppm_fumaca: float


class Coordenadas(BaseModel):
    latitude: float
    longitude: float


class SensorReadingIn(BaseModel):
    device_id: str
    api_key: str
    leitura: Leitura
    coordenadas: Coordenadas


class RiskAlertOut(BaseModel):
    device_id: str
    latitude: float
    longitude: float
    temperatura: float
    umidade_ar: float
    ppm_fumaca: float
    vento_kmh: float
    densidade_focos: int
    dist_foco_km: float
    risco: int
    risco_label: str
    is_outlier: bool
    received_at: str
