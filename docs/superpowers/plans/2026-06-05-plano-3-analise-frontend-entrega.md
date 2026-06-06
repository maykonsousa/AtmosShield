# AtmosShield — Plano 3: Análise + Frontend + Entrega — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o AtmosShield com a camada de visualização e entrega: um gerador de visualizações (mapa de calor Folium + gráficos Seaborn/Matplotlib) que produz o material do vídeo; pequenas adições na API para o dashboard; o README da FIAP preenchido pelo template + roteiro de vídeo; e o frontend Next.js (landing page polida + dashboard estático), construído por último como camada aditiva.

**Architecture:** A análise (`src/analysis/`) consome os artefatos do Plano 1/2 (`data/alerts.json`, `data/inpe_focos_sample.csv`, `metrics.json`) e escreve imagens/HTML em `docs/images/`. A API ganha `GET /stats` e filtro em `GET /alerts` (e move `init_db` para o `lifespan`). O frontend (`src/frontend/`, Next.js + Tailwind) é estático: a landing page apresenta o projeto e o dashboard lê um snapshot `alerts.json` (sem backend ao vivo — a escada de segurança acordada). O frontend é gerado com o skill de design (frontend-design / impeccable).

**Tech Stack:** Python (pandas, folium, seaborn, matplotlib, pytest); FastAPI (adições); Next.js + TypeScript + Tailwind + react-leaflet (frontend).

---

## File Structure

```
src/backend/config.py               # + IMAGES_DIR
src/analysis/
  __init__.py
  visuals.py                        # build_risk_heatmap, plot_confusion_matrix, plot_feature_importance, plot_risk_distribution
  generate_report.py                # main: gera todas as imagens em docs/images/
src/backend/app/
  db.py                             # + filtro risco em fetch_recent, + stats_by_risk
  deps.py                           # get_db deixa de inicializar schema (movido p/ lifespan)
  main.py                           # lifespan inicializa o schema; inclui router stats
  routers/
    alerts.py                       # + query param ?risco=
    stats.py                        # GET /stats
src/backend/tests/
  test_visuals.py                   # testa as 4 funções de visualização
  test_api.py                       # + test_stats, test_alerts_filtra_por_risco
docs/
  images/                           # mapa_calor.html + 3 PNGs (gerados, commitados)
  video_script.md                   # roteiro do vídeo de 5 min
README.md                           # template FIAP preenchido (substitui o stub)
src/frontend/                       # Next.js (landing + dashboard estático)
  public/alerts.json                # snapshot estático consumido pelo dashboard
```

---

## Task 1: Visualizações (Folium + Seaborn)

**Files:**
- Modify: `src/backend/config.py` (adiciona `IMAGES_DIR`)
- Create: `src/analysis/__init__.py`, `src/analysis/visuals.py`, `src/analysis/generate_report.py`
- Test: `src/backend/tests/test_visuals.py`

- [ ] **Step 1: Adicionar `IMAGES_DIR` ao `config.py`**

Depois da linha `ALERTS_JSON = DATA_DIR / "alerts.json"`, adicione:
```python
IMAGES_DIR = REPO_ROOT / "docs" / "images"
```

- [ ] **Step 2: Criar o pacote de análise**

Run: `mkdir -p src/analysis && touch src/analysis/__init__.py`

- [ ] **Step 3: Escrever o teste que falha — `src/backend/tests/test_visuals.py`**

