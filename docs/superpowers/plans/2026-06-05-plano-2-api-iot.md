# AtmosShield — Plano 2: API FastAPI + IoT ESP32/Wokwi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor o núcleo de ML do Plano 1 como uma API REST (FastAPI + SQLite) que recebe leituras de nós ESP32, valida o dispositivo por `api_key`, enriquece com a variável macro de vento, classifica o risco de alastramento e persiste alertas; e entregar o firmware do nó ESP32 simulado no Wokwi que envia o payload no contrato documentado.

**Architecture:** A API reusa os módulos puros do Plano 1 (`risk_rules`, `features`, `data_quality`, `ingest_inpe`) e o modelo treinado (`risk_model.joblib`). O ESP32 fornece os dados **micro** (temperatura, umidade, fumaça); a API adiciona a variável **macro** de vento via `services/weather.py` (stub determinístico que representa o feed de satélite/meteorologia) e as features espaciais via `focus_metrics` sobre os focos do INPE. O modelo é carregado uma vez no `lifespan`. SQLite persiste as leituras classificadas. O `flag_outliers` é plugado no `POST /readings` comparando com a última leitura do dispositivo.

**Tech Stack:** Python 3.11 (venv 3.12), FastAPI, Pydantic v2, SQLite (sqlite3 stdlib), joblib, pandas; firmware C++/Arduino no Wokwi (ESP32 + DHT22 + potenciômetro simulando MQ-2).

---

## File Structure

```
src/backend/
  config.py                       # caminhos centralizados (pacote, não CWD) + api_keys válidas
  app/
    __init__.py
    main.py                       # FastAPI app + lifespan (carrega modelo/focos) + routers
    db.py                         # SQLite: get_conn, init_db, insert_reading, fetch_recent, last_reading_for_device
    deps.py                       # dependência get_db (conexão por request)
    auth.py                       # is_valid_api_key
    schemas.py                    # Pydantic: Leitura, Coordenadas, SensorReadingIn, RiskAlertOut
    services/
      __init__.py
      weather.py                  # estimate_wind_kmh (camada macro / satélite — stub determinístico)
      scoring.py                  # load_model, load_focos, score_reading
    routers/
      __init__.py
      health.py                   # GET /health
      readings.py                 # POST /readings
      alerts.py                   # GET /alerts
  tests/
    test_schemas.py
    test_auth.py
    test_weather.py
    test_scoring_service.py
    test_db.py
    test_api.py
src/iot/wokwi/
  atmosshield_sensor.ino          # firmware ESP32
  diagram.json                    # circuito Wokwi
  wokwi.toml                      # config Wokwi
  libraries.txt                   # libs Arduino
  README.md                       # como rodar no Wokwi
```

Refactor incluído (carry-forward do Plano 1): `train_model.py` e `batch_inference.py` passam a importar caminhos de `config.py` em vez de hardcodar strings relativas ao CWD.

---

## Task 1: Config centralizado + refactor dos pipelines

**Files:**
- Create: `src/backend/config.py`
- Create (dirs/pacotes): `src/backend/app/__init__.py`, `src/backend/app/services/__init__.py`, `src/backend/app/routers/__init__.py`
- Modify: `src/backend/pipelines/train_model.py`, `src/backend/pipelines/batch_inference.py`

- [ ] **Step 1: Criar `src/backend/config.py`**

