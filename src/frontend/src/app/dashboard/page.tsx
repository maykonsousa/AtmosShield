"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Alerta } from "@/components/MapaRisco";
import ClimaRegiaoWidget from "@/components/ClimaRegiaoWidget";

const MapaRisco = dynamic(() => import("@/components/MapaRisco"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: "100%" }}
      className="flex items-center justify-center"
    >
      <div
        className="flex flex-col items-center gap-3"
        style={{ fontFamily: "var(--font-share-mono)", color: "#f97316" }}
      >
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(249,115,22,0.2)", borderTopColor: "#f97316" }}
        />
        <span style={{ fontSize: "0.65rem", letterSpacing: "0.15em" }}>CARREGANDO MAPA...</span>
      </div>
    </div>
  ),
});

const KPI_CONFIG = [
  {
    key: "total" as const,
    label: "Total de Nós",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
      </svg>
    ),
    color: "#94a3b8",
    border: "rgba(148,163,184,0.2)",
    bg: "rgba(148,163,184,0.04)",
    glow: "rgba(148,163,184,0.1)",
  },
  {
    key: "Baixo" as const,
    label: "Baixo Risco",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "#22c55e",
    border: "rgba(34,197,94,0.25)",
    bg: "rgba(34,197,94,0.06)",
    glow: "rgba(34,197,94,0.12)",
  },
  {
    key: "Moderado" as const,
    label: "Moderado",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    color: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.06)",
    glow: "rgba(245,158,11,0.12)",
  },
  {
    key: "Critico" as const,
    label: "Crítico",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
    color: "#ef4444",
    border: "rgba(239,68,68,0.25)",
    bg: "rgba(239,68,68,0.06)",
    glow: "rgba(239,68,68,0.15)",
  },
];

