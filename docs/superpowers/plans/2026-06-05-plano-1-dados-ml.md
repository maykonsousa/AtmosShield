# AtmosShield — Plano 1: Núcleo de Dados + ML — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o núcleo de dados e ML do AtmosShield — ingestão de focos do INPE, geração de leituras simuladas de sensores ESP32 com rótulo de risco por regra física, detecção de outliers, e um classificador DecisionTree que gera `data/alerts.json`.

**Architecture:** Pipeline Python puro (sem API ainda). Funções puras e testáveis em `src/backend/ml/` (regras de risco, features) e `src/backend/` (qualidade de dados), orquestradas por scripts CLI em `src/backend/pipelines/`. O modelo treinado e suas métricas são salvos em `src/backend/ml/artifacts/`. O resultado final (`data/alerts.json`) é o contrato que a API (Plano 2) e o frontend (Plano 3) vão consumir.

**Tech Stack:** Python 3.11, pandas, scikit-learn, joblib, pytest.

---

## File Structure

```
README.md                              # stub (preenchido no Plano 3)
requirements.txt                       # deps Python do projeto
data/
  inpe_focos_sample.csv                # amostra de focos INPE (commitada)
src/backend/
  __init__.py
  data_quality.py                      # flag_outliers (Pandas, média/salto)
  ml/
    __init__.py
    risk_rules.py                      # label_risk + constantes de risco
    features.py                        # haversine, focus_metrics, build_features, FEATURE_COLUMNS
    artifacts/.gitkeep                 # destino do modelo + metrics.json
  pipelines/
    __init__.py
    ingest_inpe.py                     # load_inpe(path) -> DataFrame limpo
    generate_simulation.py             # generate_readings(focos_df, ...) -> DataFrame rotulado
    train_model.py                     # train(df) + main() salva artefatos
    batch_inference.py                 # run_batch(model, df) + main() escreve alerts.json
  tests/
    __init__.py
    test_risk_rules.py
    test_data_quality.py
    test_ingest_inpe.py
    test_features.py
    test_generate_simulation.py
    test_train_model.py
    test_batch_inference.py
```

Cada arquivo tem uma responsabilidade única. `risk_rules` e `features` são funções puras (fáceis
de testar e reusadas pela API no Plano 2). Os `pipelines/` só orquestram.

---

## Task 0: Scaffold do projeto

**Files:**
- Create: `requirements.txt`
- Create: `README.md` (stub)
- Create: `data/inpe_focos_sample.csv`
- Create: `src/backend/__init__.py`, `src/backend/ml/__init__.py`, `src/backend/ml/artifacts/.gitkeep`, `src/backend/pipelines/__init__.py`, `src/backend/tests/__init__.py`

- [ ] **Step 1: Criar `requirements.txt`**

```
fastapi==0.115.*
uvicorn[standard]==0.32.*
pydantic==2.*
pandas==2.*
scikit-learn==1.5.*
joblib==1.4.*
folium==0.17.*
seaborn==0.13.*
matplotlib==3.9.*
httpx==0.27.*
pytest==8.*
```

- [ ] **Step 2: Criar `README.md` stub**

```markdown
# AtmosShield

Sistema inteligente de prevenção e mitigação de queimadas (FIAP Global Solution 2026.1).
README completo será preenchido no Plano 3.
```

- [ ] **Step 3: Criar `data/inpe_focos_sample.csv`**

Amostra de focos no padrão BDQueimadas/INPE (região Norte). `numero_dias_sem_chuva`,
`precipitacao`, `risco_fogo` e `frp` são colunas reais do dataset do INPE.

