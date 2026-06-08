# Widget de clima ao vivo (região do usuário) — Design / Spec

> **Contexto:** continuação do trabalho de clima real (Open-Meteo). Adiciona um widget no **dashboard** que mostra o clima em tempo real da região do usuário, conectando o dado real ao propósito do AtmosShield.
> **Escopo:** somente o widget (Route Handler + componente + integração no dashboard). Não toca o backend Python.
> **Status:** Design aprovado, pronto para o plano de implementação.

---

## 1. Objetivo

Exibir, no dashboard, as condições climáticas reais da **região do usuário** (ou de um local
padrão) e um **indicador qualitativo de risco** derivado dessas condições. Reforça a narrativa de
"dados reais" sem depender do backend Python (que não está hospedado).

---

## 2. Decisões de design (travadas no brainstorming)

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Fonte de dados | **Route Handler do Next** `GET /api/weather` (server-side) chama a Open-Meteo. Funciona na landing publicada (Vercel), same-origin, sem CORS, sem depender do backend Python. |
| 2 | Localização | **Geolocation API do browser** com **fallback** para Altamira/PA (`-3.2027, -52.2069`) quando negada/indisponível. |
| 3 | Conteúdo | Temperatura, umidade, vento, precipitação **+ indicador qualitativo de risco**. |
| 4 | Posicionamento | **Painel no dashboard** (`app/dashboard/page.tsx`). |
| 5 | Layout | **Risco em destaque** (foco grande à esquerda + 4 métricas à direita). |
| 6 | Nome do local | Default → "Altamira, PA" (conhecido). Geolocalização do usuário → "Sua região" + coordenadas. Reverse geocoding fica como melhoria futura. |

> ⚠️ **Next.js:** `src/frontend/AGENTS.md` avisa que esta versão (16.2.7) tem breaking changes —
> ler `node_modules/next/dist/docs/` antes de escrever o Route Handler (convenção de
> `app/api/.../route.ts`).

---

## 3. Arquitetura

```
Browser (ClimaRegiaoWidget, client)
  │  1. navigator.geolocation.getCurrentPosition (com timeout)
  │     sucesso → lat/lon do usuário ; negado/timeout → sem coords
  ▼
GET /api/weather?lat=&lon=   (Route Handler do Next, server-side, mesma origem)
  │  2. resolve lat/lon (default Altamira se ausente/inválido)
  │  3. fetch Open-Meteo Forecast (cache do Next ~10 min)
  │  4. classificarRiscoClima(...)  (função pura)
  ▼
JSON do contrato  →  widget renderiza (layout B)
```

### 3.1 Função pura — `src/frontend/src/lib/clima-risco.ts`
```ts
export type Clima = { temperatura: number; umidade: number; vento_kmh: number; precipitation_mm: number };
export type Risco = { nivel: 0 | 1 | 2; label: "Baixo" | "Moderado" | "Crítico" };
export function classificarRiscoClima(c: Clima): Risco
```
Heurística (espelha o `label_risk` do backend, só com variáveis climáticas — **não é o modelo de ML**):

| Fator | Pontos |
|------|--------|
| umidade ≤ 20 | +2 |
| umidade ≤ 35 | +1 |
| vento ≥ 30 | +2 |
| vento ≥ 18 | +1 |
| temperatura ≥ 40 | +2 |
| temperatura ≥ 32 | +1 |
| precipitação ≥ 15 | −2 |
| precipitação ≥ 5 | −1 |

`score = max(score, 0)` → **≥4 = Crítico (2)**, **≥2 = Moderado (1)**, senão **Baixo (0)**.

### 3.2 Route Handler — `src/frontend/src/app/api/weather/route.ts`
- `GET /api/weather?lat=&lon=`.
- Resolve coordenadas: se `lat`/`lon` ausentes ou não-numéricos → default Altamira/PA e `local = "Altamira, PA"`; caso contrário → `local = "Sua região"`.
- Fetch Open-Meteo Forecast: `https://api.open-meteo.com/v1/forecast` com
  `current=temperature_2m,relative_humidity_2m,wind_speed_10m`, `hourly=precipitation`,
  `forecast_days=1`. `precipitation_mm` = soma das próximas ~6h de `hourly.precipitation`.
  (Vento já vem em km/h por padrão.)
- Cache: usar `fetch(url, { next: { revalidate: 600 } })` (10 min) para não bater na API a cada request.
- Chama `classificarRiscoClima` e devolve o **contrato** (§3.3).
- Erro: se a Open-Meteo falhar/timeout → `Response` com status **502** e `{ "erro": "clima indisponível" }`.

