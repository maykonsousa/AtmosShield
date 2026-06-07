# Integração Open-Meteo (clima real) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o vento sintético por clima real da Open-Meteo (Forecast no live, Archive no treino) e adicionar `precipitation` como feature do modelo, mantendo o sensor DHT22 como fonte de temp/umidade.

**Architecture:** Um serviço único (`app/services/weather.py`) fala com a Open-Meteo e expõe `get_weather(lat, lon, when=None)` retornando um `WeatherObservation`. `when=None` usa a Forecast API com cache+fallback (só no live); `when=<datetime>` usa a Archive API (treino, sem fallback). A nova feature `precipitation_mm` percorre `features → risk_rules → generate_simulation → train → scoring`. O modelo é retreinado e a `MetricasSection` é corrigida com os números reais.

**Tech Stack:** Python 3.12, FastAPI, scikit-learn (DecisionTree), pandas, httpx, pytest; Next.js (frontend).

**Spec:** `docs/superpowers/specs/2026-06-07-open-meteo-integration-design.md`

---

## Estrutura de arquivos

| Arquivo | Responsabilidade após o plano |
|---------|-------------------------------|
| `src/backend/app/services/weather.py` | Cliente Open-Meteo: `WeatherObservation`, `get_weather`, `_forecast`, `_archive`, cache+fallback; mantém `estimate_wind_kmh` como fallback |
| `src/backend/ml/features.py` | `FEATURE_COLUMNS` inclui `precipitation_mm` |
| `src/backend/ml/risk_rules.py` | `label_risk` aceita `precipitation_mm` e reduz score na chuva |
| `src/backend/pipelines/generate_simulation.py` | Usa `get_weather(when=foco.datahora_gmt)` (Archive) por foco; injeta `precipitation_mm` |
| `src/backend/app/services/scoring.py` | Usa `get_weather` (Forecast) live; devolve `precipitation_mm` + `vento_fonte` |
| `src/backend/app/schemas.py` | `RiskAlertOut` ganha `precipitation_mm`, `vento_fonte` |
| `src/backend/app/db.py` | Schema/colunas ganham `precipitation_mm`, `vento_fonte` |
| `src/backend/app/routers/readings.py` | Propaga os campos novos |
| `src/backend/data_quality.py` | Função de calibração `soil_moisture` × sensor |
| `src/frontend/src/components/MetricasSection.tsx` | Correção factual dos números |
| `src/backend/tests/*` | Cobertura nova/atualizada |

**Convenção de mock (todos os testes):** nenhum teste faz rede real. O ponto de costura é a função interna `weather._fetch(url, params) -> dict`; testes fazem `monkeypatch.setattr` nela. Pipelines/serviços que chamam `get_weather` são mockados via `monkeypatch.setattr("<modulo>.get_weather", fake)`.

---

## Task 1: Serviço de clima — Forecast API (fluxo live, sem cache ainda)

**Files:**
- Modify: `src/backend/app/services/weather.py`
- Test: `src/backend/tests/test_weather.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `src/backend/tests/test_weather.py`:

```python
import src.backend.app.services.weather as weather
from src.backend.app.services.weather import get_weather, WeatherObservation


def _fake_forecast_payload():
    return {
        "current": {"wind_speed_10m": 23.4},
        "hourly": {
            "precipitation": [0.0, 0.5, 1.0, 0.0, 2.0, 0.5, 9.9, 9.9],
            "soil_moisture_0_to_1cm": [0.21, 0.20, 0.20, 0.19, 0.19, 0.18, 0.18, 0.18],
        },
    }


def test_forecast_parseia_vento_precip_6h_e_solo(monkeypatch):
    monkeypatch.setattr(weather, "_fetch", lambda url, params: _fake_forecast_payload())
    obs = get_weather(-3.5, -52.4)
    assert isinstance(obs, WeatherObservation)
    assert obs.wind_kmh == 23.4
    assert obs.precipitation_mm == 4.0   # soma das 6 primeiras horas
    assert obs.soil_moisture == 0.21
    assert obs.fonte == "open-meteo"
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py::test_forecast_parseia_vento_precip_6h_e_solo -v`
Expected: FAIL (`ImportError: cannot import name 'get_weather'`).

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `src/backend/app/services/weather.py` por:

```python
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
```

- [ ] **Step 4: Rodar e ver passar (e não quebrar o resto)**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py -v`
Expected: PASS (inclusive os dois testes antigos de `estimate_wind_kmh`).

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/services/weather.py src/backend/tests/test_weather.py
git commit -m "feat(weather): cliente Open-Meteo Forecast com WeatherObservation"
```

---

## Task 2: Serviço de clima — Archive API (treino, parâmetro `when`)

**Files:**
- Modify: `src/backend/app/services/weather.py`
- Test: `src/backend/tests/test_weather.py`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `test_weather.py`:

```python
from datetime import datetime