```csv
datahora_gmt,latitude,longitude,municipio,estado,bioma,numero_dias_sem_chuva,precipitacao,risco_fogo,frp
2025-08-12 16:20:00,-3.4712,-52.3812,Altamira,PA,Amazonia,21,0.0,0.92,48.3
2025-08-12 16:22:00,-3.4980,-52.4101,Altamira,PA,Amazonia,21,0.0,0.94,61.7
2025-08-12 16:25:00,-3.5210,-52.3650,Altamira,PA,Amazonia,20,0.0,0.88,33.1
2025-08-12 17:01:00,-4.1023,-50.1190,Maraba,PA,Amazonia,15,0.2,0.71,22.5
2025-08-12 17:03:00,-4.1150,-50.0980,Maraba,PA,Amazonia,15,0.2,0.69,19.0
2025-08-13 15:40:00,-5.7811,-53.0021,Novo Progresso,PA,Amazonia,28,0.0,0.97,88.4
2025-08-13 15:42:00,-5.8002,-53.0210,Novo Progresso,PA,Amazonia,28,0.0,0.96,75.2
2025-08-13 15:45:00,-5.7650,-52.9890,Novo Progresso,PA,Amazonia,27,0.0,0.95,69.9
2025-08-13 18:10:00,-9.9740,-67.8240,Rio Branco,AC,Amazonia,9,1.4,0.42,11.2
2025-08-14 16:55:00,-10.1820,-67.7410,Senador Guiomard,AC,Amazonia,7,3.1,0.31,8.7
2025-08-14 14:30:00,-12.5440,-55.7210,Sorriso,MT,Cerrado,18,0.0,0.83,40.6
2025-08-14 14:33:00,-12.5610,-55.7050,Sorriso,MT,Cerrado,18,0.0,0.85,52.0
2025-08-15 13:20:00,-15.6010,-56.0980,Cuiaba,MT,Cerrado,22,0.0,0.90,57.8
2025-08-15 13:25:00,-15.6230,-56.1200,Cuiaba,MT,Cerrado,22,0.0,0.91,63.4
2025-08-15 19:05:00,-2.5300,-44.3020,Sao Luis,MA,Amazonia,4,8.2,0.18,5.1
```

- [ ] **Step 4: Criar os pacotes Python vazios**

Run:
```bash
mkdir -p src/backend/ml/artifacts src/backend/pipelines src/backend/tests
touch src/backend/__init__.py src/backend/ml/__init__.py src/backend/pipelines/__init__.py src/backend/tests/__init__.py src/backend/ml/artifacts/.gitkeep
```

- [ ] **Step 5: Instalar dependências e verificar pytest**

Run: `python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pytest --version`
Expected: imprime a versão do pytest sem erro. (Adicionar `.venv/` ao `.gitignore`.)

- [ ] **Step 6: Commit**

```bash
echo ".venv/" >> .gitignore
git add requirements.txt README.md data/inpe_focos_sample.csv src/backend .gitignore
git commit -m "chore: scaffold do núcleo de dados/ML do AtmosShield"
```

---

## Task 1: Regras de risco (`risk_rules.py`)

Função pura que rotula o risco de alastramento por regra física. É o **ground truth** da
simulação e o vocabulário de risco compartilhado por todo o projeto.

**Files:**
- Create: `src/backend/ml/risk_rules.py`
- Test: `src/backend/tests/test_risk_rules.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_risk_rules.py
from src.backend.ml.risk_rules import label_risk, RISCO_BAIXO, RISCO_MODERADO, RISCO_CRITICO, RISK_LABELS


def test_cenario_critico():
    # muito gas + temp alta + ar seco + foco colado => Crítico
    assert label_risk(temperatura=43.0, umidade_ar=15.0, ppm_fumaca=400.0, dist_foco_km=1.0) == RISCO_CRITICO


def test_cenario_baixo():
    # ambiente úmido, frio, sem fumaça, longe de foco => Baixo
    assert label_risk(temperatura=24.0, umidade_ar=70.0, ppm_fumaca=40.0, dist_foco_km=50.0) == RISCO_BAIXO


def test_cenario_moderado():
    # sinais intermediários => Moderado
    assert label_risk(temperatura=34.0, umidade_ar=33.0, ppm_fumaca=160.0, dist_foco_km=8.0) == RISCO_MODERADO


def test_labels_mapeiam_todos_os_niveis():
    assert RISK_LABELS == {0: "Baixo", 1: "Moderado", 2: "Critico"}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_risk_rules.py -v`
Expected: FAIL com `ModuleNotFoundError` / `ImportError` (módulo ainda não existe).

- [ ] **Step 3: Implementar `risk_rules.py`**

