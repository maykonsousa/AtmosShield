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
cada leitura com **clima real (vento e precipitação) da Open-Meteo** e classifica o risco
(Baixo/Moderado/Crítico) com um modelo de Machine Learning. Os focos de calor são provenientes do
INPE. Mapas de calor e gráficos tornam o risco visível para brigadas e produtores rurais.

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
- **Machine Learning:** `RandomForestClassifier (100 árvores)` para o Índice de Risco de Propagação.
- **IoT (ESP32):** leitura de fumaça/temperatura e envio HTTP/JSON.
- **Desenvolvimento Web:** interface Next.js + Tailwind.

## 🔧 Como executar

Pré-requisitos: Python 3.11+ (recomendado 3.12) e (opcional) Node 18+ para o frontend.

```bash
# 1. Ambiente Python (usando uv ou venv)
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt

# 2. Treinar o modelo e gerar os alertas (requer internet — consome a API Archive da Open-Meteo)
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

- **Repositório:** https://github.com/maykonsousa/AtmosShield
- **Vídeo demonstrativo (YouTube):** https://www.youtube.com/watch?v=aOPcbTBA3nE

## 📋 Observações

Projeto acadêmico (POC). As `api_key` são estáticas apenas para a demonstração.