def _fake_archive_payload():
    return {
        "hourly": {
            "time": ["2025-08-12T14:00", "2025-08-12T15:00", "2025-08-12T16:00", "2025-08-12T17:00"],
            "wind_speed_10m": [10.0, 12.0, 31.5, 14.0],
            "precipitation": [0.0, 0.0, 0.0, 1.0],
            "soil_moisture_0_to_1cm": [0.10, 0.10, 0.09, 0.09],
        },
    }


def test_archive_seleciona_hora_mais_proxima(monkeypatch):
    captured = {}

    def fake_fetch(url, params):
        captured["url"] = url
        return _fake_archive_payload()

    monkeypatch.setattr(weather, "_fetch", fake_fetch)
    obs = get_weather(-3.4712, -52.3812, when=datetime(2025, 8, 12, 16, 20))
    assert captured["url"] == weather.ARCHIVE_URL          # usou Archive, não Forecast
    assert obs.wind_kmh == 31.5                            # hora 16:00 (mais próxima de 16:20)
    assert obs.precipitation_mm == 0.0
    assert obs.soil_moisture == 0.09
    assert obs.fonte == "open-meteo"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py::test_archive_seleciona_hora_mais_proxima -v`
Expected: FAIL (`get_weather` ignora `when`, chama Forecast → `KeyError`/assert do url).

- [ ] **Step 3: Implementar**

Em `weather.py`, adicionar as funções e ramificar `get_weather`:

```python
def _closest_hour_index(times: list[str], when: datetime) -> int:
    target = when.replace(minute=0, second=0, microsecond=0)
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
```

Substituir o corpo de `get_weather` por:

```python
def get_weather(latitude: float, longitude: float, when: datetime | None = None) -> WeatherObservation:
    """Clima por coordenada. when=None → Forecast (live); when=<datetime> → Archive (treino)."""
    if when is not None:
        return _archive(latitude, longitude, when)   # treino: sem cache/fallback; estoura p/ rerodar
    return _forecast(latitude, longitude)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/services/weather.py src/backend/tests/test_weather.py
git commit -m "feat(weather): Archive API por datetime (clima histórico do treino)"
```

---

## Task 3: Serviço de clima — cache (TTL) + cadeia de fallback (só no live)

**Files:**
- Modify: `src/backend/app/services/weather.py`
- Test: `src/backend/tests/test_weather.py`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar a `test_weather.py`:

```python
@pytest.fixture(autouse=True)
def _limpa_cache():
    weather._cache.clear()
    yield
    weather._cache.clear()


def test_falha_sem_cache_cai_no_stub(monkeypatch):
    def boom(url, params):
        raise httpx.ConnectError("sem rede")
    monkeypatch.setattr(weather, "_fetch", boom)
    obs = get_weather(-3.5, -52.4)
    assert obs.fonte == "estimado"
    assert obs.wind_kmh == weather.estimate_wind_kmh(-3.5, -52.4)
    assert obs.precipitation_mm == 0.0
    assert obs.soil_moisture is None


def test_falha_com_cache_valido_serve_do_cache(monkeypatch):
    monkeypatch.setattr(weather, "_clock", lambda: 1000.0)
    monkeypatch.setattr(weather, "_fetch", lambda url, params: _fake_forecast_payload())
    primeiro = get_weather(-3.5, -52.4)          # popula o cache, fonte open-meteo
    assert primeiro.fonte == "open-meteo"

    def boom(url, params):
        raise httpx.ConnectError("sem rede")
    monkeypatch.setattr(weather, "_fetch", boom)
    segundo = get_weather(-3.5, -52.4)           # API caiu, cache ainda válido
    assert segundo.fonte == "cache"
    assert segundo.wind_kmh == 23.4


def test_cache_expirado_cai_no_stub(monkeypatch):
    agora = {"t": 1000.0}
    monkeypatch.setattr(weather, "_clock", lambda: agora["t"])
    monkeypatch.setattr(weather, "_fetch", lambda url, params: _fake_forecast_payload())
    get_weather(-3.5, -52.4)                      # cache expira em 1000 + TTL
    agora["t"] = 1000.0 + weather._CACHE_TTL_S + 1
    monkeypatch.setattr(weather, "_fetch", lambda url, params: (_ for _ in ()).throw(httpx.ConnectError("x")))
    obs = get_weather(-3.5, -52.4)
    assert obs.fonte == "estimado"
```

Garantir que `import pytest` está no topo do arquivo (adicionar se faltar).

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py -k "cache or stub" -v`
Expected: FAIL (sem try/except nem cache, a exceção do `_fetch` propaga).

- [ ] **Step 3: Implementar**

Substituir o corpo de `get_weather` por (ramo `when is None` agora com cache+fallback):

