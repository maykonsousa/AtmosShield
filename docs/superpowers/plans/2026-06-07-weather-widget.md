# Widget de clima ao vivo (dashboard) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao dashboard um widget que mostra o clima real da região do usuário (Open-Meteo) + um indicador qualitativo de risco, via um Route Handler do Next.

**Architecture:** Um Route Handler `GET /api/weather` (server-side, no próprio deploy do Next) busca a Open-Meteo e devolve clima + risco. Um client component (`ClimaRegiaoWidget`) pede geolocalização (com fallback para Altamira/PA) e renderiza o painel "risco em destaque" no dashboard. A heurística de risco fica numa função pura isolada.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), React 19, TypeScript, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-06-07-weather-widget-design.md`

> ⚠️ **Next.js:** `src/frontend/AGENTS.md` avisa que esta versão tem breaking changes. A convenção de Route Handler foi conferida em `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`: `export async function GET(request: Request)` em `app/api/<rota>/route.ts`, retornando `Response.json(...)`. Cache do upstream via `fetch(url, { next: { revalidate: N } })`.

> **Nota sobre testes:** o frontend NÃO tem runner de testes (só `lint` e `build`) e, por YAGNI, este plano NÃO introduz um. A verificação de cada task é `npm run lint` + `npm run build` (typecheck) e, onde indicado, checagem manual com `npm run dev`. A heurística de risco fica numa função pura, isolada e testável caso um runner seja adicionado depois.

> Todos os comandos rodam a partir de `src/frontend/` salvo indicação. O alias `@/` mapeia para `src/frontend/src/`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/frontend/src/lib/clima-risco.ts` | **novo** — função pura `classificarRiscoClima` + tipos |
| `src/frontend/src/app/api/weather/route.ts` | **novo** — Route Handler GET (Open-Meteo + risco) |
| `src/frontend/src/components/ClimaRegiaoWidget.tsx` | **novo** — widget client (geolocalização, estados, layout B) |
| `src/frontend/src/app/dashboard/page.tsx` | inserir o painel entre os KPIs e o grid do mapa |

---

## Task 1: Função pura de risco climático

**Files:**
- Create: `src/frontend/src/lib/clima-risco.ts`

- [ ] **Step 1: Implementar a função pura**

Criar `src/frontend/src/lib/clima-risco.ts`:

```ts
// Heurística qualitativa de risco a partir de variáveis climáticas.
// Espelha o espírito do label_risk do backend, mas NÃO é o modelo de ML
// (não usa sensores nem focos). Serve só para o indicador visual do widget.

export type Clima = {
  temperatura: number;       // °C
  umidade: number;           // %
  vento_kmh: number;         // km/h
  precipitation_mm: number;  // mm (soma das próximas ~6h)
};

export type Risco = {
  nivel: 0 | 1 | 2;
  label: "Baixo" | "Moderado" | "Crítico";
};

export function classificarRiscoClima(c: Clima): Risco {
  let score = 0;

  if (c.umidade <= 20) score += 2;
  else if (c.umidade <= 35) score += 1;

  if (c.vento_kmh >= 30) score += 2;
  else if (c.vento_kmh >= 18) score += 1;

  if (c.temperatura >= 40) score += 2;
  else if (c.temperatura >= 32) score += 1;

  // chuva reduz o risco de ignição/propagação
  if (c.precipitation_mm >= 15) score -= 2;
  else if (c.precipitation_mm >= 5) score -= 1;

  score = Math.max(score, 0);

  if (score >= 4) return { nivel: 2, label: "Crítico" };
  if (score >= 2) return { nivel: 1, label: "Moderado" };
  return { nivel: 0, label: "Baixo" };
}
```

- [ ] **Step 2: Verificar typecheck/lint**