```python
"""Caminhos e configuração centralizados do AtmosShield (resolvidos pelo pacote, não pelo CWD)."""
import os
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent          # .../src/backend
REPO_ROOT = PACKAGE_ROOT.parent.parent                  # raiz do repositório

ARTIFACT_DIR = PACKAGE_ROOT / "ml" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "risk_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"

DATA_DIR = REPO_ROOT / "data"
FOCOS_CSV = DATA_DIR / "inpe_focos_sample.csv"
ALERTS_JSON = DATA_DIR / "alerts.json"

DEFAULT_DB_PATH = DATA_DIR / "atmosshield.db"


def db_path() -> Path:
    """Caminho do SQLite; a env var ATMOSSHIELD_DB permite apontar para um arquivo temporário em testes."""
    return Path(os.environ.get("ATMOSSHIELD_DB", str(DEFAULT_DB_PATH)))


# Dispositivos homologados (api_key -> descrição). POC: chaves estáticas.
VALID_API_KEYS = {
    "atm_shield_secure_token_abc123": "Sensor privado homologado",
    "atm_shield_anchor_gov_0001": "Sensor âncora governamental",
}
```

- [ ] **Step 2: Criar os pacotes do app**

Run:
```bash
mkdir -p src/backend/app/services src/backend/app/routers
touch src/backend/app/__init__.py src/backend/app/services/__init__.py src/backend/app/routers/__init__.py
```

- [ ] **Step 3: Refatorar `train_model.py` para usar `config`**

Em `src/backend/pipelines/train_model.py`, substitua o bloco de constantes:
```python
from src.backend.ml.features import FEATURE_COLUMNS

ARTIFACT_DIR = Path("src/backend/ml/artifacts")
MODEL_PATH = ARTIFACT_DIR / "risk_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"
```
por:
```python
from src.backend.ml.features import FEATURE_COLUMNS
from src.backend.config import ARTIFACT_DIR, MODEL_PATH, METRICS_PATH, FOCOS_CSV
```
E em `main()`, troque `load_inpe("data/inpe_focos_sample.csv")` por `load_inpe(str(FOCOS_CSV))`. (Remova o `from pathlib import Path` se ele ficar sem uso.)

- [ ] **Step 4: Refatorar `batch_inference.py` para usar `config`**

Em `src/backend/pipelines/batch_inference.py`, substitua:
```python
ALERTS_PATH = Path("data/alerts.json")
MODEL_PATH = Path("src/backend/ml/artifacts/risk_model.joblib")
```
por:
```python
from src.backend.config import ALERTS_JSON as ALERTS_PATH, MODEL_PATH, FOCOS_CSV
```
E em `main()`, troque `load_inpe("data/inpe_focos_sample.csv")` por `load_inpe(str(FOCOS_CSV))`. (Remova o `from pathlib import Path` se ficar sem uso.)

- [ ] **Step 5: Garantir que o Plano 1 continua verde**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: 17 passed (nenhuma regressão do refactor).

- [ ] **Step 6: Confirmar que os pipelines ainda rodam com caminhos absolutos**

Run: `.venv/bin/python -m src.backend.pipelines.batch_inference`
Expected: imprime "N alertas escritos em ..." sem erro (agora usando caminho absoluto via config).

- [ ] **Step 7: Commit**

```bash
git add src/backend/config.py src/backend/app/__init__.py src/backend/app/services/__init__.py src/backend/app/routers/__init__.py src/backend/pipelines/train_model.py src/backend/pipelines/batch_inference.py
git commit -m "refactor: caminhos centralizados em config.py + esqueleto do app"
```

---

## Task 2: Schemas Pydantic (`schemas.py`)

**Files:**
- Create: `src/backend/app/schemas.py`
- Test: `src/backend/tests/test_schemas.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_schemas.py
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_schemas.py -v`
Expected: FAIL com ModuleNotFoundError.

- [ ] **Step 3: Implementar `src/backend/app/schemas.py`**

```python
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_schemas.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/schemas.py src/backend/tests/test_schemas.py
git commit -m "feat: schemas Pydantic do contrato da API"
```

---

## Task 3: Autenticação por api_key (`auth.py`)

**Files:**
- Create: `src/backend/app/auth.py`
- Test: `src/backend/tests/test_auth.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_auth.py
from src.backend.app.auth import is_valid_api_key


def test_chave_valida():
    assert is_valid_api_key("atm_shield_secure_token_abc123") is True


def test_chave_invalida():
    assert is_valid_api_key("chave-que-nao-existe") is False


def test_chave_vazia():
    assert is_valid_api_key("") is False
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_auth.py -v`
Expected: FAIL com ModuleNotFoundError.