```python
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_weather.py -v`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/services/weather.py src/backend/tests/test_weather.py
git commit -m "feat(weather): cache TTL por coordenada + fallback p/ stub no live"
```

---

## Task 4: `label_risk` aceita `precipitation_mm` (regra de chuva, backward-compatible)

**Files:**
- Modify: `src/backend/ml/risk_rules.py:10-46`
- Test: `src/backend/tests/test_features.py`

> `precipitation_mm` entra como **keyword com default 0.0** → os chamadores atuais (`generate_simulation`, `scoring`) continuam válidos sem mudança. Mantém a suíte verde.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `src/backend/tests/test_features.py`:

```python
from src.backend.ml.risk_rules import label_risk, RISCO_CRITICO, RISCO_MODERADO


def test_chuva_reduz_risco():
    # cenário crítico sem chuva
    seco = label_risk(temperatura=44, umidade_ar=15, ppm_fumaca=420, dist_foco_km=1, vento_kmh=35)
    assert seco == RISCO_CRITICO
    # mesma leitura com chuva volumosa → score cai pelo menos um nível
    molhado = label_risk(temperatura=44, umidade_ar=15, ppm_fumaca=420, dist_foco_km=1, vento_kmh=35,
                         precipitation_mm=20.0)
    assert molhado < seco


def test_chuva_nao_deixa_score_negativo():
    # cenário já baixo + chuva: não pode quebrar nem ir abaixo de Baixo (0)
    r = label_risk(temperatura=22, umidade_ar=80, ppm_fumaca=10, dist_foco_km=50, vento_kmh=3,
                   precipitation_mm=30.0)
    assert r == 0
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_features.py -k chuva -v`
Expected: FAIL (`label_risk() got an unexpected keyword argument 'precipitation_mm'`).

- [ ] **Step 3: Implementar**

Em `src/backend/ml/risk_rules.py`, alterar a assinatura e adicionar a regra de chuva antes da classificação:

```python
def label_risk(temperatura: float, umidade_ar: float, ppm_fumaca: float, dist_foco_km: float,
               vento_kmh: float, precipitation_mm: float = 0.0) -> int:
    """Soma pontos por fator de risco e classifica em Baixo/Moderado/Crítico.

    Vento forte acelera o alastramento (soma pontos); chuva volumosa apaga risco (subtrai).
    """
    score = 0

    if ppm_fumaca >= 300:
        score += 2
    elif ppm_fumaca >= 150:
        score += 1

    if temperatura >= 40:
        score += 2
    elif temperatura >= 32:
        score += 1

    if umidade_ar <= 20:
        score += 2
    elif umidade_ar <= 35:
        score += 1

    if dist_foco_km <= 2:
        score += 2
    elif dist_foco_km <= 10:
        score += 1

    if vento_kmh >= 30:
        score += 2
    elif vento_kmh >= 18:
        score += 1

    # chuva real reduz o risco de ignição/alastramento
    if precipitation_mm >= 15:
        score -= 2
    elif precipitation_mm >= 5:
        score -= 1
    score = max(score, 0)

    if score >= 7:
        return RISCO_CRITICO
    if score >= 4:
        return RISCO_MODERADO
    return RISCO_BAIXO
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_features.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/ml/risk_rules.py src/backend/tests/test_features.py
git commit -m "feat(ml): label_risk reduz score com precipitação real"
```

---

## Task 5: `generate_simulation` usa clima real (Archive) por foco

**Files:**
- Modify: `src/backend/pipelines/generate_simulation.py`
- Test: `src/backend/tests/test_generate_simulation.py`, `src/backend/tests/test_train_model.py`, `src/backend/tests/test_batch_inference.py`

> Decisão: o clima é buscado **uma vez por foco** (camada macro) e memoizado por índice do foco; os nós próximos herdam o clima daquele foco. Isso reduz as chamadas à Archive de ~n_nodes para ~#focos. `vento_kmh` e `precipitation_mm` passam a vir do `WeatherObservation`. `FEATURE_COLUMNS` **ainda não muda** nesta task (a coluna `precipitation_mm` fica presente no DataFrame mas só entra no modelo na Task 7).

- [ ] **Step 1: Atualizar os testes (fixtures com `datahora_gmt` + mock de `get_weather`)**

Em `src/backend/tests/test_generate_simulation.py`, substituir o `_focos()` e adicionar mock autouse:

```python
import pandas as pd
import pytest
import src.backend.pipelines.generate_simulation as gensim
from src.backend.pipelines.generate_simulation import generate_readings
from src.backend.ml.features import FEATURE_COLUMNS
from src.backend.app.services.weather import WeatherObservation


def _focos():
    return pd.DataFrame({
        "latitude": [-3.50, -5.78, -12.54],
        "longitude": [-52.38, -53.00, -55.72],
        "datahora_gmt": pd.to_datetime(["2025-08-12 16:00", "2025-08-13 14:00", "2025-08-14 12:00"]),
    })