Run: `cd src/frontend && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Conferir a tabela-verdade (sanity manual)**

Confirme, lendo o código, que estes casos batem (não há runner para automatizar):

| temperatura | umidade | vento | precip | score | esperado |
|---|---|---|---|---|---|
| 38 | 30 | 20 | 0 | 1+1+1 = 3 | Moderado |
| 41 | 18 | 32 | 0 | 2+2+2 = 6 | Crítico |
| 38 | 30 | 20 | 16 | 3−2 = 1 | Baixo |
| 25 | 80 | 5 | 20 | 0−2 → 0 | Baixo |
| 33 | 45 | 12 | 0 | 1 | Baixo |

- [ ] **Step 4: Commit**

```bash
cd src/frontend && git add src/lib/clima-risco.ts
git commit -m "feat(front): heurística pura de risco climático (clima-risco.ts)"
```

---

## Task 2: Route Handler `/api/weather`

**Files:**
- Create: `src/frontend/src/app/api/weather/route.ts`

- [ ] **Step 1: Implementar o Route Handler**

Criar `src/frontend/src/app/api/weather/route.ts`:

```ts
import { classificarRiscoClima } from "@/lib/clima-risco";

// Local padrão (região amazônica que aparece nos dados de foco do INPE).
const DEFAULT_LAT = -3.2027;
const DEFAULT_LON = -52.2069;
const DEFAULT_LOCAL = "Altamira, PA";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const PRECIP_WINDOW_H = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  const hasCoords =
    latRaw !== null && lonRaw !== null && Number.isFinite(lat) && Number.isFinite(lon);

  const latitude = hasCoords ? lat : DEFAULT_LAT;
  const longitude = hasCoords ? lon : DEFAULT_LON;
  const local = hasCoords ? "Sua região" : DEFAULT_LOCAL;

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    hourly: "precipitation",
    forecast_days: "1",
  });

  try {
    // cache do upstream por 10 min (revalidate), por URL/coordenada
    const resp = await fetch(`${FORECAST_URL}?${params.toString()}`, {
      next: { revalidate: 600 },
    });
    if (!resp.ok) throw new Error(`open-meteo ${resp.status}`);
    const data = await resp.json();

    const temperatura = Number(data.current.temperature_2m);
    const umidade = Number(data.current.relative_humidity_2m);
    const vento_kmh = Number(data.current.wind_speed_10m);
    const precs: number[] = (data.hourly?.precipitation ?? []).slice(0, PRECIP_WINDOW_H);
    const precipitation_mm = precs.reduce((s, p) => s + (typeof p === "number" ? p : 0), 0);

    const risco = classificarRiscoClima({ temperatura, umidade, vento_kmh, precipitation_mm });

    return Response.json({
      latitude,
      longitude,
      local,
      temperatura: Math.round(temperatura * 10) / 10,
      umidade: Math.round(umidade),
      vento_kmh: Math.round(vento_kmh * 10) / 10,
      precipitation_mm: Math.round(precipitation_mm * 100) / 100,
      risco_nivel: risco.nivel,
      risco_label: risco.label,
      fonte: "open-meteo",
    });
  } catch {
    return Response.json({ erro: "clima indisponível" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Build (typecheck + rota como function)**

Run: `cd src/frontend && npm run build`
Expected: compila; na lista de rotas aparece `/api/weather` (function/dynamic).

- [ ] **Step 3: Verificação manual (rede real)**

Run:
```bash
cd src/frontend && npm run dev &
sleep 4
curl -s "http://localhost:3000/api/weather" ; echo
curl -s "http://localhost:3000/api/weather?lat=-23.55&lon=-46.63" ; echo
kill %1 2>/dev/null
```
Expected: o primeiro retorna `"local":"Altamira, PA"` + campos de clima + `risco_label`; o segundo retorna `"local":"Sua região"` para São Paulo. Ambos com `"fonte":"open-meteo"`. (Se não houver rede, o handler responde `{"erro":"clima indisponível"}` com 502 — aceitável.)

- [ ] **Step 4: Commit**

```bash
cd src/frontend && git add src/app/api/weather/route.ts
git commit -m "feat(front): Route Handler /api/weather (Open-Meteo + risco, cache 10min)"
```

---

## Task 3: Componente `ClimaRegiaoWidget`

**Files:**
- Create: `src/frontend/src/components/ClimaRegiaoWidget.tsx`

- [ ] **Step 1: Implementar o componente (client)**

Criar `src/frontend/src/components/ClimaRegiaoWidget.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type ClimaResp = {
  latitude: number;
  longitude: number;
  local: string;
  temperatura: number;
  umidade: number;
  vento_kmh: number;
  precipitation_mm: number;
  risco_nivel: 0 | 1 | 2;
  risco_label: string;
  fonte: string;
};

const RISCO_COR: Record<number, string> = { 0: "#22c55e", 1: "#f59e0b", 2: "#ef4444" };
const RISCO_DESC: Record<number, string> = {
  0: "condições desfavoráveis à propagação",
  1: "atenção · condições moderadas",
  2: "condições favoráveis à propagação",
};

const METRICAS: { key: keyof ClimaResp; label: string; unidade: string; cor: string }[] = [
  { key: "temperatura", label: "Temperatura", unidade: "°C", cor: "#fb923c" },
  { key: "umidade", label: "Umidade", unidade: "%", cor: "#38bdf8" },
  { key: "vento_kmh", label: "Vento", unidade: "km/h", cor: "#cbd5e1" },
  { key: "precipitation_mm", label: "Chuva", unidade: "mm", cor: "#60a5fa" },
];

const MONO = "var(--font-share-mono)";
const BEBAS = "var(--font-bebas)";

export default function ClimaRegiaoWidget() {
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [clima, setClima] = useState<ClimaResp | null>(null);
  const [usouDefault, setUsouDefault] = useState(false);

  const buscar = useCallback(async (lat?: number, lon?: number) => {
    setEstado("loading");
    try {
      const qs = lat != null && lon != null ? `?lat=${lat}&lon=${lon}` : "";
      const r = await fetch(`/api/weather${qs}`);
      if (!r.ok) throw new Error("api");
      const data: ClimaResp = await r.json();
      setClima(data);
      setUsouDefault(lat == null);
      setEstado("ok");
    } catch {
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      buscar();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => buscar(pos.coords.latitude, pos.coords.longitude),
      () => buscar(), // negado / erro → default
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [buscar]);

  return (
    <div
      className="glass-card overflow-hidden"
      style={{ border: "1px solid rgba(249,115,22,0.12)", background: "rgba(15,17,23,0.6)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.12em", color: "#f97316" }}>
          CLIMA NA SUA REGIÃO · OPEN-METEO
        </span>
        <span style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.1em", color: "#475569" }}>
          INDICADOR CLIMÁTICO (NÃO-ML)
        </span>
      </div>

      <div className="p-4">
        {estado === "loading" && (
          <div className="flex items-center justify-center gap-3" style={{ minHeight: "120px" }}>
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: "rgba(249,115,22,0.2)", borderTopColor: "#f97316" }}
            />
            <span style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.12em", color: "#f97316" }}>
              BUSCANDO CLIMA DA SUA REGIÃO…
            </span>
          </div>
        )}

        {estado === "error" && (
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "120px" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.1em", color: "#64748b" }}>
              CLIMA INDISPONÍVEL NO MOMENTO
            </span>
            <button
              onClick={() => buscar()}
              style={{
                fontFamily: MONO,
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                color: "#fdba74",
                background: "rgba(249,115,22,0.06)",
                border: "1px solid rgba(249,115,22,0.2)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        )}

        {estado === "ok" && clima && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foco: risco */}
            <div
              style={{
                background: `${RISCO_COR[clima.risco_nivel]}14`,
                border: `1px solid ${RISCO_COR[clima.risco_nivel]}40`,
                borderRadius: "6px",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.12em", color: "#64748b" }}>
                RISCO NA SUA REGIÃO
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: RISCO_COR[clima.risco_nivel],
                    boxShadow: `0 0 8px ${RISCO_COR[clima.risco_nivel]}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: BEBAS,
                    fontSize: "2rem",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    color: RISCO_COR[clima.risco_nivel],
                  }}
                >
                  {clima.risco_label.toUpperCase()}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "#94a3b8", marginTop: "6px" }}>
                {RISCO_DESC[clima.risco_nivel]}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.08em", color: "#64748b", marginTop: "10px" }}>
                ◉ {clima.local}
                {usouDefault && (
                  <span style={{ color: "#475569" }}> · local padrão · permita a localização para ver sua região</span>
                )}
              </span>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2">
              {METRICAS.map((m) => (
                <div
                  key={m.key}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "4px",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.1em", color: "#64748b" }}>
                    {m.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: BEBAS, fontSize: "1.4rem", letterSpacing: "0.04em", color: m.cor, lineHeight: 1.1 }}>
                    {clima[m.key] as number}
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}> {m.unidade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `cd src/frontend && npm run lint && npm run build`
Expected: lint limpo, build compila sem erro de tipos.

- [ ] **Step 3: Commit**

```bash
cd src/frontend && git add src/components/ClimaRegiaoWidget.tsx
git commit -m "feat(front): ClimaRegiaoWidget (geolocalização, estados, layout risco-em-destaque)"
```

---

## Task 4: Integrar o widget no dashboard

**Files:**
- Modify: `src/frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Importar o componente**

No topo de `src/frontend/src/app/dashboard/page.tsx`, depois da linha `import type { Alerta } from "@/components/MapaRisco";`, adicionar:

```tsx
import ClimaRegiaoWidget from "@/components/ClimaRegiaoWidget";
```

- [ ] **Step 2: Inserir o painel entre os KPIs e o grid do mapa**

No JSX, o bloco dos KPIs termina com `</div>` logo após o `.map(...)` (a div com `className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"`). Imediatamente APÓS o fechamento desse bloco de KPIs e ANTES do comentário `{/* ── Main content: Map + Critical alerts ── */}`, inserir:

```tsx
          {/* ── Clima da região do usuário ── */}
          <div className="mb-6">
            <ClimaRegiaoWidget />
          </div>
```

- [ ] **Step 3: Lint + build**

Run: `cd src/frontend && npm run lint && npm run build`
Expected: lint limpo, build compila.

- [ ] **Step 4: Verificação manual no navegador**

Run: `cd src/frontend && npm run dev` e abrir `http://localhost:3000/dashboard`.
Conferir:
1. Ao permitir a localização → o painel mostra "Sua região" + dados reais.
2. Ao negar/ignorar a permissão (ou após ~8s de timeout) → fallback "Altamira, PA" com a nota de local padrão.
3. Estado de erro: com o dev server, em DevTools → Network, bloquear `/api/weather` (ou desligar a rede) e recarregar → aparece "CLIMA INDISPONÍVEL" + botão "Tentar novamente"; ao restaurar e clicar, recarrega.
Encerrar o dev server depois (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
cd src/frontend && git add src/app/dashboard/page.tsx
git commit -m "feat(front): painel de clima da região no dashboard (entre KPIs e mapa)"
```

---

## Task 5: Verificação final

**Files:** nenhuma alteração — só verificação.

- [ ] **Step 1: Lint + build limpos**

Run: `cd src/frontend && npm run lint && npm run build`
Expected: lint sem erros; build compila com a rota `/api/weather` listada.

- [ ] **Step 2: Checklist manual dos 3 estados**

Com `npm run dev`, validar em `http://localhost:3000/dashboard`: (a) permissão concedida, (b) permissão negada → default Altamira, (c) erro de API → retry. Confirmar que o restante do dashboard (KPIs, mapa, alertas) continua funcionando.

- [ ] **Step 3: Commit final (se necessário)**

Se nenhum ajuste foi preciso, não há o que commitar — a feature está completa.

---

## Self-review (cobertura da spec)

- §3.1 função pura `classificarRiscoClima` → Task 1 ✅
- §3.2 Route Handler `/api/weather` (default Altamira, fetch Open-Meteo, soma 6h precip, cache 600s, 502 em falha) → Task 2 ✅
- §3.3 contrato de resposta → Task 2 (objeto `Response.json`) ✅
- §4 componente client: geolocalização com timeout, 4 estados, layout B, "indicador não-ML" → Task 3 ✅
- §4 nome do local (default "Altamira, PA" / usuário "Sua região") → Tasks 2 e 3 ✅
- §5 integração no dashboard (entre KPIs e mapa) → Task 4 ✅
- §6 tratamento de erros (geoloc timeout→default; API→502→retry) → Tasks 2, 3 ✅
- §7 verificação por lint+build+manual, sem runner → Tasks 1–5 ✅
