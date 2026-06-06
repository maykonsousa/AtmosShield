import pytest
from pydantic import ValidationError
from src.backend.app.schemas import SensorReadingIn, RiskAlertOut


def test_parse_payload_valido():
    m = SensorReadingIn(
        device_id="ESP32-PRIV-092",
        api_key="atm_shield_secure_token_abc123",
        leitura={"temperatura": 41.8, "umidade_ar": 14.2, "ppm_fumaca": 380},
        coordenadas={"latitude": -3.4712, "longitude": -52.3812},
    )
    assert m.leitura.temperatura == 41.8
    assert m.coordenadas.latitude == -3.4712


def test_payload_incompleto_falha():
    with pytest.raises(ValidationError):
        SensorReadingIn(device_id="x", api_key="y", leitura={"temperatura": 40})  # faltam campos + coordenadas


def test_risk_alert_out_aceita_contrato_completo():
    a = RiskAlertOut(
        device_id="d", latitude=-3.4, longitude=-52.3, temperatura=40.0, umidade_ar=20.0,
        ppm_fumaca=300.0, vento_kmh=22.0, densidade_focos=2, dist_foco_km=1.5,
        risco=2, risco_label="Critico", is_outlier=False, received_at="2026-06-05T12:00:00+00:00",
    )
    assert a.risco_label == "Critico"