@pytest.fixture(autouse=True)
def _mock_weather(monkeypatch):
    # vento alto + sem chuva → mantém variedade de risco; offline
    monkeypatch.setattr(gensim, "get_weather",
                        lambda lat, lon, when=None: WeatherObservation(28.0, 0.0, 0.12, "open-meteo"))
```

Manter os 3 testes existentes (`test_determinismo_por_seed`, `test_tem_colunas_e_target`, `test_gera_variedade_de_risco`) — eles continuam válidos com o mock.

Adicionar um teste novo:

```python
def test_inclui_coluna_precipitation_mm():
    df = generate_readings(_focos(), n_nodes=10, seed=1)
    assert "precipitation_mm" in df.columns
    assert "vento_kmh" in df.columns
```

Em `src/backend/tests/test_train_model.py` e `src/backend/tests/test_batch_inference.py`, aplicar o **mesmo** `_focos()` (com `datahora_gmt`) e o **mesmo** fixture `_mock_weather` (importando `src.backend.pipelines.generate_simulation as gensim` e fazendo o `monkeypatch.setattr` em cada arquivo). Isso mantém os dois offline.

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_generate_simulation.py -v`
Expected: FAIL (`get_weather` ainda não é referenciado em `generate_simulation`; o `monkeypatch.setattr(gensim, "get_weather", ...)` dá `AttributeError`).

- [ ] **Step 3: Implementar**

Substituir `src/backend/pipelines/generate_simulation.py` por:

```python
"""Gera leituras simuladas de nós ESP32 com rótulo de risco (ground truth).

Temp/umidade/fumaça são sintéticas por cenário (perto/longe de foco). O vento e a
precipitação vêm da Open-Meteo (Archive) na data/hora do foco — clima real macro;
os nós próximos herdam o clima do foco de base.
"""
import numpy as np
import pandas as pd

from src.backend.ml.features import build_features
from src.backend.ml.risk_rules import label_risk
from src.backend.app.services.weather import get_weather


def generate_readings(focos_df: pd.DataFrame, n_nodes: int = 40, seed: int = 42) -> pd.DataFrame:
    """Cria `n_nodes` leituras de sensores. ~Metade próxima a focos (cenário quente)."""
    rng = np.random.default_rng(seed)
    focos = focos_df.reset_index(drop=True)
    clima_por_foco: dict[int, object] = {}   # memoiza o clima por índice de foco
    rows = []
    for i in range(n_nodes):
        perto_de_foco = i % 2 == 0
        idx = int(rng.integers(0, len(focos)))
        base = focos.iloc[idx]
        if idx not in clima_por_foco:
            when = base["datahora_gmt"] if "datahora_gmt" in focos.columns else None
            when = when.to_pydatetime() if hasattr(when, "to_pydatetime") else when
            clima_por_foco[idx] = get_weather(float(base["latitude"]), float(base["longitude"]), when=when)
        clima = clima_por_foco[idx]

        if perto_de_foco:
            lat = base["latitude"] + rng.normal(0, 0.03)
            lon = base["longitude"] + rng.normal(0, 0.03)
            temperatura = rng.uniform(36, 46)
            umidade_ar = rng.uniform(12, 30)
            ppm_fumaca = rng.uniform(200, 500)
        else:
            lat = base["latitude"] + rng.normal(0, 0.6)
            lon = base["longitude"] + rng.normal(0, 0.6)
            temperatura = rng.uniform(20, 34)
            umidade_ar = rng.uniform(40, 85)
            ppm_fumaca = rng.uniform(20, 130)
        rows.append({
            "device_id": f"ESP32-SIM-{i:03d}",
            "latitude": round(float(lat), 5),
            "longitude": round(float(lon), 5),
            "temperatura": round(float(temperatura), 1),
            "umidade_ar": round(float(umidade_ar), 1),
            "ppm_fumaca": round(float(ppm_fumaca), 1),
            "vento_kmh": round(float(clima.wind_kmh), 1),
            "precipitation_mm": round(float(clima.precipitation_mm), 2),
        })
    df = build_features(pd.DataFrame(rows), focos, radius_km=10.0)
    df["risco"] = df.apply(
        lambda r: label_risk(r["temperatura"], r["umidade_ar"], r["ppm_fumaca"],
                             r["dist_foco_km"], r["vento_kmh"], r["precipitation_mm"]),
        axis=1,
    )
    return df


if __name__ == "__main__":
    from src.backend.pipelines.ingest_inpe import load_inpe

    focos = load_inpe("data/inpe_focos_sample.csv")
    sim = generate_readings(focos, n_nodes=40, seed=42)
    print(sim["risco"].value_counts().sort_index())
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_generate_simulation.py src/backend/tests/test_train_model.py src/backend/tests/test_batch_inference.py -v`
Expected: PASS (todos, offline).

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipelines/generate_simulation.py src/backend/tests/test_generate_simulation.py src/backend/tests/test_train_model.py src/backend/tests/test_batch_inference.py
git commit -m "feat(pipeline): vento+precip reais da Open-Meteo no treino (Archive)"
```

---

## Task 6: `scoring` usa clima real no live e devolve `precipitation_mm` + `vento_fonte`

**Files:**
- Modify: `src/backend/app/services/scoring.py`
- Test: `src/backend/tests/test_scoring_service.py`

> `FEATURE_COLUMNS` ainda tem 6 colunas aqui; a linha é montada com `precipitation_mm` mas o `df[FEATURE_COLUMNS]` ignora a coluna até a Task 7. O modelo continua o de 6 features. Mantém verde.

- [ ] **Step 1: Atualizar o teste (mock de `get_weather`)**

Substituir `src/backend/tests/test_scoring_service.py` por:

```python
import pytest
import src.backend.app.services.scoring as scoring
from src.backend.app.services.scoring import load_model, load_focos, score_reading
from src.backend.app.services.weather import WeatherObservation