function tempoRelativo(iso?: string): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const seg = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (seg < 60) return "agora há pouco";
  const min = Math.round(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

export default function DashboardPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/alerts.json")
      .then((r) => r.json())
      .then((data) => {
        setAlertas(data);
        setLoaded(true);
      })
      .catch(() => {
        setAlertas([]);
        setLoaded(true);
      });
  }, []);

  const stats = useMemo(() => {
    const por = { Baixo: 0, Moderado: 0, Critico: 0 } as Record<string, number>;
    for (const a of alertas) por[a.risco_label] = (por[a.risco_label] ?? 0) + 1;
    return { total: alertas.length, ...por };
  }, [alertas]);

  const criticos = alertas.filter((a) => a.risco === 2);

  // filtro do mapa por nível de risco (null = todos); controlado pelos KPIs
  const [filtro, setFiltro] = useState<string | null>(null);
  const alertasFiltrados = useMemo(
    () => (filtro ? alertas.filter((a) => a.risco_label === filtro) : alertas),
    [alertas, filtro]
  );

  // foco do mapa: ao clicar num alerta crítico, o mapa voa até o sensor
  const [foco, setFoco] = useState<[number, number] | null>(null);

  // seleção bidirecional card<->mapa: id estável do alerta selecionado
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const cardsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const idDe = (a: Alerta) => `${a.device_id}@${a.latitude},${a.longitude}`;

  // ao clicar num sensor no mapa, rola até o card correspondente na lista
  useEffect(() => {
    if (!selecionado) return;
    cardsRef.current[selecionado]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selecionado]);

  return (
    <main
      className="min-h-screen grid-overlay"
      style={{ background: "#0a0b0d", color: "#e2e8f0" }}
    >
      {/* Ambient fire glow top-right */}
      <div
        className="fixed top-0 right-0 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 100% 0%, rgba(220,38,38,0.08) 0%, transparent 65%)",
          zIndex: 0,
        }}
      />
      {/* Ambient ember glow bottom-left */}
      <div
        className="fixed bottom-0 left-0 w-[500px] h-[350px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 0% 100%, rgba(249,115,22,0.07) 0%, transparent 65%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Top navigation bar ── */}
        <nav
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(10,11,13,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 transition-colors duration-200"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              <span style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                VOLTAR
              </span>
            </Link>

            <div
              style={{
                width: "1px",
                height: "16px",
                background: "rgba(255,255,255,0.08)",
              }}
            />

            <span
              className="gradient-fire text-fire-glow"
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "1.4rem",
                letterSpacing: "0.15em",
              }}
            >
              ATMOSSHIELD
            </span>

            <div
              style={{
                fontFamily: "var(--font-share-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.12em",
                color: "#f97316",
                background: "rgba(249,115,22,0.06)",
                border: "1px solid rgba(249,115,22,0.15)",
                padding: "2px 8px",
              }}
            >
              DASHBOARD
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span
              className="status-online"
              style={{ fontFamily: "var(--font-share-mono)" }}
            >
              {loaded ? `${stats.total} NÓS ATIVOS` : "CARREGANDO..."}
            </span>
          </div>
        </nav>

        <div className="flex flex-col gap-0 flex-1 p-4 md:p-6 lg:p-8">
          {/* ── Page title row ── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div
                className="flex items-center gap-3 mb-2"
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.18em",
                  color: "#f97316",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 pulse-ring inline-block" />
                MONITORAMENTO EM TEMPO REAL · TELEMETRIA IoT
              </div>
              <h1
                className="gradient-fire"
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                }}
              >
                MAPA DE RISCO
              </h1>
            </div>

            {criticos.length > 0 && (
              <div
                className="hidden sm:flex items-center gap-2 px-4 py-2 flicker"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.12em",
                  color: "#ef4444",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-ring inline-block" />
                {criticos.length} ALERTA{criticos.length > 1 ? "S" : ""} CRÍTICO{criticos.length > 1 ? "S" : ""}
              </div>
            )}
          </div>

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {KPI_CONFIG.map((cfg) => {
              const value = stats[cfg.key as keyof typeof stats] ?? 0;
              const isTotal = cfg.key === "total";
              const ativo = isTotal ? filtro === null : filtro === cfg.key;
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => setFiltro(isTotal ? null : filtro === cfg.key ? null : cfg.key)}
                  aria-pressed={ativo}
                  title={isTotal ? "Mostrar todos os nós no mapa" : `Filtrar mapa: ${cfg.label}`}
                  className="glass-card relative overflow-hidden text-left transition-all duration-200 cursor-pointer"
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${ativo ? cfg.color : cfg.border}`,
                    padding: "1rem 1.25rem",
                    boxShadow: ativo ? `0 0 0 1px ${cfg.color}, 0 0 24px ${cfg.glow}` : `0 0 20px ${cfg.glow}`,
                    transform: ativo ? "translateY(-2px)" : "none",
                  }}
                >
                  {/* Decorative corner accent */}
                  <div
                    className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 100% 0%, ${cfg.glow} 0%, transparent 70%)`,
                    }}
                  />

                  <div className="flex items-start justify-between mb-3">
                    <div style={{ color: cfg.color, opacity: 0.8 }}>{cfg.icon}</div>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: cfg.color,
                        boxShadow: `0 0 8px ${cfg.color}`,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                      letterSpacing: "0.04em",
                      color: cfg.color,
                      lineHeight: 1,
                    }}
                  >
                    {loaded ? value : "—"}
                  </div>

                  <div
                    style={{
                      fontFamily: "var(--font-share-mono)",
                      fontSize: "0.6rem",
                      letterSpacing: "0.1em",
                      color: "rgba(148,163,184,0.7)",
                      marginTop: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {cfg.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Clima da região do usuário ── */}
          <div className="mb-6">
            <ClimaRegiaoWidget />
          </div>

          {/* ── Main content: Map + Critical alerts ── */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Map panel */}
            <div
              className="xl:col-span-2 flex flex-col glass-card overflow-hidden"
              style={{
                border: "1px solid rgba(249,115,22,0.12)",
                background: "rgba(15,17,23,0.6)",
              }}
            >
              {/* Map header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "var(--font-share-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.12em",
                      color: "#f97316",
                    }}
                  >
                    DISTRIBUIÇÃO GEOGRÁFICA · BRASIL
                    {filtro && (
                      <span style={{ color: "#94a3b8" }}>
                        {"  ·  FILTRO: "}
                        {filtro.toUpperCase()} ({alertasFiltrados.length})
                      </span>
                    )}
                  </span>
                </div>

                {/* Legend — também funciona como filtro (sincronizada com os KPIs) */}
                <div className="flex items-center gap-3">
                  {[
                    { color: "#22c55e", label: "Baixo", key: "Baixo" },
                    { color: "#f59e0b", label: "Moderado", key: "Moderado" },
                    { color: "#ef4444", label: "Crítico", key: "Critico" },
                  ].map((l) => {
                    const ativo = filtro === l.key;
                    return (
                      <button
                        key={l.key}
                        type="button"
                        onClick={() => setFiltro(filtro === l.key ? null : l.key)}
                        aria-pressed={ativo}
                        title={`Filtrar mapa: ${l.label}`}
                        className="flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
                        style={{
                          padding: "3px 7px",
                          borderRadius: "999px",
                          border: `1px solid ${ativo ? l.color : "transparent"}`,
                          background: ativo ? `${l.color}1a` : "transparent",
                          opacity: filtro && !ativo ? 0.45 : 1,
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: l.color,
                            boxShadow: `0 0 6px ${l.color}`,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-share-mono)",
                            fontSize: "0.55rem",
                            letterSpacing: "0.08em",
                            color: ativo ? l.color : "#64748b",
                          }}
                        >
                          {l.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map container — explicit height required for Leaflet */}
              <div style={{ height: "70vh", minHeight: "400px", flex: 1 }}>
                <MapaRisco
                  alertas={alertasFiltrados}
                  foco={foco}
                  onSelecionar={(a) => setSelecionado(idDe(a))}
                />
              </div>
            </div>

            {/* Critical alerts panel */}
            <div
              className="flex flex-col glass-card overflow-hidden"
              style={{
                border: "1px solid rgba(239,68,68,0.15)",
                background: "rgba(15,17,23,0.6)",
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-2 h-2 rounded-full pulse-ring"
                  style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-share-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.12em",
                    color: "#ef4444",
                  }}
                >
                  ALERTAS CRÍTICOS
                </span>
                <span
                  className="ml-auto"
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: "1.1rem",
                    letterSpacing: "0.08em",
                    color: "#ef4444",
                  }}
                >
                  {criticos.length}
                </span>
              </div>

              {/* Critical list */}
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(70vh + 28px)" }}>
                {!loaded && (
                  <div className="flex items-center justify-center h-32">
                    <div
                      className="w-5 h-5 border-2 rounded-full animate-spin"
                      style={{ borderColor: "rgba(239,68,68,0.2)", borderTopColor: "#ef4444" }}
                    />
                  </div>
                )}

                {loaded && criticos.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center h-32 gap-2"
                    style={{ color: "#334155" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
                      NENHUM ALERTA CRÍTICO
                    </span>
                  </div>
                )}

                {criticos.map((alerta, idx) => {
                  const id = idDe(alerta);
                  const focado = selecionado === id;
                  return (
                  <button
                    type="button"
                    key={`${alerta.device_id}-${idx}`}
                    ref={(el) => {
                      cardsRef.current[id] = el;
                    }}
                    onClick={() => {
                      setFoco([alerta.latitude, alerta.longitude]);
                      setSelecionado(id);
                    }}
                    title="Centralizar este sensor no mapa"
                    className="group relative block w-full text-left cursor-pointer transition-colors duration-200"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      padding: "0.875rem 1rem",
                      background: focado ? "rgba(239,68,68,0.07)" : "transparent",
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0"
                      style={{
                        width: focado ? "3px" : "2px",
                        background: "linear-gradient(to bottom, #ef4444, rgba(239,68,68,0.2))",
                      }}
                    />

                    {/* Hover bg */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{ background: "rgba(239,68,68,0.03)" }}
                    />

                    <div className="relative flex items-start justify-between gap-2 mb-2">
                      <span
                        style={{
                          fontFamily: "var(--font-share-mono)",
                          fontSize: "0.7rem",
                          letterSpacing: "0.08em",
                          color: "#f87171",
                          fontWeight: 600,
                        }}
                      >
                        {alerta.device_id}
                      </span>
                      <span
                        className="risk-critical shrink-0"
                        style={{
                          fontFamily: "var(--font-share-mono)",
                          fontSize: "0.55rem",
                          letterSpacing: "0.1em",
                          padding: "2px 6px",
                        }}
                      >
                        {alerta.risco_label.toUpperCase()}
                      </span>
                    </div>

                    {/* Localização + horário do registro */}
                    <div
                      className="relative flex items-center justify-between gap-2 mb-2"
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.55rem",
                        letterSpacing: "0.06em",
                        color: "#64748b",
                      }}
                    >
                      <span>
                        ◉ {alerta.latitude.toFixed(3)}, {alerta.longitude.toFixed(3)}
                      </span>
                      {tempoRelativo(alerta.received_at) && (
                        <span className="flex items-center gap-1" style={{ color: "#94a3b8" }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          {tempoRelativo(alerta.received_at)}
                        </span>
                      )}
                    </div>

                    <div className="relative grid grid-cols-2 gap-2">
                      <div
                        style={{
                          background: "rgba(249,115,22,0.06)",
                          border: "1px solid rgba(249,115,22,0.12)",
                          padding: "6px 8px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-share-mono)",
                            fontSize: "0.5rem",
                            letterSpacing: "0.1em",
                            color: "#64748b",
                            marginBottom: "2px",
                          }}
                        >
                          TEMPERATURA
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-bebas)",
                            fontSize: "1.1rem",
                            letterSpacing: "0.06em",
                            color: "#fb923c",
                            lineHeight: 1,
                          }}
                        >
                          {alerta.temperatura}°C
                        </div>
                      </div>

                      <div
                        style={{
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.12)",
                          padding: "6px 8px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-share-mono)",
                            fontSize: "0.5rem",
                            letterSpacing: "0.1em",
                            color: "#64748b",
                            marginBottom: "2px",
                          }}
                        >
                          FUMAÇA (PPM)
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-bebas)",
                            fontSize: "1.1rem",
                            letterSpacing: "0.06em",
                            color: "#f87171",
                            lineHeight: 1,
                          }}
                        >
                          {alerta.ppm_fumaca}
                        </div>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>

              {/* Panel footer */}
              <div
                className="px-4 py-3 shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-share-mono)",
                    fontSize: "0.55rem",
                    letterSpacing: "0.1em",
                    color: "#334155",
                    textAlign: "center",
                  }}
                >
                  FONTE: /alerts.json · ATUALIZAÇÃO ESTÁTICA
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <footer
            className="mt-6 flex items-center justify-between shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}
          >
            <Link
              href="/"
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                fontFamily: "var(--font-share-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                color: "#64748b",
                background: "rgba(249,115,22,0.04)",
                border: "1px solid rgba(249,115,22,0.1)",
                padding: "6px 12px",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fdba74";
                e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.borderColor = "rgba(249,115,22,0.1)";
              }}
            >
              ← VOLTAR À PÁGINA INICIAL
            </Link>

            <div
              style={{
                fontFamily: "var(--font-share-mono)",
                fontSize: "0.55rem",
                letterSpacing: "0.12em",
                color: "#1e293b",
              }}
            >
              ATMOSSHIELD · FIAP · 2025
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