```python
# src/backend/ml/risk_rules.py
"""Rotulagem de risco de alastramento de fogo por regra física."""

RISCO_BAIXO = 0
RISCO_MODERADO = 1
RISCO_CRITICO = 2

RISK_LABELS = {RISCO_BAIXO: "Baixo", RISCO_MODERADO: "Moderado", RISCO_CRITICO: "Critico"}


def label_risk(temperatura: float, umidade_ar: float, ppm_fumaca: float, dist_foco_km: float) -> int:
    """Soma pontos por fator de risco e classifica em Baixo/Moderado/Crítico."""
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

    if score >= 6:
        return RISCO_CRITICO
    if score >= 3:
        return RISCO_MODERADO
    return RISCO_BAIXO
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_risk_rules.py -v`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/backend/ml/risk_rules.py src/backend/tests/test_risk_rules.py
git commit -m "feat: regra física de rotulagem de risco de fogo"
```

---

## Task 2: Detecção de outliers (`data_quality.py`)

Filtro Pandas que marca leituras de sensores defeituosos: salto abrupto de temperatura **sem**
confirmação de fumaça (sensor privado descalibrado), evitando alarme falso.

**Files:**
- Create: `src/backend/data_quality.py`
- Test: `src/backend/tests/test_data_quality.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_data_quality.py
import pandas as pd
from src.backend.data_quality import flag_outliers


def _frame():
    return pd.DataFrame(
        [
            {"device_id": "A", "timestamp": "2025-08-12 10:00", "temperatura": 25.0, "ppm_fumaca": 40},
            {"device_id": "A", "timestamp": "2025-08-12 10:01", "temperatura": 150.0, "ppm_fumaca": 45},  # salto sem fumaça
            {"device_id": "A", "timestamp": "2025-08-12 10:02", "temperatura": 26.0, "ppm_fumaca": 42},
            {"device_id": "B", "timestamp": "2025-08-12 10:00", "temperatura": 30.0, "ppm_fumaca": 90},
            {"device_id": "B", "timestamp": "2025-08-12 10:01", "temperatura": 95.0, "ppm_fumaca": 350},  # salto COM fumaça => fogo real
        ]
    )


def test_salto_sem_fumaca_e_outlier():
    out = flag_outliers(_frame())
    linha_salto = out[(out["device_id"] == "A") & (out["temperatura"] == 150.0)]
    assert bool(linha_salto["is_outlier"].iloc[0]) is True


def test_salto_com_fumaca_nao_e_outlier():
    out = flag_outliers(_frame())
    linha_fogo = out[(out["device_id"] == "B") & (out["temperatura"] == 95.0)]
    assert bool(linha_fogo["is_outlier"].iloc[0]) is False


def test_primeira_leitura_nunca_e_outlier():
    out = flag_outliers(_frame())
    primeiras = out.sort_values(["device_id", "timestamp"]).groupby("device_id").head(1)
    assert not primeiras["is_outlier"].any()
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_data_quality.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar `data_quality.py`**

```python
# src/backend/data_quality.py
"""Qualidade de dados: marca leituras de sensores defeituosos."""
import pandas as pd

TEMP_JUMP_C = 50.0       # salto de temperatura considerado anômalo
SMOKE_CONFIRM_PPM = 120.0  # abaixo disso, não há fumaça que justifique o salto


def flag_outliers(df: pd.DataFrame, temp_jump: float = TEMP_JUMP_C, smoke_threshold: float = SMOKE_CONFIRM_PPM) -> pd.DataFrame:
    """Adiciona coluna booleana `is_outlier` por dispositivo.

    Um salto de temperatura > `temp_jump` entre leituras consecutivas do mesmo
    dispositivo, sem fumaça (`ppm_fumaca` < `smoke_threshold`), indica sensor defeituoso.
    """
    out = df.sort_values(["device_id", "timestamp"]).copy()
    temp_prev = out.groupby("device_id")["temperatura"].shift(1)
    temp_delta = (out["temperatura"] - temp_prev).abs()
    out["is_outlier"] = (temp_delta > temp_jump) & (out["ppm_fumaca"] < smoke_threshold)
    out["is_outlier"] = out["is_outlier"].fillna(False)
    return out
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_data_quality.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/backend/data_quality.py src/backend/tests/test_data_quality.py
git commit -m "feat: detecção de outlier de sensor por salto sem fumaça"
```

---

## Task 3: Ingestão de focos INPE (`ingest_inpe.py`)

Lê e limpa o CSV de focos do INPE com Pandas.

