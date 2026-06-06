"""Persistência SQLite das leituras classificadas."""
import sqlite3
from pathlib import Path

from src.backend import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    received_at TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    temperatura REAL,
    umidade_ar REAL,
    ppm_fumaca REAL,
    vento_kmh REAL,
    densidade_focos INTEGER,
    dist_foco_km REAL,
    risco INTEGER,
    risco_label TEXT,
    is_outlier INTEGER
);
"""

_COLUMNS = [
    "device_id", "received_at", "latitude", "longitude", "temperatura", "umidade_ar",
    "ppm_fumaca", "vento_kmh", "densidade_focos", "dist_foco_km", "risco", "risco_label", "is_outlier",
]


def get_conn(db_path=None) -> sqlite3.Connection:
    """Abre conexão SQLite. Sem argumento, usa config.db_path() (respeita ATMOSSHIELD_DB)."""
    path = Path(db_path) if db_path is not None else config.db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def insert_reading(conn: sqlite3.Connection, alert: dict) -> int:
    placeholders = ", ".join(["?"] * len(_COLUMNS))
    cur = conn.execute(
        f"INSERT INTO readings ({', '.join(_COLUMNS)}) VALUES ({placeholders})",
        tuple(alert[c] for c in _COLUMNS),
    )
    conn.commit()
    return cur.lastrowid


def fetch_recent(conn: sqlite3.Connection, limit: int = 100, risco: int | None = None) -> list[dict]:
    if risco is None:
        cur = conn.execute("SELECT * FROM readings ORDER BY id DESC LIMIT ?", (limit,))
    else:
        cur = conn.execute(
            "SELECT * FROM readings WHERE risco = ? ORDER BY id DESC LIMIT ?", (risco, limit)
        )
    return [dict(r) for r in cur.fetchall()]


def stats_by_risk(conn: sqlite3.Connection) -> dict:
    cur = conn.execute("SELECT risco_label, COUNT(*) AS c FROM readings GROUP BY risco_label")
    por_risco = {row["risco_label"]: row["c"] for row in cur.fetchall()}
    outliers = conn.execute("SELECT COUNT(*) AS c FROM readings WHERE is_outlier = 1").fetchone()["c"]
    return {"por_risco": por_risco, "total": sum(por_risco.values()), "outliers": outliers}


def last_reading_for_device(conn: sqlite3.Connection, device_id: str):
    cur = conn.execute(
        "SELECT * FROM readings WHERE device_id = ? ORDER BY id DESC LIMIT 1", (device_id,)
    )
    return cur.fetchone()