@pytest.fixture(autouse=True)
def _mock_weather(monkeypatch):
    monkeypatch.setattr(scoring, "get_weather",
                        lambda lat, lon, when=None: WeatherObservation(22.0, 0.0, 0.12, "open-meteo"))


def test_leitura_quente_perto_de_foco_classifica_alto():
    res = score_reading(
        latitude=-3.4712, longitude=-52.3812,
        temperatura=44.0, umidade_ar=16.0, ppm_fumaca=420.0,
        model=load_model(), focos_df=load_focos(),
    )
    assert res["risco"] == 2
    assert res["risco_label"] == "Critico"
    assert res["densidade_focos"] >= 1
    assert isinstance(res["vento_kmh"], float)
    assert isinstance(res["precipitation_mm"], float)
    assert res["vento_fonte"] == "open-meteo"


def test_leitura_fria_e_longe_classifica_baixo():
    res = score_reading(
        latitude=0.0, longitude=0.0,
        temperatura=24.0, umidade_ar=70.0, ppm_fumaca=30.0,
        model=load_model(), focos_df=load_focos(),
    )
    assert res["risco"] == 0
    assert res["risco_label"] == "Baixo"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_scoring_service.py -v`
Expected: FAIL (`monkeypatch.setattr(scoring, "get_weather", ...)` → `AttributeError`; `res["precipitation_mm"]`/`res["vento_fonte"]` ausentes).

- [ ] **Step 3: Implementar**

Substituir `src/backend/app/services/scoring.py` por:

```python
"""Serviço de classificação: combina micro (sensor), macro (clima) e espacial (focos)."""
import joblib
import pandas as pd

from src.backend.config import MODEL_PATH, FOCOS_CSV
from src.backend.ml.features import FEATURE_COLUMNS, focus_metrics
from src.backend.ml.risk_rules import RISK_LABELS
from src.backend.pipelines.ingest_inpe import load_inpe
from src.backend.app.services.weather import get_weather


def load_model(path=MODEL_PATH):
    """Carrega o modelo treinado (joblib)."""
    return joblib.load(path)


def load_focos(path=FOCOS_CSV):
    """Carrega os focos do INPE para o cálculo espacial."""
    return load_inpe(str(path))