```python
import folium
import pandas as pd
from src.analysis.visuals import (
    build_risk_heatmap, plot_confusion_matrix, plot_feature_importance, plot_risk_distribution,
)

FOCOS = pd.DataFrame({"latitude": [-3.5, -5.8], "longitude": [-52.4, -53.0], "municipio": ["A", "B"]})
ALERTS = [
    {"device_id": "n1", "latitude": -3.5, "longitude": -52.4, "risco": 2, "risco_label": "Critico"},
    {"device_id": "n2", "latitude": -5.8, "longitude": -53.0, "risco": 0, "risco_label": "Baixo"},
]
METRICS = {
    "confusion_matrix": [[10, 0, 0], [0, 5, 1], [0, 1, 8]],
    "feature_importances": {
        "temperatura": 0.70, "vento_kmh": 0.10, "umidade_ar": 0.05,
        "ppm_fumaca": 0.05, "dist_foco_km": 0.05, "densidade_focos": 0.05,
    },
}


def test_heatmap_retorna_mapa_folium():
    m = build_risk_heatmap(FOCOS, ALERTS)
    assert isinstance(m, folium.Map)


def test_confusion_matrix_gera_imagem(tmp_path):
    p = plot_confusion_matrix(METRICS, tmp_path / "cm.png")
    assert p.exists() and p.stat().st_size > 0


def test_feature_importance_gera_imagem(tmp_path):
    p = plot_feature_importance(METRICS, tmp_path / "fi.png")
    assert p.exists() and p.stat().st_size > 0


def test_risk_distribution_gera_imagem(tmp_path):
    p = plot_risk_distribution(ALERTS, tmp_path / "rd.png")
    assert p.exists() and p.stat().st_size > 0
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_visuals.py -v`
Expected: FAIL com ModuleNotFoundError.

- [ ] **Step 5: Implementar `src/analysis/visuals.py`**

```python
"""Visualizações do AtmosShield: mapa de calor (Folium) e gráficos (Seaborn/Matplotlib)."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # backend headless (sem display)
import matplotlib.pyplot as plt  # noqa: E402
import seaborn as sns  # noqa: E402
import pandas as pd  # noqa: E402
import folium  # noqa: E402

RISK_COLORS = {0: "green", 1: "orange", 2: "red"}
RISK_NAMES = {0: "Baixo", 1: "Moderado", 2: "Critico"}


def build_risk_heatmap(focos_df: pd.DataFrame, alerts: list[dict]) -> folium.Map:
    """Mapa Folium: focos de satélite (INPE) + nós/alertas coloridos por risco."""
    center = [float(focos_df["latitude"].mean()), float(focos_df["longitude"].mean())]
    m = folium.Map(location=center, zoom_start=5, tiles="CartoDB positron")
    for _, f in focos_df.iterrows():
        folium.CircleMarker(
            [f["latitude"], f["longitude"]], radius=4, color="#8B0000",
            fill=True, fill_opacity=0.5,
            popup=f"Foco INPE — {f.get('municipio', '')}",
        ).add_to(m)
    for a in alerts:
        folium.CircleMarker(
            [a["latitude"], a["longitude"]], radius=7,
            color=RISK_COLORS.get(a["risco"], "gray"), fill=True, fill_opacity=0.9,
            popup=f"{a['device_id']} — {a['risco_label']}",
        ).add_to(m)
    return m


def plot_confusion_matrix(metrics: dict, out_path) -> Path:
    cm = metrics["confusion_matrix"]
    labels = [RISK_NAMES[i] for i in range(len(cm))]
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Reds", xticklabels=labels, yticklabels=labels, ax=ax)
    ax.set_xlabel("Previsto")
    ax.set_ylabel("Real")
    ax.set_title("Matriz de Confusão — Risco de Alastramento")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return Path(out_path)


def plot_feature_importance(metrics: dict, out_path) -> Path:
    s = pd.Series(metrics["feature_importances"]).sort_values()
    fig, ax = plt.subplots(figsize=(6, 4))
    sns.barplot(x=s.values, y=list(s.index), color="#c0392b", ax=ax)
    ax.set_title("Importância das Features")
    ax.set_xlabel("Importância")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return Path(out_path)


def plot_risk_distribution(alerts: list[dict], out_path) -> Path:
    df = pd.DataFrame(alerts)
    order = ["Baixo", "Moderado", "Critico"]
    counts = df["risco_label"].value_counts().reindex(order, fill_value=0)
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.bar(order, counts.values, color=["#27ae60", "#f39c12", "#c0392b"])
    ax.set_title("Distribuição de Risco dos Alertas")
    ax.set_xlabel("Risco")
    ax.set_ylabel("Nós")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return Path(out_path)
```

- [ ] **Step 6: Implementar `src/analysis/generate_report.py`**