### 3.3 Contrato de resposta
```json
{
  "latitude": -3.2027,
  "longitude": -52.2069,
  "local": "Altamira, PA",
  "temperatura": 33.0,
  "umidade": 45,
  "vento_kmh": 12.0,
  "precipitation_mm": 0.0,
  "risco_nivel": 1,
  "risco_label": "Moderado",
  "fonte": "open-meteo"
}
```

---

## 4. Componente — `src/frontend/src/components/ClimaRegiaoWidget.tsx`

Client component (`"use client"`). Ao montar:
1. Chama `navigator.geolocation.getCurrentPosition` com **timeout** (ex.: 8s) e `enableHighAccuracy:false`.
2. Sucesso → `GET /api/weather?lat=&lon=`. Negado/timeout/indisponível → `GET /api/weather` (default).
3. Renderiza conforme o estado.

### Estados
| Estado | UI |
|--------|----|
| Carregando | spinner/skeleton no estilo do dashboard ("buscando clima da sua região…") |
| Sucesso (coords do usuário) | layout B com "Sua região" + coords |
| Permissão negada / indisponível | layout B com default Altamira/PA + nota sutil: "local padrão · permita a localização para ver sua região" |
| Erro de API (502/rede) | estado de erro + botão **Tentar novamente** |

### Layout B (cores consistentes com os KPIs do dashboard)
- **Foco à esquerda:** indicador de **risco** grande — Baixo = verde (`#22c55e`), Moderado = âmbar (`#f59e0b`), Crítico = vermelho (`#ef4444`) — com o nome do local e uma frase curta do porquê.
- **À direita:** 4 métricas (Temperatura °C, Umidade %, Vento km/h, Chuva mm).
- **Responsivo:** em telas pequenas, empilha (foco em cima, métricas embaixo).
- Deixar explícito que é um **indicador de condições climáticas**, não a classificação do modelo de ML.

---

## 5. Integração no dashboard — `src/frontend/src/app/dashboard/page.tsx`

Inserir o `ClimaRegiaoWidget` como **painel `glass-card` full-width entre a linha de KPIs e o
grid do mapa**, com header "CLIMA NA SUA REGIÃO · OPEN-METEO". O componente é client-side e
independente do `fetch("/alerts.json")` existente (não altera o fluxo atual do dashboard).

---

## 6. Tratamento de erros (resumo)

- **Geolocalização negada/timeout/indisponível** → usa o default; nunca trava (timeout no `getCurrentPosition`).
- **Open-Meteo falha** → Route Handler responde 502; widget mostra estado de erro com retry.
- **Resposta malformada** → widget trata como erro (mesmo estado de retry).

---

## 7. Testes / verificação

O frontend **não possui runner de testes** (apenas `lint` e `build`). Para não introduzir um
framework de testes num POC que não tem nenhum (YAGNI):
- A heurística de risco fica numa **função pura** (`clima-risco.ts`), isolada e testável caso um
  runner seja adicionado no futuro.
- **Verificação desta entrega:**
  - `cd src/frontend && npm run lint` — limpo.
  - `npm run build` — compila (incl. a rota `/api/weather` como function).
  - Checagem manual no app rodando: (a) permissão concedida → mostra "Sua região"; (b) permissão
    negada → fallback Altamira com a nota; (c) estado de erro (ex.: simular falha) → botão retry.
- **Sem testes automatizados** nesta entrega — declarado explicitamente.

---

## 8. Fora de escopo

- Reverse geocoding (nome da cidade a partir das coordenadas do usuário).
- Versão do widget na landing pública (decidiu-se dashboard).
- Histórico/série temporal de clima; previsão estendida.
- Uso do modelo de ML real no widget (o indicador é uma heurística climática).
- Endpoint de clima no backend Python (a rota fica no Next).

---

## 9. Arquivos tocados

| Arquivo | Mudança |
|---------|---------|
| `src/frontend/src/lib/clima-risco.ts` | **novo** — função pura `classificarRiscoClima` |
| `src/frontend/src/app/api/weather/route.ts` | **novo** — Route Handler GET (Open-Meteo + risco) |
| `src/frontend/src/components/ClimaRegiaoWidget.tsx` | **novo** — widget (layout B, estados) |
| `src/frontend/src/app/dashboard/page.tsx` | inserir o painel entre KPIs e o mapa |