- [ ] **Step 3: Implementar `src/backend/app/auth.py`**

```python
"""Validação de dispositivos por api_key (homologação de sensores)."""
from src.backend.config import VALID_API_KEYS


def is_valid_api_key(api_key: str) -> bool:
    """True se a api_key pertence a um dispositivo homologado."""
    return api_key in VALID_API_KEYS
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_auth.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/auth.py src/backend/tests/test_auth.py
git commit -m "feat: validação de api_key de dispositivos"
```

---

## Task 4: Camada macro (vento) + serviço de scoring

**Files:**
- Create: `src/backend/app/services/weather.py`
- Create: `src/backend/app/services/scoring.py`
- Test: `src/backend/tests/test_weather.py`, `src/backend/tests/test_scoring_service.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# src/backend/tests/test_weather.py
from src.backend.app.services.weather import estimate_wind_kmh


def test_determinismo_por_coordenada():
    assert estimate_wind_kmh(-3.5, -52.4) == estimate_wind_kmh(-3.5, -52.4)


def test_faixa_plausivel():
    v = estimate_wind_kmh(-3.5, -52.4)
    assert isinstance(v, float)
    assert 0.0 <= v <= 50.0
```

```python
# src/backend/tests/test_scoring_service.py
from src.backend.app.services.scoring import load_model, load_focos, score_reading


def test_leitura_quente_perto_de_foco_classifica_alto():
    model = load_model()
    focos = load_focos()
    res = score_reading(
        latitude=-3.4712, longitude=-52.3812,
        temperatura=44.0, umidade_ar=16.0, ppm_fumaca=420.0,
        model=model, focos_df=focos,
    )
    assert res["risco"] == 2
    assert res["risco_label"] == "Critico"
    assert res["densidade_focos"] >= 1
    assert isinstance(res["vento_kmh"], float)


def test_leitura_fria_e_longe_classifica_baixo():
    model = load_model()
    focos = load_focos()
    res = score_reading(
        latitude=0.0, longitude=0.0,
        temperatura=24.0, umidade_ar=70.0, ppm_fumaca=30.0,
        model=model, focos_df=focos,
    )
    assert res["risco"] == 0
    assert res["risco_label"] == "Baixo"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py src/backend/tests/test_scoring_service.py -v`
Expected: FAIL com ModuleNotFoundError.

- [ ] **Step 3: Implementar `src/backend/app/services/weather.py`**

```python
"""Camada macro: estimativa de vento como proxy do feed de satélite/meteorologia.

Numa versão de produção, viria de uma API meteorológica/satelital por coordenada.
Na POC, devolve um valor determinístico e reproduzível em função da localização.
"""


def estimate_wind_kmh(latitude: float, longitude: float) -> float:
    """Vento estimado (km/h) para uma coordenada — determinístico na POC."""
    base = (abs(latitude) * 1.7 + abs(longitude) * 0.9) % 35.0
    return round(5.0 + base, 1)  # faixa ~5..40 km/h
```

- [ ] **Step 4: Implementar `src/backend/app/services/scoring.py`**