```python
"""Gera todas as visualizações do AtmosShield em docs/images/."""
import json

from src.backend.config import FOCOS_CSV, ALERTS_JSON, METRICS_PATH, IMAGES_DIR
from src.backend.pipelines.ingest_inpe import load_inpe
from src.analysis.visuals import (
    build_risk_heatmap, plot_confusion_matrix, plot_feature_importance, plot_risk_distribution,
)


def main() -> None:
    focos = load_inpe(str(FOCOS_CSV))
    alerts = json.loads(ALERTS_JSON.read_text())
    metrics = json.loads(METRICS_PATH.read_text())

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    build_risk_heatmap(focos, alerts).save(str(IMAGES_DIR / "mapa_calor.html"))
    plot_confusion_matrix(metrics, IMAGES_DIR / "matriz_confusao.png")
    plot_feature_importance(metrics, IMAGES_DIR / "feature_importance.png")
    plot_risk_distribution(alerts, IMAGES_DIR / "distribuicao_risco.png")
    print(f"Visualizações geradas em {IMAGES_DIR}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 7: Rodar e ver passar**

Run: `.venv/bin/pytest src/backend/tests/test_visuals.py -v`
Expected: PASS (4 testes).

- [ ] **Step 8: Gerar as imagens reais**

Run: `.venv/bin/python -m src.analysis.generate_report`
Expected: cria `docs/images/mapa_calor.html`, `matriz_confusao.png`, `feature_importance.png`, `distribuicao_risco.png`.

- [ ] **Step 9: Rodar a suíte completa**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: todos passam (34 + 4 = 38).

- [ ] **Step 10: Commit (incluindo as imagens geradas)**

```bash
git add src/backend/config.py src/analysis/ src/backend/tests/test_visuals.py docs/images/
git commit -m "feat: visualizações (mapa Folium + gráficos Seaborn) em docs/images"
```

---

## Task 2: Adições na API (stats + filtro + init no lifespan)

**Files:**
- Modify: `src/backend/app/db.py`, `src/backend/app/deps.py`, `src/backend/app/main.py`, `src/backend/app/routers/alerts.py`
- Create: `src/backend/app/routers/stats.py`
- Test: adiciona testes em `src/backend/tests/test_api.py`

- [ ] **Step 1: Escrever os testes que falham (acrescente ao `test_api.py`)**

```python
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `.venv/bin/pytest src/backend/tests/test_api.py -v`
Expected: os 2 novos FALHAM (sem /stats; ?risco ignorado).

- [ ] **Step 3: Estender `src/backend/app/db.py`**

Substitua `fetch_recent` e adicione `stats_by_risk`:
```python
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
```

- [ ] **Step 4: Mover a criação do schema para o `lifespan` — `src/backend/app/deps.py`**

```python
"""Dependências do FastAPI."""
from src.backend.app import db


def get_db():
    """Fornece uma conexão SQLite por request (o schema é criado no lifespan da app)."""
    conn = db.get_conn()
    try:
        yield conn
    finally:
        conn.close()
```

- [ ] **Step 5: Atualizar `src/backend/app/main.py`** (lifespan cria o schema + inclui o router stats)

```python
"""Aplicação FastAPI do AtmosShield."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.backend.app import db
from src.backend.app.routers import health, readings, alerts, stats
from src.backend.app.services.scoring import load_model, load_focos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # cria o schema uma vez e carrega modelo/focos
    conn = db.get_conn()
    db.init_db(conn)
    conn.close()
    app.state.model = load_model()
    app.state.focos = load_focos()
    yield


app = FastAPI(title="AtmosShield API", version="0.1.0", lifespan=lifespan)
app.include_router(health.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(stats.router)
```

- [ ] **Step 6: Adicionar o query param em `src/backend/app/routers/alerts.py`**

```python
"""GET /alerts — lista as leituras classificadas mais recentes."""
from fastapi import APIRouter, Depends

from src.backend.app import db
from src.backend.app.deps import get_db
from src.backend.app.schemas import RiskAlertOut

router = APIRouter()


@router.get("/alerts", response_model=list[RiskAlertOut])
def get_alerts(risco: int | None = None, conn=Depends(get_db)):
    rows = db.fetch_recent(conn, limit=100, risco=risco)
    alerts = []
    for r in rows:
        d = dict(r)
        d["is_outlier"] = bool(d["is_outlier"])
        alerts.append(d)
    return alerts
```

