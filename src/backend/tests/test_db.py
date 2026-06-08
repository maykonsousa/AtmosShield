from src.backend.app import db


def _alert(device_id="ESP32-PRIV-092", temperatura=44.0, ppm_fumaca=420.0, is_outlier=0):
    return {
        "device_id": device_id, "received_at": "2026-06-05T12:00:00+00:00",
        "latitude": -3.4712, "longitude": -52.3812,
        "temperatura": temperatura, "umidade_ar": 16.0, "ppm_fumaca": ppm_fumaca,
        "vento_kmh": 22.0, "vento_fonte": "open-meteo", "precipitation_mm": 0.12,
        "densidade_focos": 2, "dist_foco_km": 1.5,
        "risco": 2, "risco_label": "Critico", "is_outlier": is_outlier,
    }


def test_insert_e_fetch_roundtrip(tmp_path):
    conn = db.get_conn(tmp_path / "t.db")
    db.init_db(conn)
    rid = db.insert_reading(conn, _alert())
    assert rid == 1
    rows = db.fetch_recent(conn)
    assert len(rows) == 1
    assert rows[0]["device_id"] == "ESP32-PRIV-092"
    assert rows[0]["risco"] == 2
    conn.close()


def test_last_reading_for_device(tmp_path):
    conn = db.get_conn(tmp_path / "t.db")
    db.init_db(conn)
    db.insert_reading(conn, _alert(temperatura=25.0))
    db.insert_reading(conn, _alert(temperatura=44.0))
    last = db.last_reading_for_device(conn, "ESP32-PRIV-092")
    assert last["temperatura"] == 44.0
    assert db.last_reading_for_device(conn, "INEXISTENTE") is None
    conn.close()