```python
"""Serviço de classificação: combina micro (sensor), macro (vento) e espacial (focos)."""
import joblib
import pandas as pd

from src.backend.config import MODEL_PATH, FOCOS_CSV
from src.backend.ml.features import FEATURE_COLUMNS, focus_metrics
from src.backend.ml.risk_rules import RISK_LABELS
from src.backend.pipelines.ingest_inpe import load_inpe
from src.backend.app.services.weather import estimate_wind_kmh


def load_model(path=MODEL_PATH):
    """Carrega o modelo treinado (joblib)."""
    return joblib.load(path)


def load_focos(path=FOCOS_CSV):
    """Carrega os focos do INPE para o cálculo espacial."""
    return load_inpe(str(path))


def score_reading(latitude, longitude, temperatura, umidade_ar, ppm_fumaca, model, focos_df) -> dict:
    """Enriquece a leitura do sensor e classifica o risco de alastramento."""
    densidade, dist = focus_metrics(latitude, longitude, focos_df)
    vento = estimate_wind_kmh(latitude, longitude)
    row = pd.DataFrame([{
        "temperatura": temperatura,
        "umidade_ar": umidade_ar,
        "ppm_fumaca": ppm_fumaca,
        "vento_kmh": vento,
        "densidade_focos": densidade,
        "dist_foco_km": dist,
    }])[FEATURE_COLUMNS]
    risco = int(model.predict(row)[0])
    return {
        "vento_kmh": float(vento),
        "densidade_focos": int(densidade),
        "dist_foco_km": float(dist),
        "risco": risco,
        "risco_label": RISK_LABELS[risco],
    }
```

- [ ] **Step 5: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py src/backend/tests/test_scoring_service.py -v`
Expected: PASS (4 testes). Se o teste de leitura quente não classificar 2, NÃO altere o teste — confira que o modelo treinado existe (`src/backend/ml/artifacts/risk_model.joblib`) e reporte a saída.

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/services/weather.py src/backend/app/services/scoring.py src/backend/tests/test_weather.py src/backend/tests/test_scoring_service.py
git commit -m "feat: camada macro de vento + serviço de scoring de risco"
```

---

## Task 5: Persistência SQLite (`db.py` + `deps.py`)

**Files:**
- Create: `src/backend/app/db.py`
- Create: `src/backend/app/deps.py`
- Test: `src/backend/tests/test_db.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_db.py
from src.backend.app import db


def _alert(device_id="ESP32-PRIV-092", temperatura=44.0, ppm_fumaca=420.0, is_outlier=0):
    return {
        "device_id": device_id, "received_at": "2026-06-05T12:00:00+00:00",
        "latitude": -3.4712, "longitude": -52.3812,
        "temperatura": temperatura, "umidade_ar": 16.0, "ppm_fumaca": ppm_fumaca,
        "vento_kmh": 22.0, "densidade_focos": 2, "dist_foco_km": 1.5,
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_db.py -v`
Expected: FAIL com ModuleNotFoundError.

- [ ] **Step 3: Implementar `src/backend/app/db.py`**

```python
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


def fetch_recent(conn: sqlite3.Connection, limit: int = 100) -> list[dict]:
    cur = conn.execute("SELECT * FROM readings ORDER BY id DESC LIMIT ?", (limit,))
    return [dict(r) for r in cur.fetchall()]


def last_reading_for_device(conn: sqlite3.Connection, device_id: str):
    cur = conn.execute(
        "SELECT * FROM readings WHERE device_id = ? ORDER BY id DESC LIMIT 1", (device_id,)
    )
    return cur.fetchone()
```

- [ ] **Step 4: Implementar `src/backend/app/deps.py`**

```python
"""Dependências do FastAPI."""
from src.backend.app import db


def get_db():
    """Fornece uma conexão SQLite por request, criando o schema se necessário."""
    conn = db.get_conn()
    try:
        db.init_db(conn)
        yield conn
    finally:
        conn.close()
```

- [ ] **Step 5: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_db.py -v`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/db.py src/backend/app/deps.py src/backend/tests/test_db.py
git commit -m "feat: persistência SQLite + dependência get_db"
```

---

## Task 6: App FastAPI + health (`main.py`, `routers/health.py`)

**Files:**
- Create: `src/backend/app/main.py`
- Create: `src/backend/app/routers/health.py`
- Test: adiciona `test_health` em `src/backend/tests/test_api.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_api.py
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py -v`
Expected: FAIL com ModuleNotFoundError (main não existe).