- [ ] **Step 7: Criar `src/backend/app/routers/stats.py`**

```python
"""GET /stats — contagem de alertas por risco."""
from fastapi import APIRouter, Depends

from src.backend.app import db
from src.backend.app.deps import get_db

router = APIRouter()


@router.get("/stats")
def get_stats(conn=Depends(get_db)):
    return db.stats_by_risk(conn)
```

- [ ] **Step 8: Rodar e ver passar (suíte inteira)**

Run: `.venv/bin/pytest src/backend/tests/ -v`
Expected: todos passam (38 + 2 = 40).

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/db.py src/backend/app/deps.py src/backend/app/main.py src/backend/app/routers/alerts.py src/backend/app/routers/stats.py src/backend/tests/test_api.py
git commit -m "feat: GET /stats + filtro ?risco em /alerts + init no lifespan"
```

---

## Task 3: README FIAP + roteiro de vídeo

**Files:**
- Modify: `README.md` (substitui o stub pelo template FIAP preenchido)
- Create: `docs/video_script.md`

> **NOTA:** os nomes dos integrantes devem ser fornecidos pelo grupo. Use os nomes reais se já informados; caso contrário, deixe `<NOME DO INTEGRANTE N>` como marcador explícito (a serem preenchidos antes da entrega).

- [ ] **Step 1: Substituir `README.md`** pelo conteúdo (estrutura do template `Global-Solution-1`):

````markdown
# AtmosShield — Prevenção e Alerta de Queimadas via Telemetria e Satélite

## FIAP — Global Solution 2026.1

### 👨‍🎓 Integrantes
- Matheus de França Fantini
- Maykon Eduardo Pereira de Sousa
- Heleno Madeira Pereira
- Samantha Silva Farias

> **QUERO CONCORRER**

## 📜 Descrição

O **AtmosShield** é uma prova de conceito que cruza **dados de satélite (focos de calor do INPE)**
com **sensores de solo ESP32** para detectar e classificar precocemente o risco de alastramento de
queimadas. O nó ESP32 (escala micro) confirma focos ativos em tempo real; a API em Python enriquece
a leitura com variáveis macro (vento) e classifica o risco (Baixo/Moderado/Crítico) com um modelo de
Machine Learning. Mapas de calor e gráficos tornam o risco visível para brigadas e produtores rurais.

Tecnologia espacial a serviço da Terra: o satélite é o "olho no céu", o ESP32 é o "olho no chão".

## 📁 Estrutura de pastas

- **data/** — dados de focos do INPE (amostra) e alertas gerados (`alerts.json`).
- **docs/** — documentação, diagramas, imagens (mapa de calor + gráficos) e roteiro do vídeo.
- **src/backend/** — núcleo Python: ingestão (Pandas), simulação, modelo de ML (scikit-learn) e API (FastAPI + SQLite).
- **src/analysis/** — geração das visualizações (Folium + Seaborn/Matplotlib).
- **src/iot/wokwi/** — firmware do nó ESP32 (DHT22 + MQ-2) simulado no Wokwi.
- **src/frontend/** — aplicação Next.js (landing page + dashboard).

## 🧠 Disciplinas integradas (Fases 3 e 4)

- **Python & Algoritmos:** API FastAPI, pipelines com condicionais e laços.
- **Análise de Dados (Pandas):** limpeza dos focos do INPE e detecção de outliers de sensores.
- **Machine Learning:** `DecisionTreeClassifier` para o Índice de Risco de Propagação.
- **IoT (ESP32):** leitura de fumaça/temperatura e envio HTTP/JSON.
- **Desenvolvimento Web:** interface Next.js + Tailwind.

## 🔧 Como executar

Pré-requisitos: Python 3.11+ (recomendado 3.12) e (opcional) Node 18+ para o frontend.

```bash
# 1. Ambiente Python (usando uv ou venv)
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt

# 2. Treinar o modelo e gerar os alertas
.venv/bin/python -m src.backend.pipelines.train_model
.venv/bin/python -m src.backend.pipelines.batch_inference

# 3. Gerar as visualizações (docs/images/)
.venv/bin/python -m src.analysis.generate_report

# 4. Subir a API
.venv/bin/uvicorn src.backend.app.main:app --port 8000
#   GET  /health   GET /alerts[?risco=2]   GET /stats   POST /readings