def score_reading(latitude, longitude, temperatura, umidade_ar, ppm_fumaca, model, focos_df) -> dict:
    """Enriquece a leitura do sensor com clima real e classifica o risco de alastramento."""
    densidade, dist = focus_metrics(latitude, longitude, focos_df)
    clima = get_weather(latitude, longitude)   # Forecast live (com cache+fallback)
    row = pd.DataFrame([{
        "temperatura": temperatura,
        "umidade_ar": umidade_ar,
        "ppm_fumaca": ppm_fumaca,
        "vento_kmh": clima.wind_kmh,
        "densidade_focos": densidade,
        "dist_foco_km": dist,
        "precipitation_mm": clima.precipitation_mm,
    }])[FEATURE_COLUMNS]
    risco = int(model.predict(row)[0])
    return {
        "vento_kmh": float(clima.wind_kmh),
        "precipitation_mm": float(clima.precipitation_mm),
        "vento_fonte": clima.fonte,
        "densidade_focos": int(densidade),
        "dist_foco_km": float(dist),
        "risco": risco,
        "risco_label": RISK_LABELS[risco],
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_scoring_service.py -v`
Expected: PASS. O `row` é montado com 7 chaves, mas `[FEATURE_COLUMNS]` (6) descarta `precipitation_mm` por enquanto — compatível com o modelo atual.

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/services/scoring.py src/backend/tests/test_scoring_service.py
git commit -m "feat(scoring): clima real no live + precipitation_mm/vento_fonte na saída"
```

---

## Task 7: Ativar `precipitation_mm` como feature + retreinar o modelo (commit atômico)

**Files:**
- Modify: `src/backend/ml/features.py:5`
- Run/Regenerate: `src/backend/ml/artifacts/risk_model.joblib`, `src/backend/ml/artifacts/metrics.json`
- Test: `src/backend/tests/test_features.py`

> **Por que atômico:** ao incluir `precipitation_mm` em `FEATURE_COLUMNS`, o `scoring` passa a montar uma linha de 7 colunas, mas o artefato salvo ainda é de 6 features. Para a suíte (que carrega o modelo salvo em `test_scoring_service`/`test_api`) ficar verde, o bump e o retreino entram **no mesmo commit**.
> **Rede:** este é o único passo que faz **chamadas reais** à Archive API (treino com os focos reais do `inpe_focos_sample.csv`, que têm `datahora_gmt`). Requer internet.

- [ ] **Step 1: Escrever/atualizar o teste**

Adicionar a `src/backend/tests/test_features.py`:

```python
from src.backend.ml.features import FEATURE_COLUMNS


def test_precipitation_e_feature():
    assert "precipitation_mm" in FEATURE_COLUMNS
    assert len(FEATURE_COLUMNS) == 7
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_features.py::test_precipitation_e_feature -v`
Expected: FAIL (`precipitation_mm` ainda não está em `FEATURE_COLUMNS`).

- [ ] **Step 3: Implementar o bump**

Em `src/backend/ml/features.py`, linha 5, alterar:

```python
FEATURE_COLUMNS = ["temperatura", "umidade_ar", "ppm_fumaca", "vento_kmh", "densidade_focos", "dist_foco_km", "precipitation_mm"]
```

- [ ] **Step 4: Retreinar e regenerar artefatos (rede real)**

Run:
```bash
.venv/bin/python -m src.backend.pipelines.train_model
.venv/bin/python -m src.backend.pipelines.batch_inference
```
Expected: imprime "Modelo salvo em ..." e a acurácia; `metrics.json` e `risk_model.joblib` atualizados; `data/alerts.json` regenerado.

- [ ] **Step 5: Verificar que `metrics.json` tem 7 features incl. `precipitation_mm`**

Run: `.venv/bin/python -c "import json; m=json.load(open('src/backend/ml/artifacts/metrics.json')); print(len(m['feature_importances']), 'precipitation_mm' in m['feature_importances']); print(round(m['accuracy'],4))"`
Expected: `7 True` e a acurácia (anote o valor — será usado na Task 10).

- [ ] **Step 6: Rodar a suíte inteira (verde com o modelo de 7 features)**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: PASS (incl. `test_scoring_service` e `test_api`, que agora carregam o modelo de 7 features e mockam o clima).

- [ ] **Step 7: Commit (código + artefatos juntos)**

```bash
git add src/backend/ml/features.py src/backend/tests/test_features.py src/backend/ml/artifacts/risk_model.joblib src/backend/ml/artifacts/metrics.json data/alerts.json
git commit -m "feat(ml): precipitation_mm vira feature e retreina o modelo (7 features)"
```

---

## Task 8: Schema + DB + router — `precipitation_mm` e `vento_fonte` no contrato

**Files:**
- Modify: `src/backend/app/schemas.py:23-36`, `src/backend/app/db.py:7-29`, `src/backend/app/routers/readings.py:49-64`
- Delete/recreate: `data/atmosshield.db`
- Test: `src/backend/tests/test_api.py`, `src/backend/tests/test_db.py`

> Schema + DB + router são acoplados pelo dicionário `alert` (o `db.insert_reading` lê `alert[c] for c in _COLUMNS`). Mudam juntos.

- [ ] **Step 1: Atualizar os testes**

Em `src/backend/tests/test_api.py`, no `test_post_reading_valida_e_classifica`, mockar o clima e assertir os campos novos. Adicionar no topo do arquivo:

```python
import src.backend.app.services.scoring as scoring
from src.backend.app.services.weather import WeatherObservation


@pytest.fixture(autouse=True)
def _mock_weather(monkeypatch):
    monkeypatch.setattr(scoring, "get_weather",
                        lambda lat, lon, when=None: WeatherObservation(22.0, 0.0, 0.12, "open-meteo"))
```

E ampliar as asserts de `test_post_reading_valida_e_classifica`:

```python
    assert "vento_kmh" in body and "received_at" in body
    assert "precipitation_mm" in body and isinstance(body["precipitation_mm"], float)
    assert body["vento_fonte"] in {"open-meteo", "cache", "estimado"}
```

(Os demais testes do `test_api` continuam válidos com o mock autouse.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py::test_post_reading_valida_e_classifica -v`
Expected: FAIL (`precipitation_mm`/`vento_fonte` ausentes na resposta; `RiskAlertOut` ainda não os tem).

- [ ] **Step 3: Implementar — schema**

Em `src/backend/app/schemas.py`, na classe `RiskAlertOut`, adicionar após `vento_kmh: float`:

```python
    vento_kmh: float
    vento_fonte: str
    precipitation_mm: float
```

- [ ] **Step 4: Implementar — DB**

Em `src/backend/app/db.py`, no `SCHEMA`, adicionar as colunas (após `vento_kmh REAL,`):

```sql
    vento_kmh REAL,
    vento_fonte TEXT,
    precipitation_mm REAL,
```

E em `_COLUMNS`, inserir os dois nomes (após `"vento_kmh"`):

```python
_COLUMNS = [
    "device_id", "received_at", "latitude", "longitude", "temperatura", "umidade_ar",
    "ppm_fumaca", "vento_kmh", "vento_fonte", "precipitation_mm",
    "densidade_focos", "dist_foco_km", "risco", "risco_label", "is_outlier",
]
```

- [ ] **Step 5: Implementar — router**

Em `src/backend/app/routers/readings.py`, no dicionário `alert`, adicionar (após `"vento_kmh": scored["vento_kmh"],`):

```python
        "vento_kmh": scored["vento_kmh"],
        "vento_fonte": scored["vento_fonte"],
        "precipitation_mm": scored["precipitation_mm"],
```

- [ ] **Step 6: Recriar o SQLite da POC**

Run: `rm -f data/atmosshield.db`
(O `lifespan`/`init_db` recria o schema novo no próximo start; os testes usam `tmp_path`, então não dependem deste arquivo.)

- [ ] **Step 7: Rodar a suíte e ver passar**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: PASS (todos).

- [ ] **Step 8: Commit**

```bash
git add src/backend/app/schemas.py src/backend/app/db.py src/backend/app/routers/readings.py src/backend/tests/test_api.py
git commit -m "feat(api): precipitation_mm e vento_fonte no contrato, schema e persistência"
```

---

## Task 9: Check de calibração do sensor com `soil_moisture` (diagnóstico, não-feature)

**Files:**
- Modify: `src/backend/data_quality.py`
- Test: `src/backend/tests/test_data_quality.py`

> Função pura e diagnóstica: compara a umidade do ar do sensor com a umidade do solo da Open-Meteo e sinaliza divergência grande. Não entra no modelo nem cria UI.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `src/backend/tests/test_data_quality.py`:

```python
from src.backend.data_quality import flag_calibracao_solo


def test_divergencia_grande_marca_descalibrado():
    # sensor diz ar muito úmido (80%) mas o solo está muito seco (0.05) → suspeita
    assert flag_calibracao_solo(umidade_ar=80.0, soil_moisture=0.05) is True


def test_coerente_nao_marca():
    assert flag_calibracao_solo(umidade_ar=30.0, soil_moisture=0.12) is False


def test_solo_indisponivel_nao_marca():
    assert flag_calibracao_solo(umidade_ar=30.0, soil_moisture=None) is False
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_data_quality.py -k calibracao -v`
Expected: FAIL (`ImportError: cannot import name 'flag_calibracao_solo'`).

- [ ] **Step 3: Implementar**

Adicionar a `src/backend/data_quality.py`:

```python
def flag_calibracao_solo(umidade_ar: float, soil_moisture: float | None,
                         limiar_ar_pct: float = 60.0, limiar_solo: float = 0.10) -> bool:
    """Sinaliza possível descalibração: ar reportado muito úmido enquanto o solo está seco.

    Diagnóstico — não altera a classificação de risco. soil_moisture em m³/m³ (0..~0.5).
    """
    if soil_moisture is None:
        return False
    return umidade_ar >= limiar_ar_pct and soil_moisture <= limiar_solo
```

- [ ] **Step 4: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_data_quality.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/data_quality.py src/backend/tests/test_data_quality.py
git commit -m "feat(data-quality): check de calibração do sensor via soil_moisture"
```

---

## Task 10: Frontend — corrigir `MetricasSection` com os números reais

**Files:**
- Modify: `src/frontend/src/components/MetricasSection.tsx`
- Read: `src/backend/ml/artifacts/metrics.json` (gerado na Task 7)

> ⚠️ `src/frontend/AGENTS.md` avisa que esta versão do Next tem breaking changes — esta task altera **só conteúdo/JSX de um componente existente** (sem novas APIs de framework), mas leia o aviso antes. Não há teste automatizado de frontend no projeto; a verificação é via build/lint.

- [ ] **Step 1: Ler os números reais do modelo**

Run: `.venv/bin/python -c "import json; m=json.load(open('src/backend/ml/artifacts/metrics.json')); print('accuracy', round(m['accuracy'],4)); print('importances', {k: round(v,3) for k,v in m['feature_importances'].items()}); print('confusion', m['confusion_matrix'])"`
Anote: acurácia, as 7 importâncias (`temperatura`, `umidade_ar`, `ppm_fumaca`, `vento_kmh`, `densidade_focos`, `dist_foco_km`, `precipitation_mm`) e a matriz 3×3.

- [ ] **Step 2: Substituir o array `features` pelos 7 reais**

Em `MetricasSection.tsx`, trocar o array `features` (hoje 4 itens com pesos inventados 88/76/71/65) por **7 itens** com `weight` = importância real × 100 (arredondado), incluindo `ppm_fumaca`, `densidade_focos` e `precipitation_mm`. Manter o formato de cada item (`name`, `weight`, `unit`, `icon`, `color`, `desc`). Ex. de item novo:

```tsx
  {
    name: "Precipitação",
    weight: /* importância real de precipitation_mm × 100 */ 0,
    unit: "mm",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 13v6M8 13v6M12 15v6M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
      </svg>
    ),
    color: "#38bdf8",
    desc: "Chuva real reduz o risco de ignição",
  },
```

Preencher `weight` de cada item com o valor real do Step 1 (não deixar 0).

- [ ] **Step 3: Trocar o bloco binário pela matriz 3×3**

Substituir `confusionData` (VP/VN/FP/FN) por uma representação da **matriz de confusão 3×3** real (Baixo/Moderado/Crítico) do Step 1 — ex.: 3 linhas de contagens, ou os acertos por classe (diagonal). Ajustar o JSX que renderiza `confusionData.map(...)` para o novo formato. Manter o estilo visual existente (cards/`CountUp`).

- [ ] **Step 4: Corrigir o texto da acurácia e o painel `modelo.info()`**

- Hero/`~89%`: usar a acurácia real (do Step 1) nos lugares hardcoded (`89%`, `~89%`, `weight={89}`, `89% ← META`, `0.8921`).
- Remover a frase "Validação cruzada k=5. Resultado estável entre 87%–91%..." (não existe — só split 75/25). Substituir por algo fiel, ex.: "avaliado em split único 75/25".
- Painel `modelo.info()`: `RandomForestClassifier` → `DecisionTreeClassifier`; remover a linha `n_estimators`; `features ... 4 (...)` → `7 (temp, umid, fumaça, vento, densidade, dist, precip)`; `accuracy` → valor real.

- [ ] **Step 5: Verificar build/lint do frontend**

Run: `cd src/frontend && npm run lint && npm run build`
Expected: sem erros de lint/compilação.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/components/MetricasSection.tsx
git commit -m "fix(landing): MetricasSection com importâncias e métricas reais do modelo"
```

---

## Task 11: Verificação final + atualização de docs

**Files:**
- Modify: `README.md` (se necessário), `requirements.txt` (conferir `httpx`)

- [ ] **Step 1: Suíte completa**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: PASS, sem chamadas de rede (todos os pontos de clima mockados).

- [ ] **Step 2: Smoke test da API (rede real opcional)**

Run:
```bash
.venv/bin/uvicorn src.backend.app.main:app --port 8000 &
sleep 2
curl -s -X POST localhost:8000/readings -H 'content-type: application/json' -d '{"device_id":"ESP32-PRIV-092","api_key":"atm_shield_secure_token_abc123","leitura":{"temperatura":44,"umidade_ar":16,"ppm_fumaca":420},"coordenadas":{"latitude":-3.4712,"longitude":-52.3812}}'
kill %1
```
Expected: JSON com `precipitation_mm`, `vento_fonte` (`open-meteo` se houver rede, `estimado` se não), `risco`, `risco_label`.

- [ ] **Step 3: Conferir `requirements.txt`**

`httpx==0.27.*` já está presente — confirmar. Nenhuma dependência nova é necessária.

- [ ] **Step 4: Commit (se houve ajuste de docs)**

```bash
git add README.md requirements.txt
git commit -m "docs: nota sobre clima real (Open-Meteo) no fluxo da API"
```

---

## Self-review (cobertura da spec)

- §3.1 serviço/contrato → Tasks 1-3 ✅
- §3.2 cache+fallback → Task 3 ✅
- §3.3 fluxo live → Task 6 ✅
- §3.4 fluxo treino (Archive por foco) → Task 5 ✅
- §4 feature `precipitation_mm` (features/risk_rules/generate/scoring/train) → Tasks 4, 5, 6, 7 ✅
- §5 `soil_moisture` calibração → Task 9 ✅
- §6 schema/DB/router + recriar `.db` → Task 8 ✅
- §7 frontend MetricasSection → Task 10 ✅
- §8 testes (mock httpx, fallback, sem rede real) → Tasks 1-9 + 11 ✅
- §8 nota Next.js → Task 10 ✅