**Files:**
- Create: `src/backend/pipelines/ingest_inpe.py`
- Test: `src/backend/tests/test_ingest_inpe.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_ingest_inpe.py
import pandas as pd
from src.backend.pipelines.ingest_inpe import load_inpe


def test_carrega_e_limpa(tmp_path):
    csv = tmp_path / "focos.csv"
    csv.write_text(
        "datahora_gmt,latitude,longitude,municipio,estado,bioma,numero_dias_sem_chuva,precipitacao,risco_fogo,frp\n"
        "2025-08-12 16:20:00,-3.4712,-52.3812,Altamira,PA,Amazonia,21,0.0,0.92,48.3\n"
        ",,-52.0,SemCoord,PA,Amazonia,1,0.0,0.10,1.0\n"  # sem lat/lon => descartada
        "2025-08-13 15:40:00,-5.7811,-53.0021,Novo Progresso,PA,Amazonia,28,0.0,0.97,88.4\n"
    )
    df = load_inpe(str(csv))
    assert len(df) == 2  # linha sem coordenadas foi removida
    assert {"latitude", "longitude", "risco_fogo", "datahora_gmt"}.issubset(df.columns)
    assert pd.api.types.is_datetime64_any_dtype(df["datahora_gmt"])
    assert pd.api.types.is_float_dtype(df["latitude"])
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_ingest_inpe.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar `ingest_inpe.py`**

```python
# src/backend/pipelines/ingest_inpe.py
"""Ingestão e limpeza de focos de calor do INPE (BDQueimadas)."""
import pandas as pd

NUMERIC_COLS = ["latitude", "longitude", "numero_dias_sem_chuva", "precipitacao", "risco_fogo", "frp"]


def load_inpe(path: str) -> pd.DataFrame:
    """Lê o CSV de focos, converte tipos e descarta linhas sem coordenadas."""
    df = pd.read_csv(path)
    df["datahora_gmt"] = pd.to_datetime(df["datahora_gmt"], errors="coerce")
    for col in NUMERIC_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"]).reset_index(drop=True)
    return df


if __name__ == "__main__":
    focos = load_inpe("data/inpe_focos_sample.csv")
    print(f"Focos carregados: {len(focos)}")
    print(focos[["municipio", "estado", "risco_fogo", "frp"]].head())
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_ingest_inpe.py -v`
Expected: PASS.

- [ ] **Step 5: Verificar com a amostra real**

Run: `python -m src.backend.pipelines.ingest_inpe`
Expected: `Focos carregados: 15` e uma prévia da tabela.

- [ ] **Step 6: Commit**

```bash
git add src/backend/pipelines/ingest_inpe.py src/backend/tests/test_ingest_inpe.py
git commit -m "feat: ingestão e limpeza de focos INPE"
```

---

## Task 4: Engenharia de features (`features.py`)

Calcula, a partir das coordenadas de um nó, a **densidade de focos** próximos e a **distância ao
foco mais próximo** — as variáveis espaciais do modelo. Define o conjunto de features.

**Files:**
- Create: `src/backend/ml/features.py`
- Test: `src/backend/tests/test_features.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_features.py
import pandas as pd
from src.backend.ml.features import haversine_km, focus_metrics, build_features, FEATURE_COLUMNS


def test_haversine_um_grau_de_latitude():
    # ~111 km por grau de latitude
    assert abs(haversine_km(0.0, 0.0, 1.0, 0.0) - 111.19) < 1.0


def test_focus_metrics_conta_focos_no_raio():
    focos = pd.DataFrame({"latitude": [-3.50, -3.51, -9.97], "longitude": [-52.38, -52.39, -67.82]})
    densidade, dist = focus_metrics(-3.50, -52.38, focos, radius_km=10.0)
    assert densidade == 2          # dois focos próximos em Altamira
    assert dist < 2.0              # foco mais próximo a poucos km


def test_build_features_gera_colunas_do_modelo():
    focos = pd.DataFrame({"latitude": [-3.50], "longitude": [-52.38]})
    readings = pd.DataFrame(
        [{"latitude": -3.50, "longitude": -52.38, "temperatura": 41.0, "umidade_ar": 18.0, "ppm_fumaca": 360.0, "vento_kmh": 22.0}]
    )
    out = build_features(readings, focos, radius_km=10.0)
    assert set(FEATURE_COLUMNS).issubset(out.columns)
    assert out["densidade_focos"].iloc[0] == 1
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_features.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar `features.py`**

