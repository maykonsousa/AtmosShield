"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, StaggerContainer, StaggerItem } from "./Reveal";

// Real feature importances from src/backend/ml/artifacts/metrics.json
// accuracy: 0.9066666..., importances sorted descending
const features = [
  {
    name: "Precipitação",
    weight: 21,
    unit: "mm",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 19.8" />
        <path d="M8 19v1m4-3v3m4-1v1" />
      </svg>
    ),
    color: "#38bdf8",
    desc: "Chuva real reduz o risco de ignição",
  },
  {
    name: "Temperatura",
    weight: 19,
    unit: "°C",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
      </svg>
    ),
    color: "#ef4444",
    desc: "Principal indicador de foco ativo",
  },
  {
    name: "Umidade",
    weight: 19,
    unit: "%",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    ),
    color: "#60a5fa",
    desc: "Baixa umidade amplifica risco",
  },
  {
    name: "Fumaça",
    weight: 17,
    unit: "ppm",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12c.6-3 3-5 6-5 2.7 0 4.6 1.4 5.5 3.5C15 10 16 10 17 10c2.2 0 4 1.8 4 4s-1.8 4-4 4H5a4 4 0 01-3-6.7" />
        <path d="M8 18v2m4-2v2" />
      </svg>
    ),
    color: "#f97316",
    desc: "ppm de fumaça do sensor MQ-2",
  },
  {
    name: "Dist. ao Foco",
    weight: 11,
    unit: "km",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 6.9 8 11.7z" />
      </svg>
    ),
    color: "#fbbf24",
    desc: "Proximidade a focos INPE detectados",
  },
  {
    name: "Vento",
    weight: 7,
    unit: "km/h",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
      </svg>
    ),
    color: "#818cf8",
    desc: "Velocidade e direção afetam propagação",
  },
  {
    name: "Densidade de Focos",
    weight: 6,
    unit: "focos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="2" />
        <circle cx="16" cy="8" r="2" />
        <circle cx="12" cy="16" r="2" />
        <path d="M8 10l4 4m4-4l-4 4" />
      </svg>
    ),
    color: "#f59e0b",
    desc: "Nº de focos INPE no raio de monitoramento",
  },
];

// Real confusion matrix from metrics.json:
// rows = real class (Baixo / Moderado / Crítico)
// cols = predicted class (Baixo / Moderado / Crítico)
// [[44, 3, 0], [1, 16, 0], [0, 3, 8]]
const confusionMatrix = {
  labels: ["Baixo", "Moderado", "Crítico"],
  matrix: [
    [44, 3, 0],
    [1, 16, 0],
    [0, 3, 8],
  ],
};

const cellColors: Record<string, string> = {
  diag: "#4ade80",
  off: "#f87171",
  zero: "transparent",
};

/** Animated bar: width goes from 0 to target when in view */
function AnimatedBar({
  weight,
  color,
  delay = 0,
}: {
  weight: number;
  color: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className="h-1.5 w-full"
      style={{ background: "rgba(255,255,255,0.05)", borderRadius: "1px" }}
    >
      <motion.div
        className="h-full"
        style={{
          background: color,
          borderRadius: "1px",
          boxShadow: `0 0 8px ${color}50`,
        }}
        initial={{ width: 0 }}
        whileInView={{ width: `${weight}%` }}
        viewport={{ once: true, amount: 0.5 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }
        }
      />
    </div>
  );
}


