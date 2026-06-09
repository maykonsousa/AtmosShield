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
    // Override por URL (?lat=&lon=) — útil para apresentações/demo: força uma região
    // específica sem depender da geolocalização do navegador.
    const sp = new URLSearchParams(window.location.search);
    const qLat = sp.get("lat");
    const qLon = sp.get("lon");
    if (qLat !== null && qLon !== null && Number.isFinite(Number(qLat)) && Number.isFinite(Number(qLon))) {
      buscar(Number(qLat), Number(qLon));
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setTimeout(() => buscar(), 0);
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