```python
# src/backend/ml/features.py
"""Engenharia de features espaciais e climáticas para o modelo de risco."""
import math
import pandas as pd

FEATURE_COLUMNS = ["temperatura", "umidade_ar", "ppm_fumaca", "vento_kmh", "densidade_focos", "dist_foco_km"]

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
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_features.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/backend/ml/features.py src/backend/tests/test_features.py
git commit -m "feat: engenharia de features espaciais (haversine, densidade de focos)"
```

---

## Task 5: Gerador de simulação (`generate_simulation.py`)

Gera leituras simuladas de N nós ESP32 (laços + condicionais), calcula features e rotula o risco
com `label_risk`. Determinístico por seed.

**Files:**
- Create: `src/backend/pipelines/generate_simulation.py`
- Test: `src/backend/tests/test_generate_simulation.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_generate_simulation.py
import pandas as pd
from src.backend.pipelines.generate_simulation import generate_readings
from src.backend.ml.features import FEATURE_COLUMNS


def _focos():
    return pd.DataFrame({"latitude": [-3.50, -5.78, -12.54], "longitude": [-52.38, -53.00, -55.72]})


def test_determinismo_por_seed():
    a = generate_readings(_focos(), n_nodes=30, seed=42)
    b = generate_readings(_focos(), n_nodes=30, seed=42)
    pd.testing.assert_frame_equal(a, b)


def test_tem_colunas_e_target():
    df = generate_readings(_focos(), n_nodes=30, seed=42)
    assert len(df) == 30
    assert set(FEATURE_COLUMNS).issubset(df.columns)
    assert {"device_id", "latitude", "longitude", "risco"}.issubset(df.columns)
    assert set(df["risco"].unique()).issubset({0, 1, 2})


def test_gera_variedade_de_risco():
    # com nós perto e longe de focos, espera-se mais de uma classe de risco
    df = generate_readings(_focos(), n_nodes=60, seed=7)
    assert df["risco"].nunique() >= 2
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_generate_simulation.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar `generate_simulation.py`**

```python
# src/backend/pipelines/generate_simulation.py
"""Gera leituras simuladas de nós ESP32 com rótulo de risco (ground truth)."""
import numpy as np
import pandas as pd

from src.backend.ml.features import build_features
from src.backend.ml.risk_rules import label_risk


def generate_readings(focos_df: pd.DataFrame, n_nodes: int = 40, seed: int = 42) -> pd.DataFrame:
    """Cria `n_nodes` leituras de sensores. ~Metade próxima a focos (cenário quente)."""
    rng = np.random.default_rng(seed)
    focos = focos_df.reset_index(drop=True)
    rows = []
    for i in range(n_nodes):
        perto_de_foco = i % 2 == 0  # alterna nós quentes e nós normais
        base = focos.iloc[rng.integers(0, len(focos))]
        if perto_de_foco:
            lat = base["latitude"] + rng.normal(0, 0.03)   # ~3 km
            lon = base["longitude"] + rng.normal(0, 0.03)
            temperatura = rng.uniform(36, 46)
            umidade_ar = rng.uniform(12, 30)
            ppm_fumaca = rng.uniform(200, 500)
            vento_kmh = rng.uniform(15, 40)
        else:
            lat = base["latitude"] + rng.normal(0, 0.6)    # ~60 km, longe
            lon = base["longitude"] + rng.normal(0, 0.6)
            temperatura = rng.uniform(20, 34)
            umidade_ar = rng.uniform(40, 85)
            ppm_fumaca = rng.uniform(20, 130)
            vento_kmh = rng.uniform(2, 20)
        rows.append(
            {
                "device_id": f"ESP32-SIM-{i:03d}",
                "latitude": round(float(lat), 5),
                "longitude": round(float(lon), 5),
                "temperatura": round(float(temperatura), 1),
                "umidade_ar": round(float(umidade_ar), 1),
                "ppm_fumaca": round(float(ppm_fumaca), 1),
                "vento_kmh": round(float(vento_kmh), 1),
            }
        )
    df = build_features(pd.DataFrame(rows), focos, radius_km=10.0)
    df["risco"] = df.apply(
        lambda r: label_risk(r["temperatura"], r["umidade_ar"], r["ppm_fumaca"], r["dist_foco_km"]), axis=1
    )
    return df