export default function MetricasSection() {
  return (
    <section id="metricas" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Right-side glow */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-96 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 100% 50%, rgba(249,115,22,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <Reveal className="mb-16">
          <p
            className="text-orange-500 mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.7rem" }}
          >
            {"// MODELO · 004"}
          </p>
          <h2
            className="gradient-ember leading-none"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "0.04em",
            }}
          >
            MÉTRICAS DO MODELO
          </h2>
          <div className="section-divider mt-4 max-w-xs" />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Main accuracy card */}
          <Reveal className="h-full">
            <div className="flex flex-col h-full">
              {/* Hero accuracy */}
              <div
                className="p-8 mb-6 relative overflow-hidden flex-1"
                style={{
                  background: "rgba(249,115,22,0.04)",
                  border: "1px solid rgba(249,115,22,0.15)",
                }}
              >
                {/* Decorative large number */}
                <div
                  className="absolute -right-6 -bottom-6 opacity-5"
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: "10rem",
                    color: "#f97316",
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  91%
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-share-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.15em",
                    color: "#f97316",
                  }}
                >
                  ACURÁCIA GERAL
                </p>

                <div
                  className="gradient-fire text-fire-glow mt-2"
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: "5rem",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                  }}
                >
                  ~91%
                </div>

                <p
                  className="text-slate-400 mt-3"
                  style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.88rem" }}
                >
                  RandomForest (100 árvores) treinado sobre dados de sensores simulados com clima
                  real da Open-Meteo (baseline) e focos do INPE. Avaliado em split único 75/25.
                </p>

                {/* Progress bar */}
                <div className="mt-5">
                  <AnimatedBar weight={91} color="#f97316" delay={0.2} />
                  <div className="flex justify-between mt-1">
                    <span
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.55rem",
                        color: "#475569",
                        letterSpacing: "0.1em",
                      }}
                    >
                      0%
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.55rem",
                        color: "#f97316",
                        letterSpacing: "0.1em",
                      }}
                    >
                      90.7% ← RESULTADO
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.55rem",
                        color: "#475569",
                        letterSpacing: "0.1em",
                      }}
                    >
                      100%
                    </span>
                  </div>
                </div>
              </div>

              {/* 3x3 Confusion Matrix */}
              <StaggerContainer staggerDelay={0.07}>
                <StaggerItem>
                  <div
                    className="p-5"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <p
                      className="mb-3"
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.12em",
                        color: "#f97316",
                      }}
                    >
                      MATRIZ DE CONFUSÃO (3×3)
                    </p>

                    {/* Header row: predicted labels */}
                    <div className="flex items-center gap-1 mb-1 pl-14">
                      {confusionMatrix.labels.map((lbl) => (
                        <div
                          key={lbl}
                          className="flex-1 text-center"
                          style={{
                            fontFamily: "var(--font-share-mono)",
                            fontSize: "0.52rem",
                            color: "#64748b",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {lbl}
                        </div>
                      ))}
                    </div>

                    {/* Matrix rows */}
                    {confusionMatrix.matrix.map((row, ri) => (
                      <div key={ri} className="flex items-center gap-1 mb-1">
                        {/* Row label (real class) */}
                        <div
                          className="w-14 text-right pr-2 shrink-0"
                          style={{
                            fontFamily: "var(--font-share-mono)",
                            fontSize: "0.52rem",
                            color: "#64748b",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {confusionMatrix.labels[ri]}
                        </div>
                        {row.map((val, ci) => {
                          const isDiag = ri === ci;
                          const bg = isDiag
                            ? "rgba(74,222,128,0.15)"
                            : val > 0
                            ? "rgba(248,113,113,0.12)"
                            : "rgba(255,255,255,0.02)";
                          const textColor = isDiag
                            ? cellColors.diag
                            : val > 0
                            ? cellColors.off
                            : "#334155";
                          return (
                            <div
                              key={ci}
                              className="flex-1 text-center py-2"
                              style={{
                                background: bg,
                                border: isDiag
                                  ? "1px solid rgba(74,222,128,0.25)"
                                  : "1px solid rgba(255,255,255,0.04)",
                                fontFamily: "var(--font-bebas)",
                                fontSize: "1.1rem",
                                color: textColor,
                                letterSpacing: "0.06em",
                                borderRadius: "2px",
                              }}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    <p
                      className="mt-2"
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.5rem",
                        color: "#475569",
                        letterSpacing: "0.06em",
                      }}
                    >
                      linhas = real · colunas = previsto · diagonal = acertos
                    </p>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </Reveal>

          {/* Right: Feature importance */}
          <Reveal delay={0.1}>
            <div>
              <p
                className="mb-6"
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "#f97316",
                }}
              >
                IMPORTÂNCIA DAS VARIÁVEIS
              </p>

              <div className="flex flex-col gap-5">
                {features.map((f, i) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div style={{ color: f.color }}>{f.icon}</div>
                        <div>
                          <span
                            style={{
                              fontFamily: "var(--font-bebas)",
                              fontSize: "1rem",
                              color: "white",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {f.name}
                          </span>
                          <span
                            className="ml-2"
                            style={{
                              fontFamily: "var(--font-share-mono)",
                              fontSize: "0.58rem",
                              color: "#475569",
                            }}
                          >
                            ({f.unit})
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-share-mono)",
                          fontSize: "0.7rem",
                          color: f.color,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {f.weight}%
                      </span>
                    </div>

                    {/* Animated bar */}
                    <AnimatedBar weight={f.weight} color={f.color} delay={i * 0.08} />

                    <p
                      className="mt-1 text-slate-600"
                      style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem" }}
                    >
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Model info panel */}
              <div
                className="mt-8 p-5"
                style={{
                  background: "rgba(15,17,23,0.9)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  lineHeight: "1.8",
                }}
              >
                <p className="text-orange-500 mb-2">$ modelo.info()</p>
                <p className="text-slate-500">
                  <span className="text-slate-400">algoritmo</span>
                  <span className="text-slate-600"> ........ </span>
                  <span style={{ color: "#a78bfa" }}>RandomForestClassifier</span>
                </p>
                <p className="text-slate-500">
                  <span className="text-slate-400">n_estimators</span>
                  <span className="text-slate-600"> .... </span>
                  <span style={{ color: "#4ade80" }}>100</span>
                </p>
                <p className="text-slate-500">
                  <span className="text-slate-400">features</span>
                  <span className="text-slate-600"> ....... </span>
                  <span style={{ color: "#fbbf24" }}>7 (temp, umid, fumaça, vento, densidade, dist, precip)</span>
                </p>
                <p className="text-slate-500">
                  <span className="text-slate-400">classes</span>
                  <span className="text-slate-600"> ........ </span>
                  <span style={{ color: "#f97316" }}>baixo / moderado / crítico</span>
                </p>
                <p className="text-slate-500">
                  <span className="text-slate-400">accuracy</span>
                  <span className="text-slate-600"> ....... </span>
                  <span style={{ color: "#ef4444" }}>0.9067</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
