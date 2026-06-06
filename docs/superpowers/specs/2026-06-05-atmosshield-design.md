# AtmosShield — Design / Spec

> **Global Solution 2026.1 — FIAP** · Tema: Economia Espacial e Inovação Terrestre
> **Tipo:** Prova de Conceito (POC) / MVP · **Prazo-alvo:** ~09/06/2026 (4 dias)
> **Status:** Design aprovado, pronto para plano de implementação

---

## 1. Problema e proposta

Queimadas são detectadas por satélites do **INPE (BDQueimadas)**, mas com **latência e
falsos positivos** (telhado quente, nuvem, reflexo). Sensores de solo detectam fumaça/gás em
tempo real, porém só localmente. O **AtmosShield cruza as duas escalas**:

- **Macro (espacial):** focos de calor históricos do INPE + variáveis climáticas (vento, umidade).
- **Micro (IoT/solo):** rede de nós **ESP32** confirmando focos ativos em minutos.

O nó ESP32 **dispara o evento**; o modelo de ML **classifica o risco de alastramento**
(Baixo / Moderado / Crítico), reduzindo falso positivo e antecipando o alerta a brigadas e
produtores rurais.

**Narrativa do tema GS:** o satélite é o "olho no céu", o ESP32 é o "olho no chão" — tecnologia
espacial chegando ao produtor em tempo real, numa rede colaborativa B2B/B2G (sensores âncora
do governo + sensores privados homologados).

### Distinção do agropulse (anti-plágio)

A arquitetura espelha o padrão do projeto anterior do grupo (agropulse), mas o AtmosShield é
**genuinamente distinto**: domínio (queimadas vs. agro/seguro), dados (focos INPE vs. operações
agrícolas), features de ML (vento/umidade/densidade de focos vs. insumos) e código escrito do
zero. Nada é copiado.

---

## 2. Escopo (decisão: Opção C + escada de segurança)

Constrói-se em ordem de prioridade. **A nota da GS fica garantida antes de tocar no frontend** —
cada degrau é aditivo, então um eventual estouro de prazo corta só a ponta, nunca o miolo.

| # | Entregável | Prioridade |
|---|---|---|
| 1 | ESP32 (Wokwi) + API + pipelines + ML + notebook de análise | 🟢 Núcleo (garante nota) |
| 2 | Next.js — landing page polida | 🟡 Aditivo |
| 3 | Next.js — dashboard estático (lê JSON gerado pelo `batch_inference`) | 🟡 Aditivo |
| 4 | Auto-refresh / sensação de tempo real sobre o JSON estático | 🔵 Só se sobrar folga |

O dashboard lê um **JSON estático** pré-gerado — sem WebSocket, sem backend no ar durante a
gravação. O "tempo real" do vídeo é simulado por botão/auto-refresh sobre esse JSON. Visual
idêntico, risco eliminado.

---

## 3. Estrutura do repositório (template FIAP `TEMPLATE-TIAO-2026`)

O template exige `README.md` + `docs/` + `src/` + `data/`. Os módulos do projeto vivem dentro
de `src/`:

```
AtmosShield/
├── README.md                 # template FIAP preenchido + "QUERO CONCORRER" em Observações Gerais
├── docs/                     # brainstorming, architecture.mmd/png, video_script, notebook, PDF
├── data/                     # focos INPE (CSV amostra) + dados de simulação gerados
└── src/
    ├── backend/              # FastAPI + ML + pipelines (Python)
    │   ├── app/              # API: routers, schemas, services, auth, db
    │   ├── pipelines/        # ingest_inpe, generate_simulation, train_model, batch_inference
    │   ├── ml/artifacts/     # modelo serializado + metrics.json
    │   └── tests/            # pytest
    ├── iot/wokwi/            # firmware ESP32: .ino, diagram.json, wokwi.toml, README
    └── frontend/             # Next.js (landing + dashboard estático)
```

---

## 4. Arquitetura e fluxo de dados

```
  ESP32 Node (MQ-2 fumaça/gás + DHT22 temp/umidade)
        │  POST JSON /readings  (com api_key)
        ▼
  ┌─────────────────────────────┐      CSV focos INPE (data/)
  │   FastAPI (src/backend)      │◄──── ingest_inpe (Pandas: limpeza + outlier)
  │   /readings · /alerts        │
  └──────────────┬──────────────┘
                 │ feature_builder (densidade de focos próximos + vento + umidade)
                 ▼
        DecisionTreeClassifier → risco {0 Baixo, 1 Moderado, 2 Crítico}
                 │
        batch_inference → data/alerts.json (estático)
                 │
        ┌────────┴───────────────────────┐
        ▼                                 ▼
  docs/ notebook                    src/frontend (Next.js)
  Folium heatmap + Seaborn          landing + dashboard (lê alerts.json)
```

### Fluxo

1. ESP32 lê fumaça (MQ-2) e temperatura/umidade (DHT22) continuamente.
2. Ao detectar anomalia, dispara payload JSON via `HTTP POST /readings`.
3. API valida `api_key` do dispositivo e persiste a leitura.
4. `feature_builder` cruza a leitura com a densidade de focos satelitais próximos + vento + umidade.
5. `DecisionTreeClassifier` classifica o risco de alastramento.
6. `batch_inference` gera `data/alerts.json`; notebook gera mapas/gráficos; frontend exibe.

---

## 5. Contrato de dados (payload do ESP32)

```json
{
  "device_id": "ESP32-PRIV-092",
  "api_key": "atm_shield_secure_token_abc123",
  "leitura": {
    "temperatura": 41.8,
    "umidade_ar": 14.2,
    "ppm_fumaca": 380
  },
  "coordenadas": { "latitude": -23.5329, "longitude": -46.7925 }
}
```