if __name__ == "__main__":
    from src.backend.pipelines.ingest_inpe import load_inpe

    focos = load_inpe("data/inpe_focos_sample.csv")
    sim = generate_readings(focos, n_nodes=40, seed=42)
    print(sim["risco"].value_counts().sort_index())
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_generate_simulation.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Verificar a distribuição**

Run: `python -m src.backend.pipelines.generate_simulation`
Expected: contagem por classe de risco (0/1/2), com mais de uma classe presente.

- [ ] **Step 6: Commit**

```bash
git add src/backend/pipelines/generate_simulation.py src/backend/tests/test_generate_simulation.py
git commit -m "feat: gerador de leituras simuladas com rótulo de risco"
```

---

## Task 6: Treino do modelo (`train_model.py`)

Treina um `DecisionTreeClassifier` e salva modelo + `metrics.json`.

**Files:**
- Create: `src/backend/pipelines/train_model.py`
- Test: `src/backend/tests/test_train_model.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_train_model.py
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from src.backend.pipelines.train_model import train
from src.backend.pipelines.generate_simulation import generate_readings


def _focos():
    return pd.DataFrame({"latitude": [-3.50, -5.78, -12.54], "longitude": [-52.38, -53.00, -55.72]})


def test_train_retorna_modelo_e_metricas():
    df = generate_readings(_focos(), n_nodes=120, seed=42)
    model, metrics = train(df)
    assert isinstance(model, DecisionTreeClassifier)
    assert "accuracy" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert "confusion_matrix" in metrics
    assert "feature_importances" in metrics
    assert set(metrics["feature_importances"].keys())  # não vazio
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_train_model.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar `train_model.py`**

```python
# src/backend/pipelines/train_model.py
"""Treina o classificador de risco de alastramento e persiste artefatos."""
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

from src.backend.ml.features import FEATURE_COLUMNS

ARTIFACT_DIR = Path("src/backend/ml/artifacts")
MODEL_PATH = ARTIFACT_DIR / "risk_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"


def train(df: pd.DataFrame) -> tuple[DecisionTreeClassifier, dict]:
    """Treina o DecisionTree e retorna (modelo, métricas)."""
    X = df[FEATURE_COLUMNS]
    y = df["risco"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = DecisionTreeClassifier(max_depth=6, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, preds)),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
        "classification_report": classification_report(y_test, preds, output_dict=True, zero_division=0),
        "feature_importances": dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist())),
    }
    return model, metrics