# 5. (Opcional) Frontend
cd src/frontend && npm install && npm run dev

# 6. Testes
.venv/bin/pytest src/backend/tests/ -v
```

Para o nó ESP32 no Wokwi, veja `src/iot/wokwi/README.md` (use um túnel ngrok apontando para a API).

A variável de ambiente `ATMOSSHIELD_DB` aponta o SQLite para um arquivo alternativo (testes/staging).

## 📎 Links

- **Repositório:** <LINK DO REPOSITÓRIO>
- **Vídeo demonstrativo (YouTube, não listado):** <LINK DO VÍDEO>

## 📋 Observações

Projeto acadêmico (POC). As `api_key` são estáticas apenas para a demonstração.
````

- [ ] **Step 2: Criar `docs/video_script.md`** (roteiro de 5 min):

```markdown
# Roteiro do Vídeo — AtmosShield (até 5 min)

- **0:00–0:30 | Abertura:** nome do grupo, integrantes e a frase **"QUERO CONCORRER"**.
- **0:30–1:30 | Problema & solução:** impacto das queimadas; como o AtmosShield cruza satélite (INPE)
  com sensores ESP32 de solo para detecção precoce.
- **1:30–2:45 | Demo técnica (hardware + backend):** aproximar fumaça do sensor no Wokwi → payload JSON
  → `POST /readings` na API Python → Pandas filtrando outlier → classificação de risco (ML).
- **2:45–4:15 | Show visual:** dashboard Next.js (mapa de focos + cards de risco) e o mapa de calor
  Folium; alerta crítico em destaque.