A API valida o `api_key` (homologação de dispositivos âncora vs. privados) e o schema via Pydantic.

---

## 6. Camada de dados (Python — requisitos obrigatórios da GS)

Cumpre **condicionais, laços e manipulação de dados** com Pandas.

- **`ingest_inpe.py`** — lê CSV de focos do INPE (amostra commitada em `data/`), limpa, filtra
  por região e período. Saída: DataFrame normalizado.
- **`generate_simulation.py`** — gera leituras de N nós ESP32 com laços/condicionais. Nós perto
  de focos e com baixa umidade produzem leituras altas; demais, leituras normais. Rotula o
  **ground truth** por **regra física** (muito gás + alta temp + baixa umidade + perto de foco
  + vento forte = Crítico), para o modelo aprender a generalizar.
- **Detecção de outlier (Pandas):** média móvel temporal por dispositivo. Salto isolado
  (ex.: 25 °C → 150 °C em 1 s, sem fumaça nem confirmação de vizinhos) é marcado como sensor
  defeituoso e descartado, evitando alarme falso.

### Confiabilidade dos dados

| Tipo de sensor | Origem | Confiança | Peso no algoritmo |
|---|---|---|---|
| Dados satelitais | INPE (dataset) | Consolidado | Define a mancha macro de risco |
| Sensores âncora | Estações oficiais | Auditado | Validação imediata de alertas |
| Sensores privados | Comunidade / fazendas | Variável (ruído) | Capilaridade; passa por filtro Pandas |

---

## 7. Modelo de Machine Learning

- **Modelo:** `DecisionTreeClassifier` (scikit-learn) — interpretável ("ML introdutório"),
  rende feature importance e árvore visual para o vídeo.
- **Features:** velocidade do vento, umidade relativa do ar, densidade de focos satelitais na
  região (+ leitura de gás/temperatura do nó como reforço).
- **Target:** risco de alastramento `{0 Baixo, 1 Moderado, 2 Crítico}`.
- **Artefatos:** modelo serializado + `metrics.json` (accuracy, matriz de confusão,
  classification report).
- **Visualização (notebook em `docs/`):** EDA dos focos, **mapa de calor Folium** (focos + nós
  ESP32 coloridos por risco) e gráficos Seaborn (focos por região/mês, matriz de confusão,
  feature importance).

---

## 8. Componentes e responsabilidades

### `src/iot/wokwi` (ESP32)
Lê MQ-2 + DHT22, monta o payload e faz POST. Estrutura pronta para hardware real.
Arquivos: `atmosshield_sensor.ino`, `diagram.json`, `wokwi.toml`, `README.md`.

### `src/backend/app` (FastAPI)
- **routers:** `health`, `readings` (POST), `alerts` (GET).
- **schemas:** Pydantic (`SensorReading`, `RiskAlert`).
- **services:** `feature_builder` (cruza leitura + focos + clima), `inference` (carrega modelo, classifica).
- **auth:** validação de `api_key`.
- **db:** **SQLite** (zero infra, persistência real, roda em qualquer máquina na correção).

### `src/backend/pipelines`
Scripts CLI: `ingest_inpe`, `generate_simulation`, `train_model`, `batch_inference`.

### `src/frontend` (Next.js, aditivo)
Landing page (design polido via skill de design) + dashboard estático que lê
`data/alerts.json` (mapa react-leaflet + cards de risco).

### `docs/`
Brainstorming, `architecture.mmd`/`.png`, `video_script.md`, notebook de análise, PDF final.

---

## 9. Testes

`pytest` nos services e endpoints (TestClient): `feature_builder`, `inference`, classificação de
risco, validação de `api_key`, detecção de outlier. TDD onde fizer sentido.

---

## 10. Stack

- **Python 3.11+** — FastAPI, uvicorn, pydantic, pandas, scikit-learn, folium, seaborn,
  matplotlib, pytest.
- **SQLite** (persistência).
- **Next.js + Tailwind** (landing + dashboard estático; react-leaflet para o mapa).
- **Wokwi** (simulação ESP32; firmware em C++/Arduino).

---

## 11. Entregáveis da GS

- **README.md raiz** (template FIAP): integrantes, descrição (≤600 palavras), estrutura, como
  executar, links (vídeo + repo), e **"QUERO CONCORRER"** em Observações Gerais.
- **PDF único:** integrantes na 1ª página, "QUERO CONCORRER", estrutura mínima (Introdução,
  Desenvolvimento, Resultados Esperados, Conclusões), códigos em texto (não print), imagens/
  gráficos/diagramas, link do vídeo ao final. Montado a partir dos artefatos de `docs/`.
- **Vídeo ≤5 min** (YouTube não listado): roteiro já esboçado em `docs/video_script.md`.

---

## 12. Decisões travadas

- **Persistência:** SQLite.
- **Dados INPE:** CSV de amostra commitado em `data/` (sem dependência de download na correção).
- **Ground truth:** rótulo por regra física na simulação; modelo generaliza.
- **Next.js:** Opção C (landing + dashboard estático lendo JSON), construído por último.
- **Estrutura:** template FIAP (`README` + `docs` + `src` + `data`), módulos sob `src/`.

---

## 13. Riscos e mitigações

- **Tempo (4 dias):** escada de prioridade — núcleo garante nota; frontend é aditivo.
- **Real-time frágil:** eliminado via JSON estático.
- **Plágio:** distinção explícita do agropulse (domínio, dados, features, código novo).
- **Dados INPE indisponíveis na correção:** CSV de amostra versionado.
```
