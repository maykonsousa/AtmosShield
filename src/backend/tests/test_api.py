import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ATMOSSHIELD_DB", str(tmp_path / "test.db"))
    from src.backend.app.main import app
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


VALID = {
    "device_id": "ESP32-PRIV-092",
    "api_key": "atm_shield_secure_token_abc123",
    "leitura": {"temperatura": 44.0, "umidade_ar": 16.0, "ppm_fumaca": 420.0},
    "coordenadas": {"latitude": -3.4712, "longitude": -52.3812},
}


def test_post_reading_valida_e_classifica(client):
    r = client.post("/readings", json=VALID)
    assert r.status_code == 200
    body = r.json()
    assert body["device_id"] == "ESP32-PRIV-092"
    assert body["risco"] in {0, 1, 2}
    assert body["risco_label"] in {"Baixo", "Moderado", "Critico"}
    assert "vento_kmh" in body and "received_at" in body


def test_post_reading_api_key_invalida_retorna_401(client):
    bad = {**VALID, "api_key": "errada"}
    r = client.post("/readings", json=bad)
    assert r.status_code == 401


def test_post_reading_detecta_outlier(client):
    base = {
        "device_id": "ESP32-PRIV-099", "api_key": "atm_shield_secure_token_abc123",
        "leitura": {"temperatura": 25.0, "umidade_ar": 50.0, "ppm_fumaca": 40.0},
        "coordenadas": {"latitude": 0.0, "longitude": 0.0},
    }
    client.post("/readings", json=base)
    spike = {**base, "leitura": {"temperatura": 150.0, "umidade_ar": 50.0, "ppm_fumaca": 45.0}}
    r = client.post("/readings", json=spike)
    assert r.json()["is_outlier"] is True


def test_get_alerts_inclui_leitura_postada(client):
    client.post("/readings", json=VALID)
    r = client.get("/alerts")
    assert r.status_code == 200
    arr = r.json()
    assert isinstance(arr, list)
    assert len(arr) >= 1
    assert any(a["device_id"] == "ESP32-PRIV-092" for a in arr)
    assert isinstance(arr[0]["is_outlier"], bool)


def test_get_stats(client):
    client.post("/readings", json=VALID)
    r = client.get("/stats")
    assert r.status_code == 200
    body = r.json()
    assert "por_risco" in body and "total" in body and "outliers" in body
    assert body["total"] >= 1


def test_get_alerts_filtra_por_risco(client):
    client.post("/readings", json=VALID)  # leitura quente => Critico (risco 2)
    r = client.get("/alerts", params={"risco": 2})
    assert r.status_code == 200
    arr = r.json()
    assert all(a["risco"] == 2 for a in arr)