def main() -> None:
    from src.backend.pipelines.generate_simulation import generate_readings
    from src.backend.pipelines.ingest_inpe import load_inpe

    focos = load_inpe("data/inpe_focos_sample.csv")
    df = generate_readings(focos, n_nodes=300, seed=42)
    model, metrics = train(df)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(f"Modelo salvo em {MODEL_PATH}")
    print(f"Acurácia: {metrics['accuracy']:.3f}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_train_model.py -v`
Expected: PASS.

- [ ] **Step 5: Treinar de verdade e gerar artefatos**

Run: `python -m src.backend.pipelines.train_model`
Expected: imprime caminho do modelo e acurácia; cria `src/backend/ml/artifacts/risk_model.joblib` e `metrics.json`.

- [ ] **Step 6: Commit**

```bash
git add src/backend/pipelines/train_model.py src/backend/tests/test_train_model.py src/backend/ml/artifacts/risk_model.joblib src/backend/ml/artifacts/metrics.json
git commit -m "feat: treino do DecisionTree de risco + artefatos"
```

---

## Task 7: Inferência em lote (`batch_inference.py`)

Aplica o modelo sobre leituras e escreve `data/alerts.json` — o contrato consumido pela API
(Plano 2) e pelo frontend (Plano 3).

**Files:**
- Create: `src/backend/pipelines/batch_inference.py`
- Test: `src/backend/tests/test_batch_inference.py`

- [ ] **Step 1: Escrever o teste que falha**

```python
# src/backend/tests/test_batch_inference.py
import pandas as pd
from src.backend.pipelines.batch_inference import run_batch
from src.backend.pipelines.generate_simulation import generate_readings
from src.backend.pipelines.train_model import train


def _focos():
    return pd.DataFrame({"latitude": [-3.50, -5.78, -12.54], "longitude": [-52.38, -53.00, -55.72]})


def test_run_batch_gera_alertas():
    df = generate_readings(_focos(), n_nodes=120, seed=42)
    model, _ = train(df)
    alerts = run_batch(model, df)
    assert len(alerts) == len(df)
    primeiro = alerts[0]
    assert {"device_id", "latitude", "longitude", "risco", "risco_label"}.issubset(primeiro.keys())
    assert primeiro["risco_label"] in {"Baixo", "Moderado", "Critico"}
    assert primeiro["risco"] in {0, 1, 2}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pytest src/backend/tests/test_batch_inference.py -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Implementar `batch_inference.py`**

```python
# src/backend/pipelines/batch_inference.py
"""Inferência em lote: classifica leituras e escreve data/alerts.json."""
import json
from pathlib import Path

import joblib
import pandas as pd

from src.backend.ml.features import FEATURE_COLUMNS
from src.backend.ml.risk_rules import RISK_LABELS

ALERTS_PATH = Path("data/alerts.json")
MODEL_PATH = Path("src/backend/ml/artifacts/risk_model.joblib")


def run_batch(model, df: pd.DataFrame) -> list[dict]:
    """Prediz o risco de cada leitura e devolve uma lista de alertas serializáveis."""
    preds = model.predict(df[FEATURE_COLUMNS])
    alerts = []
    for (_, row), risco in zip(df.iterrows(), preds):
        risco = int(risco)
        alerts.append(
            {
                "device_id": row["device_id"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "temperatura": float(row["temperatura"]),
                "umidade_ar": float(row["umidade_ar"]),
                "ppm_fumaca": float(row["ppm_fumaca"]),
                "densidade_focos": int(row["densidade_focos"]),
                "risco": risco,
                "risco_label": RISK_LABELS[risco],
            }
        )
    return alerts


def main() -> None:
    from src.backend.pipelines.generate_simulation import generate_readings
    from src.backend.pipelines.ingest_inpe import load_inpe

    model = joblib.load(MODEL_PATH)
    focos = load_inpe("data/inpe_focos_sample.csv")
    df = generate_readings(focos, n_nodes=80, seed=99)
    alerts = run_batch(model, df)
    ALERTS_PATH.write_text(json.dumps(alerts, indent=2, ensure_ascii=False))
    criticos = sum(1 for a in alerts if a["risco"] == 2)
    print(f"{len(alerts)} alertas escritos em {ALERTS_PATH} ({criticos} críticos)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pytest src/backend/tests/test_batch_inference.py -v`
Expected: PASS.

- [ ] **Step 5: Gerar o `alerts.json` real**

Run: `python -m src.backend.pipelines.batch_inference`
Expected: imprime o número de alertas e cria `data/alerts.json`.

- [ ] **Step 6: Rodar a suíte completa**

Run: `pytest src/backend/tests/ -v`
Expected: todos os testes (Tasks 1–7) PASS.

- [ ] **Step 7: Commit**

```bash
git add src/backend/pipelines/batch_inference.py src/backend/tests/test_batch_inference.py data/alerts.json
git commit -m "feat: inferência em lote gerando alerts.json"
```

---

## Self-Review (cobertura do spec)

- **Seção 6 (camada de dados):** `ingest_inpe` (Task 3), `generate_simulation` (Task 5),
  detecção de outlier (Task 2). ✓
- **Seção 7 (ML):** DecisionTree + features vento/umidade/densidade/gás/temp + `metrics.json`
  (Tasks 4, 6). ✓
- **Seção 5 (contrato):** o payload completo da API entra no Plano 2; aqui o `alerts.json`
  (Task 7) já é o contrato de saída consumido por API/frontend. ✓
- **Seção 12 (ground truth por regra física):** `risk_rules.label_risk` (Task 1). ✓
- **Fora deste plano (propositalmente):** API/SQLite/ESP32 → Plano 2; notebook/Folium/Seaborn,
  Next.js, README/PDF → Plano 3.

Consistência de tipos verificada: `FEATURE_COLUMNS`, `RISK_LABELS`, `label_risk`, `build_features`,
`generate_readings`, `train`, `run_batch` usados com a mesma assinatura em todas as tasks.