- **4:15–5:00 | Conclusão:** impacto ecológico/comercial, integração das disciplinas, link do GitHub.
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/video_script.md
git commit -m "docs: README FIAP (template preenchido) + roteiro de vídeo"
```

---

## Task 4: Frontend — scaffold Next.js + landing page (skill de design)

Esta task usa o skill **frontend-design** (ou **impeccable**) para a qualidade visual. Não há testes
pytest; a verificação é `npm run build` + `npm run lint` + checagem das seções.

**Files:**
- Create: `src/frontend/` (projeto Next.js) com `app/page.tsx` (landing) e estilos.

- [ ] **Step 1: Verificar Node**

Run: `node --version && npm --version`
Expected: Node 18+ e npm presentes. Se ausentes, reporte BLOCKED (precisa de Node para o frontend).

- [ ] **Step 2: Scaffold do Next.js em `src/frontend/`**

Run:
```bash
npx --yes create-next-app@latest src/frontend --typescript --tailwind --app --eslint --src-dir --use-npm --no-turbopack --import-alias "@/*"
```
(Se o prompt interativo aparecer mesmo com as flags, aceite os defaults equivalentes. O resultado deve ter `src/frontend/src/app/page.tsx` e Tailwind configurado.)

- [ ] **Step 3: Construir a landing page** com o skill de design (frontend-design/impeccable).

Substitua `src/frontend/src/app/page.tsx` (e crie componentes em `src/frontend/src/components/` conforme necessário) por uma landing page de **alto padrão visual** com estas seções, na identidade do projeto (urgência/clima, tons de fogo/escuro):
1. **Hero** — nome "AtmosShield", tagline ("Prevenção e alerta de queimadas via telemetria e satélite"), CTA para o dashboard.
2. **O Problema** — queimadas + latência do satélite + falsos positivos.
3. **Como Funciona** — 3 passos: ESP32 (solo) → API + IA (vento/satélite) → Alerta de risco.
4. **Arquitetura** — diagrama simples (satélite + ESP32 + API + dashboard).
5. **Métricas do modelo** — acurácia e principais features (valores fixos do `metrics.json`: acurácia ~0.89; vento, umidade e distância de focos como fatores).
6. **Time** — placeholders dos integrantes.
7. **Rodapé** — FIAP Global Solution 2026.1 + link do repositório.

Conteúdo em português. Sem dependência de backend ao vivo (tudo estático).

- [ ] **Step 4: Verificar build e lint**

Run:
```bash
cd src/frontend && npm run lint && npm run build
```
Expected: lint sem erros; build conclui com sucesso.

- [ ] **Step 5: Ignorar artefatos de build no git**

Garanta que `src/frontend/.gitignore` (criado pelo create-next-app) cobre `node_modules/` e `.next/`.
Confirme que NÃO há `node_modules/` nem `.next/` staged antes de commitar.

- [ ] **Step 6: Commit**

```bash
git add src/frontend
git status   # confirmar que node_modules/ e .next/ NÃO estão staged
git commit -m "feat: frontend Next.js — scaffold + landing page"
```

---

## Task 5: Frontend — dashboard estático (mapa + KPIs)

Usa o skill de design. Verificação por `npm run build` + checagem de que o mapa/cards renderizam a
partir do snapshot estático.

**Files:**
- Create: `src/frontend/public/alerts.json` (snapshot), `src/frontend/src/app/dashboard/page.tsx`, componentes do mapa.

- [ ] **Step 1: Copiar o snapshot de alertas para o frontend**

Run: `cp data/alerts.json src/frontend/public/alerts.json`
(É o contrato estável de 9 chaves do Plano 1/2: device_id, latitude, longitude, temperatura, umidade_ar, ppm_fumaca, densidade_focos, risco, risco_label.)

- [ ] **Step 2: Instalar react-leaflet + leaflet**

Run: `cd src/frontend && npm install react-leaflet leaflet && npm install -D @types/leaflet`

- [ ] **Step 3: Construir o dashboard** (`src/frontend/src/app/dashboard/page.tsx`) com o skill de design:
- **KPIs no topo:** total de nós, e contagem por risco (Baixo/Moderado/Crítico) calculada a partir do `alerts.json` (fetch de `/alerts.json`).
- **Mapa interativo** (react-leaflet) com marcadores nos `latitude`/`longitude`, **coloridos por `risco`** (verde/laranja/vermelho), popup com `device_id` + `risco_label`.
- **Feed/lista de alertas críticos** (risco 2) destacados.
- IMPORTANTE: o mapa do Leaflet precisa de `window`, então o componente do mapa deve ser importado com `dynamic(() => import(...), { ssr: false })`. Importar o CSS do leaflet (`leaflet/dist/leaflet.css`).
- Sem backend ao vivo: tudo lê o `public/alerts.json`.

- [ ] **Step 4: Verificar build**

Run: `cd src/frontend && npm run build`
Expected: build conclui sem erros (atenção ao SSR do Leaflet — deve estar com `ssr:false`).

- [ ] **Step 5: Commit**

```bash
git add src/frontend
git status   # confirmar node_modules/ e .next/ fora do stage
git commit -m "feat: frontend — dashboard estático (mapa de risco + KPIs)"
```

---

## Self-Review (cobertura do spec)

- **Seção 7 (visualização): mapa Folium + Seaborn (matriz de confusão, feature importance) + distribuição** → Task 1. ✓
- **Análise de dados / gráficos (requisito GS):** Task 1 (imagens em `docs/images/`). ✓
- **Camada visual / dashboard (doc):** Tasks 4–5 (landing + dashboard estático lendo JSON — a Opção C acordada). ✓
- **README FIAP (integrantes, "QUERO CONCORRER", como executar, links):** Task 3. ✓
- **Roteiro de vídeo:** Task 3. ✓
- **Carry-forwards do Plano 2:** `init_db` no lifespan, `GET /stats`, filtro `?risco`, visualizar vento (entra na feature importance) → Tasks 1–2. ✓
- **Escada de segurança:** Tasks 1–3 (🟢 garantem nota/entrega) antes das Tasks 4–5 (🟡 frontend aditivo). ✓

Consistência: `IMAGES_DIR` (config) usado por `generate_report`; o snapshot `public/alerts.json` é o
mesmo contrato de 9 chaves; `stats_by_risk`/filtro `?risco` casam com os campos do schema; o dashboard
consome `risco`/`risco_label`/`latitude`/`longitude` que já existem no `alerts.json`.

> **Dependência externa:** as Tasks 4–5 exigem Node/npm e acesso de rede para `create-next-app`/`npm install`.
> Se o ambiente não tiver Node, essas tasks ficam BLOCKED — o núcleo (Tasks 1–3) já garante a nota da GS.