- [ ] **Step 3: Implementar `src/backend/app/routers/health.py`**

```python
"""Healthcheck."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "service": "atmosshield-api"}
```

- [ ] **Step 4: Implementar `src/backend/app/main.py`**

```python
"""Aplicação FastAPI do AtmosShield."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.backend.app.routers import health, readings, alerts
from src.backend.app.services.scoring import load_model, load_focos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # carrega o modelo e os focos uma única vez
    app.state.model = load_model()
    app.state.focos = load_focos()
    yield


app = FastAPI(title="AtmosShield API", version="0.1.0", lifespan=lifespan)
app.include_router(health.router)
app.include_router(readings.router)
app.include_router(alerts.router)
```

NOTA: `main.py` importa `readings` e `alerts`, que serão criados nas Tasks 7 e 8. Para esta task compilar, crie ANTES stubs mínimos de router para esses dois módulos:

`src/backend/app/routers/readings.py` (stub temporário — substituído na Task 7):
```python
from fastapi import APIRouter
router = APIRouter()
```
`src/backend/app/routers/alerts.py` (stub temporário — substituído na Task 8):
```python
from fastapi import APIRouter
router = APIRouter()
```

- [ ] **Step 5: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py -v`
Expected: PASS (test_health). O `lifespan` carrega o modelo real (artefato commitado) sem erro.

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/main.py src/backend/app/routers/health.py src/backend/app/routers/readings.py src/backend/app/routers/alerts.py src/backend/tests/test_api.py
git commit -m "feat: app FastAPI + healthcheck + stubs de router"
```

---

## Task 7: POST /readings (ingestão + classificação + outlier)

**Files:**
- Modify (substitui o stub): `src/backend/app/routers/readings.py`
- Test: adiciona testes em `src/backend/tests/test_api.py`

- [ ] **Step 1: Escrever os testes que falham (acrescente ao `test_api.py`)**

```python
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py -v`
Expected: os novos testes FALHAM (o stub de readings não tem POST; 404/405).

- [ ] **Step 3: Implementar `src/backend/app/routers/readings.py`** (substitui o stub)

