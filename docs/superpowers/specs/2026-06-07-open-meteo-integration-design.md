# Open-Meteo — Integração de clima real — Design / Spec

> **Issue:** [#3 — Integrar APIs reais (clima + focos) para estruturar o MVP](https://github.com/maykonsousa/AtmosShield/issues/3)
> **Escopo desta spec:** **somente Open-Meteo** (clima real). NASA FIRMS, INPE BDQueimadas, INMET, OpenAQ e Open-Elevation ficam para specs/issues seguintes.
> **Tipo:** Prova de Conceito (POC) / MVP — FIAP Global Solution 2026.1
> **Status:** Design aprovado, pronto para plano de implementação

---

## 1. Problema

Hoje o backend é majoritariamente sintético. Em particular, o **vento** (`vento_kmh`) é uma
função determinística de lat/lon (`app/services/weather.py::estimate_wind_kmh`), usada tanto no
**treino** (`pipelines/generate_simulation.py`) quanto no **scoring live**
(`app/services/scoring.py`). Isso enfraquece o pitch perante a banca ("100% sintético").

O objetivo é substituir o vento sintético por **dados climáticos reais da Open-Meteo** (sem chave,
grátis) e **enriquecer o modelo com precipitação real**, mantendo a narrativa central do projeto
intacta: o **sensor de solo ESP32 (DHT22/MQ-2) é o "olho no chão"** e a Open-Meteo é a camada
**macro/climática** — não substitui o sensor.

---

## 2. Decisões de design (travadas no brainstorming)

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Escopo | Somente **Open-Meteo**; FIRMS e demais ficam para depois |
| 2 | Fluxos afetados | **Treino E live** — vento real nos dois, modelo retreinado |
| 3 | Robustez (só no live) | Cache por coordenada (TTL) → fallback para o stub determinístico, com marcação de origem |
| 4 | Variáveis | `wind_speed` substitui `vento_kmh`; `precipitation` vira **feature nova**; `soil_moisture` vira **check de calibração** (validação Pandas, **não** é feature do modelo); temp/umidade no live seguem do sensor DHT22 |
| 5 | Janela temporal | **Archive API** no treino (clima histórico no `datahora_gmt` de cada foco); **Forecast API** no live (vento atual + soma de precipitação das próximas ~6h) |
| 6 | Arquitetura de código | Expandir `app/services/weather.py` num serviço único (sem abstração de provedores — YAGNI para um provedor só) |
| 7 | `MetricasSection` (frontend) | **Corrige junto** nesta entrega (os números reais só nascem após o retreino) |
| 8 | Migração do SQLite | **Recriar** o `.db` da POC (descarta dados antigos; aceitável numa POC com DB descartável) |

### Princípio
A lógica de robustez (cache + fallback + timeout) fica **confinada ao fluxo live**. O fluxo de
treino roda offline em batch — se a Archive API falhar, basta rerodar; não precisa de fallback nem
de cache crítico.

---

## 3. Arquitetura

### 3.1 Componente central — `app/services/weather.py` (expandido)

Único ponto que fala com a Open-Meteo. Contrato:

```python
from dataclasses import dataclass

@dataclass
class WeatherObservation:
    wind_kmh: float
    precipitation_mm: float        # soma das próximas ~6h (live) ou da hora do foco (treino)
    soil_moisture: float | None    # m³/m³ (0..~0.5); None se indisponível
    fonte: str                     # "open-meteo" | "cache" | "estimado"

def get_weather(lat: float, lon: float, when: datetime | None = None) -> WeatherObservation: ...

def estimate_wind_kmh(lat: float, lon: float) -> float:  # MANTÉM-SE — vira o fallback
    ...
```

- **`when is None` → Forecast API** (`https://api.open-meteo.com/v1/forecast`)
  - params: `current=wind_speed_10m`, `hourly=precipitation,soil_moisture_0_to_1cm`, `forecast_days=1`
  - `precipitation_mm` = soma das próximas ~6 horas de `hourly.precipitation`
  - `wind_kmh` = `current.wind_speed_10m` (a Open-Meteo já entrega vento em **km/h** por padrão → casa com `vento_kmh`)
- **`when is not None` → Archive API** (`https://archive-api.open-meteo.com/v1/archive`)
  - params: `start_date=end_date=` (a data de `when`), `hourly=wind_speed_10m,precipitation,soil_moisture_0_to_1cm`
  - seleciona a **hora mais próxima** de `when` na série horária
- HTTP via **`httpx`** (já no `requirements.txt`) com **timeout curto** (ex.: 5 s).

### 3.2 Cache + fallback (só no live)

- Cache em memória: `dict[(lat_arred, lon_arred) -> (WeatherObservation, expira_em)]`.
  - Coordenadas **arredondadas a ~3 casas decimais** (~100 m) para agrupar leituras próximas.
  - **TTL configurável** (default ~15 min). O relógio (`time.monotonic`) é **injetável** para teste.
- Ordem de resolução no live:
  1. **API** (Forecast) → grava no cache, `fonte="open-meteo"`.
  2. Falha/timeout → **cache válido** se houver, `fonte="cache"`.
  3. Sem cache válido → **stub determinístico** (`estimate_wind_kmh`), `precipitation_mm=0.0`,
     `soil_moisture=None`, `fonte="estimado"`.
- **Garantia:** o `POST /readings` nunca quebra por falha externa. Demo blindada.

### 3.3 Fluxo LIVE — `POST /readings` → `score_reading`

1. O ESP32 envia `temperatura`, `umidade_ar`, `ppm_fumaca` (DHT22/MQ-2) — **inalterado**.
2. `get_weather(lat, lon)` (Forecast) fornece `wind_kmh` + `precipitation_mm`.
3. Cadeia de fallback conforme 3.2; `fonte` registra a origem.
4. Monta a linha de features (agora incluindo `precipitation_mm`), classifica e persiste com
   `vento_fonte`.

### 3.4 Fluxo TREINO — `pipelines/generate_simulation.py` (offline, batch)

1. Para cada nó sintético, `get_weather(lat, lon, when=foco["datahora_gmt"])` (Archive) fornece
   vento e precipitação **históricos reais** daquela coordenada/momento.
2. Sem cache/fallback crítico (batch). **Mitigação de custo de API:** cachear as respostas da
   Archive num arquivo local (ex.: `data/weather_cache.csv`, keyed por `lat,lon,data`) para não
   rebater a API a cada retreino. (Detalhe de implementação — fica a critério do plano.)
3. `build_features` + `label_risk` (com a nova regra de chuva) → dataset → retreino.

---

## 4. Efeito dominó no ML — nova feature `precipitation_mm`

- **`ml/features.py`**: adicionar `"precipitation_mm"` a `FEATURE_COLUMNS` (passa de 6 → **7
  features**). O valor **não** vem dos focos, então `build_features` (que calcula
  `densidade_focos`/`dist_foco_km`) **não muda**; quem monta a linha injeta a coluna a partir do
  `WeatherObservation`.
- **`ml/risk_rules.py`**: `label_risk` ganha o parâmetro `precipitation_mm` e uma regra que
  **reduz** o score (chuva apaga risco), com **piso em 0**:
  - `precipitation_mm >= 15` → `score -= 2`
  - `precipitation_mm >= 5`  → `score -= 1`
  - (limiares iniciais; ajustáveis se a distribuição do dataset pedir)
- **`pipelines/generate_simulation.py`**: cada nó recebe `precipitation_mm` do `get_weather(...,
  when=...)` e o passa para `label_risk`.
- **`app/services/scoring.py`**: usa `precipitation_mm` do `get_weather` live na linha de features
  e o devolve no resultado.
- **`pipelines/train_model.py`**: **nenhuma mudança estrutural** — `feature_importances` é gerado
  dinamicamente a partir de `FEATURE_COLUMNS`, então a nova feature entra sozinha nas métricas.

---

## 5. `soil_moisture` — check de calibração (não-feature)

- Função pura nova (em `data_quality.py` ou helper de pipeline) que compara a `umidade_ar` do
  sensor com o `soil_moisture` da Open-Meteo e marca **divergência grande** como possível
  descalibração do sensor.
- **Saída puramente diagnóstica** (log / coluna em relatório do batch). **Não entra no modelo** e
  **não cria UI nova**. Escopo mínimo: uma função testável + uso no pipeline de treino.

---

## 6. Schema / DB / contrato da API

- **`app/schemas.py` → `RiskAlertOut`**: adicionar `precipitation_mm: float` e `vento_fonte: str`.
- **`app/db.py`**: `SCHEMA` e `_COLUMNS` ganham `precipitation_mm REAL` e `vento_fonte TEXT`.
  - ⚠️ `CREATE TABLE IF NOT EXISTS` **não migra** tabela existente. Decisão: **recriar** o
    `data/atmosshield.db` da POC (apagar o arquivo e deixar o `init_db` recriá-lo). Aceitável por
    ser DB descartável de POC.
- **`app/routers/readings.py`**: propaga `precipitation_mm` e `vento_fonte` no dicionário `alert`.

---

## 7. Frontend — correção da `MetricasSection`

O componente `src/frontend/src/components/MetricasSection.tsx` está factualmente errado e ficará
ainda mais defasado após o retreino. Correções (valores reais lidos de `ml/artifacts/metrics.json`
pós-retreino):

- **Acurácia / texto**: remover "Validação cruzada k=5" e "Resultado estável 87%–91%" (não existem —
  há só um split único 75/25). Manter acurácia real (~89% — confirmar pós-retreino).
- **Importância das variáveis**: substituir os valores inventados (88/76/71/65) pelos **reais** do
  `metrics.json`, e incluir as features hoje omitidas (`ppm_fumaca`, `densidade_focos`) **+ a nova
  `precipitation`** — total de 7 features.
- **Bloco VP/VN/FP/FN binário**: trocar pela **matriz de confusão 3×3** (modelo tem 3 classes).
- **Painel `modelo.info()`**: corrigir para `DecisionTreeClassifier` (não `RandomForestClassifier`),
  remover `n_estimators`, e atualizar a contagem de features (7) e a acurácia real.

> ⚠️ **Nota Next.js (frontend):** `src/frontend/AGENTS.md` avisa que esta versão do Next tem
> breaking changes — ler `node_modules/next/dist/docs/` antes de escrever código de frontend.
> Para esta tarefa as mudanças são em dados/conteúdo de um componente existente, sem novas APIs do
> framework, mas o plano deve respeitar essa diretriz.

---

## 8. Estratégia de testes

- **`tests/test_weather.py`** (expandir): mockar `httpx` para:
  - seleção de endpoint (Forecast quando `when is None`, Archive quando `when` é data passada);
  - parsing correto de `wind_kmh` / `precipitation_mm` (soma 6h) / `soil_moisture`;
  - **cadeia de fallback** completa: API falha → cache válido → stub, com `fonte` correto em cada
    caso;
  - TTL/relógio injetável (sem `time.sleep` real).
  - **Nenhum teste faz rede real.**
- **`tests/test_features.py`**: `precipitation_mm` presente em `FEATURE_COLUMNS` (7 features).
- **`tests/` (risk_rules)**: nova regra de chuva — casos de redução de score e piso em 0.
- **`tests/test_scoring_service.py` / `test_api.py`**: integração com `get_weather` mockado;
  `precipitation_mm` e `vento_fonte` presentes na resposta.
- **`soil_moisture`**: teste da função de calibração (divergência → flag).

---

## 9. Fora de escopo (explícito)

- NASA FIRMS, INPE BDQueimadas, INMET, OpenAQ, Open-Elevation/Topo (specs/issues futuras).
- `wind_direction_10m` como feature derivada (bearing relativo ao foco) — adiável.
- `soil_moisture` como feature do modelo — fica só como check de calibração.
- Migração que preserva dados do SQLite (decidiu-se recriar).
- Qualquer UI nova além da correção factual da `MetricasSection`.

---

## 10. Resumo dos arquivos tocados

| Arquivo | Mudança |
|---------|---------|
| `src/backend/app/services/weather.py` | Expandir: `WeatherObservation`, `get_weather`, cache+fallback; manter `estimate_wind_kmh` como fallback |
| `src/backend/ml/features.py` | `+ "precipitation_mm"` em `FEATURE_COLUMNS` |
| `src/backend/ml/risk_rules.py` | `label_risk` ganha `precipitation_mm` + regra de redução |
| `src/backend/pipelines/generate_simulation.py` | `get_weather(when=foco.datahora_gmt)` (Archive) por nó; passa precip ao `label_risk` |
| `src/backend/app/services/scoring.py` | usa `get_weather` live; devolve `precipitation_mm` + `vento_fonte` |
| `src/backend/app/schemas.py` | `RiskAlertOut += precipitation_mm, vento_fonte` |
| `src/backend/app/db.py` | schema/colunas `+ precipitation_mm, vento_fonte`; recriar `.db` |
| `src/backend/app/routers/readings.py` | propaga campos novos |
| `src/backend/data_quality.py` (ou helper) | função de calibração `soil_moisture` vs sensor |
| `src/frontend/src/components/MetricasSection.tsx` | correção factual (importâncias, matriz 3×3, `modelo.info()`) |
| `src/backend/tests/*` | cobertura conforme §8 |