```python
"""POST /readings — recebe leitura do ESP32, valida, classifica e persiste."""
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request

from src.backend.app import db
from src.backend.app.auth import is_valid_api_key
from src.backend.app.deps import get_db
from src.backend.app.schemas import SensorReadingIn, RiskAlertOut
from src.backend.app.services.scoring import score_reading
from src.backend.data_quality import flag_outliers

router = APIRouter()


@router.post("/readings", response_model=RiskAlertOut)
def post_reading(payload: SensorReadingIn, request: Request, conn=Depends(get_db)):
    if not is_valid_api_key(payload.api_key):
        raise HTTPException(status_code=401, detail="api_key inválida ou dispositivo não homologado")

    scored = score_reading(
        latitude=payload.coordenadas.latitude,
        longitude=payload.coordenadas.longitude,
        temperatura=payload.leitura.temperatura,
        umidade_ar=payload.leitura.umidade_ar,
        ppm_fumaca=payload.leitura.ppm_fumaca,
        model=request.app.state.model,
        focos_df=request.app.state.focos,
    )

    received_at = datetime.now(timezone.utc).isoformat()

    # outlier: compara com a última leitura do mesmo dispositivo
    hist = []
    prev = db.last_reading_for_device(conn, payload.device_id)
    if prev is not None:
        hist.append({
            "device_id": prev["device_id"], "timestamp": prev["received_at"],
            "temperatura": prev["temperatura"], "ppm_fumaca": prev["ppm_fumaca"],
        })
    hist.append({
        "device_id": payload.device_id, "timestamp": received_at,
        "temperatura": payload.leitura.temperatura, "ppm_fumaca": payload.leitura.ppm_fumaca,
    })
    flagged = flag_outliers(pd.DataFrame(hist))
    is_outlier = bool(flagged.iloc[-1]["is_outlier"])

    alert = {
        "device_id": payload.device_id,
        "latitude": payload.coordenadas.latitude,
        "longitude": payload.coordenadas.longitude,
        "temperatura": payload.leitura.temperatura,
        "umidade_ar": payload.leitura.umidade_ar,
        "ppm_fumaca": payload.leitura.ppm_fumaca,
        "vento_kmh": scored["vento_kmh"],
        "densidade_focos": scored["densidade_focos"],
        "dist_foco_km": scored["dist_foco_km"],
        "risco": scored["risco"],
        "risco_label": scored["risco_label"],
        "is_outlier": is_outlier,
        "received_at": received_at,
    }
    db.insert_reading(conn, {**alert, "is_outlier": int(is_outlier)})
    return alert
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py -v`
Expected: PASS (health + 3 novos = 4 testes no arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/routers/readings.py src/backend/tests/test_api.py
git commit -m "feat: POST /readings com classificação e detecção de outlier"
```

---

## Task 8: GET /alerts

**Files:**
- Modify (substitui o stub): `src/backend/app/routers/alerts.py`
- Test: adiciona teste em `src/backend/tests/test_api.py`

- [ ] **Step 1: Escrever o teste que falha (acrescente ao `test_api.py`)**

```python
def test_get_alerts_inclui_leitura_postada(client):
    client.post("/readings", json=VALID)
    r = client.get("/alerts")
    assert r.status_code == 200
    arr = r.json()
    assert isinstance(arr, list)
    assert len(arr) >= 1
    assert any(a["device_id"] == "ESP32-PRIV-092" for a in arr)
    assert isinstance(arr[0]["is_outlier"], bool)
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py::test_get_alerts_inclui_leitura_postada -v`
Expected: FAIL (stub de alerts não tem GET).

- [ ] **Step 3: Implementar `src/backend/app/routers/alerts.py`** (substitui o stub)

```python
"""GET /alerts — lista as leituras classificadas mais recentes."""
from fastapi import APIRouter, Depends

from src.backend.app import db
from src.backend.app.deps import get_db
from src.backend.app.schemas import RiskAlertOut

router = APIRouter()


@router.get("/alerts", response_model=list[RiskAlertOut])
def get_alerts(conn=Depends(get_db)):
    rows = db.fetch_recent(conn, limit=100)
    alerts = []
    for r in rows:
        d = dict(r)
        d["is_outlier"] = bool(d["is_outlier"])
        alerts.append(d)
    return alerts
```

- [ ] **Step 4: Rodar e ver passar (suíte inteira)**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: TODOS passam (Plano 1 = 17 + schemas 3 + auth 3 + weather 2 + scoring 2 + db 2 + api 5 = 34).

- [ ] **Step 5: Subir a API e fazer um smoke test manual**

Run (em background ou outro terminal): `.venv/bin/uvicorn src.backend.app.main:app --port 8000`
Então:
```bash
curl -s localhost:8000/health
curl -s -X POST localhost:8000/readings -H 'Content-Type: application/json' -d '{"device_id":"ESP32-PRIV-092","api_key":"atm_shield_secure_token_abc123","leitura":{"temperatura":44,"umidade_ar":16,"ppm_fumaca":420},"coordenadas":{"latitude":-3.4712,"longitude":-52.3812}}'
curl -s localhost:8000/alerts
```
Expected: health ok; o POST retorna um alerta com `risco`/`risco_label`; `/alerts` lista a leitura. Encerre o uvicorn depois.

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/routers/alerts.py src/backend/tests/test_api.py
git commit -m "feat: GET /alerts listando leituras classificadas"
```

---

## Task 9: Firmware ESP32 no Wokwi

Firmware C++/Arduino que lê DHT22 (temperatura/umidade) e um potenciômetro (simulando o MQ-2/fumaça), monta o payload JSON no contrato e faz `HTTP POST` para a API. Não há teste automatizado (código Arduino); a verificação é a coerência do payload com o schema e a estrutura de arquivos do Wokwi.

**Files:**
- Create: `src/iot/wokwi/atmosshield_sensor.ino`
- Create: `src/iot/wokwi/diagram.json`
- Create: `src/iot/wokwi/wokwi.toml`
- Create: `src/iot/wokwi/libraries.txt`
- Create: `src/iot/wokwi/README.md`

- [ ] **Step 1: Criar a pasta**

Run: `mkdir -p src/iot/wokwi`

- [ ] **Step 2: Criar `src/iot/wokwi/atmosshield_sensor.ino`**

```cpp
// AtmosShield — nó sensor ESP32 (simulado no Wokwi)
// Lê DHT22 (temperatura/umidade) e um potenciômetro (simula o MQ-2 / fumaça)
// e envia o payload JSON para a API AtmosShield via HTTP POST.
#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

#define DHT_PIN 15
#define DHT_TYPE DHT22
#define GAS_PIN 34  // potenciômetro simulando o sensor de gás/fumaça (analógico)

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// Ajuste para a URL pública da sua API (ex.: túnel ngrok para o uvicorn local).
const char* API_URL = "http://localhost:8000/readings";

const char* DEVICE_ID = "ESP32-PRIV-092";
const char* API_KEY   = "atm_shield_secure_token_abc123";
const float LATITUDE  = -3.4712;
const float LONGITUDE = -52.3812;

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(GAS_PIN, INPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(" conectado!");
}

void loop() {
  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();
  int gasRaw = analogRead(GAS_PIN);            // 0..4095
  float ppm = map(gasRaw, 0, 4095, 0, 1000);   // ppm de fumaça simulado

  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Falha na leitura do DHT22");
    delay(2000);
    return;
  }

  String payload = String("{") +
    "\"device_id\":\"" + DEVICE_ID + "\"," +
    "\"api_key\":\"" + API_KEY + "\"," +
    "\"leitura\":{" +
      "\"temperatura\":" + String(temperatura, 1) + "," +
      "\"umidade_ar\":" + String(umidade, 1) + "," +
      "\"ppm_fumaca\":" + String(ppm, 1) +
    "}," +
    "\"coordenadas\":{" +
      "\"latitude\":" + String(LATITUDE, 4) + "," +
      "\"longitude\":" + String(LONGITUDE, 4) +
    "}}";

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    Serial.printf("POST %d | %s\n", code, payload.c_str());
    http.end();
  }

  delay(5000);  // envia a cada 5s
}
```

- [ ] **Step 3: Criar `src/iot/wokwi/diagram.json`**

```json
{
  "version": 1,
  "author": "AtmosShield",
  "editor": "wokwi",
  "parts": [
    { "type": "board-esp32-devkit-c-v4", "id": "esp", "top": 0, "left": 0, "attrs": {} },
    { "type": "wokwi-dht22", "id": "dht1", "top": -120, "left": 200, "attrs": {} },
    { "type": "wokwi-potentiometer", "id": "pot1", "top": 120, "left": 200, "attrs": {} }
  ],
  "connections": [
    [ "dht1:VCC", "esp:3V3", "red", [] ],
    [ "dht1:GND", "esp:GND.1", "black", [] ],
    [ "dht1:SDA", "esp:15", "green", [] ],
    [ "pot1:VCC", "esp:3V3", "red", [] ],
    [ "pot1:GND", "esp:GND.2", "black", [] ],
    [ "pot1:SIG", "esp:34", "blue", [] ]
  ]
}
```

- [ ] **Step 4: Criar `src/iot/wokwi/wokwi.toml`**

```toml
[wokwi]
version = 1
firmware = "atmosshield_sensor.ino"
elf = ""
```

- [ ] **Step 5: Criar `src/iot/wokwi/libraries.txt`**

```
DHT sensor library
Adafruit Unified Sensor
```

- [ ] **Step 6: Criar `src/iot/wokwi/README.md`**

```markdown
# AtmosShield — Nó Sensor ESP32 (Wokwi)

Simula um nó de borda da rede AtmosShield: lê temperatura/umidade (DHT22) e fumaça
(potenciômetro no lugar do MQ-2), monta o payload JSON e envia para a API via `POST /readings`.

## Como rodar no Wokwi

1. Acesse https://wokwi.com e crie um projeto ESP32.
2. Copie `atmosshield_sensor.ino` para o `sketch.ino` e `diagram.json` para o diagrama.
3. Em **Library Manager**, adicione as libs de `libraries.txt` (DHT sensor library + Adafruit Unified Sensor).
4. Suba a API local (`uvicorn src.backend.app.main:app --port 8000`) e exponha-a com um túnel
   público (ex.: `ngrok http 8000`). Cole a URL pública em `API_URL` (terminando em `/readings`).
5. Rode a simulação. Gire o potenciômetro para simular o aumento de fumaça e acompanhe os POSTs
   no Serial Monitor e os alertas em `GET /alerts`.

## Circuito

- **DHT22**: VCC→3V3, GND→GND, SDA→GPIO15
- **Potenciômetro (MQ-2 simulado)**: VCC→3V3, GND→GND, SIG→GPIO34 (ADC)

## Contrato do payload

```json
{
  "device_id": "ESP32-PRIV-092",
  "api_key": "atm_shield_secure_token_abc123",
  "leitura": { "temperatura": 41.8, "umidade_ar": 14.2, "ppm_fumaca": 380.0 },
  "coordenadas": { "latitude": -3.4712, "longitude": -52.3812 }
}
```

Hardware real: basta trocar o potenciômetro por um MQ-2 no mesmo GPIO34 e manter o DHT22.
```

- [ ] **Step 7: Verificar coerência do payload com o schema**

Confira manualmente que as chaves do JSON montado no `.ino` (`device_id`, `api_key`,
`leitura.{temperatura,umidade_ar,ppm_fumaca}`, `coordenadas.{latitude,longitude}`) batem
exatamente com `SensorReadingIn`/`Leitura`/`Coordenadas` de `schemas.py`.

- [ ] **Step 8: Commit**

```bash
git add src/iot/wokwi/
git commit -m "feat: firmware ESP32 (Wokwi) enviando leituras para a API"
```

---

## Self-Review (cobertura do spec)

- **Seção 5 (contrato payload):** `schemas.py` (Task 2) + firmware (Task 9) usam o JSON documentado. ✓
- **Seção 8 (API):** routers health/readings/alerts, schemas, services scoring, auth, db SQLite — Tasks 2–8. ✓
- **`api_key` por dispositivo:** auth.py + 401 no POST (Tasks 3, 7). ✓
- **Detecção de outlier plugada na ingestão:** `flag_outliers` no POST /readings (Task 7). ✓ (carry-forward atendido)
- **Caminhos relativos ao pacote (config.py):** Task 1 (carry-forward atendido). ✓
- **Variável macro de vento (satélite/meteorologia):** `services/weather.py` enriquece a leitura antes do scoring (Task 4). ✓ (resolve o gap: modelo usa vento, sensor não envia)
- **ESP32/Wokwi (MQ-2 + DHT22):** Task 9. ✓
- **Fora deste plano (propositalmente):** notebook Folium/Seaborn, Next.js (landing + dashboard), README FIAP, PDF/vídeo → Plano 3.

Consistência de tipos: `score_reading` retorna o dict consumido por `readings.py`; `RiskAlertOut`
tem exatamente as chaves que `readings.py` monta e `alerts.py` devolve; `db._COLUMNS` casa com o
alert dict (com `is_outlier` como int). `get_db`/`get_conn`/`config.db_path()` resolvem o mesmo
caminho (com override por `ATMOSSHIELD_DB` em testes).
```
