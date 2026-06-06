const features = [
  {
    name: "Temperatura",
    weight: 88,
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
    name: "Vento",
    weight: 76,
    unit: "km/h",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
      </svg>
    ),
    color: "#60a5fa",
    desc: "Velocidade e direção afetam propagação",
  },
  {
    name: "Umidade",
    weight: 71,
    unit: "%",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    ),
    color: "#38bdf8",
    desc: "Baixa umidade amplifica risco",
  },
  {
    name: "Dist. ao Foco",
    weight: 65,
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
];

const confusionData = [
  { label: "Verdadeiro Positivo", value: 87, color: "#4ade80" },
  { label: "Verdadeiro Negativo", value: 91, color: "#22d3ee" },
  { label: "Falso Positivo", value: 9, color: "#fbbf24" },
  { label: "Falso Negativo", value: 13, color: "#f87171" },
];

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
        <div className="mb-16">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Main accuracy card */}
          <div>
            {/* Hero accuracy */}
            <div
              className="p-8 mb-6 relative overflow-hidden"
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
                89%
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
                ~89%
              </div>

              <p
                className="text-slate-400 mt-3"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.88rem" }}
              >
                Árvore de Decisão treinado com dataset sintético + histórico INPE. Validação
                cruzada k=5. Resultado estável entre 87%–91% dependendo da região e época do ano.
              </p>

              {/* Progress bar */}
              <div className="mt-5">
                <div
                  className="h-2 w-full"
                  style={{ background: "rgba(255,255,255,0.05)", borderRadius: "1px" }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: "89%",
                      background: "linear-gradient(90deg, #f97316, #ef4444)",
                      borderRadius: "1px",
                      boxShadow: "0 0 10px rgba(249,115,22,0.4)",
                    }}
                  />
                </div>
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
                    89% ← META
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

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 gap-4">
              {confusionData.map((m) => (
                <div
                  key={m.label}
                  className="p-5"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderLeft: `2px solid ${m.color}50`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "1.8rem",
                      color: m.color,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {m.value}%
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-share-mono)",
                      fontSize: "0.6rem",
                      letterSpacing: "0.1em",
                      color: "#64748b",
                    }}
                  >
                    {m.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Feature importance */}
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
              {features.map((f) => (
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

                  {/* Bar */}
                  <div
                    className="h-1.5 w-full"
                    style={{ background: "rgba(255,255,255,0.05)", borderRadius: "1px" }}
                  >
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${f.weight}%`,
                        background: f.color,
                        borderRadius: "1px",
                        boxShadow: `0 0 8px ${f.color}50`,
                      }}
                    />
                  </div>

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
                <span style={{ color: "#fbbf24" }}>4 (temp, vento, umid, dist)</span>
              </p>
              <p className="text-slate-500">
                <span className="text-slate-400">classes</span>
                <span className="text-slate-600"> ........ </span>
                <span style={{ color: "#f97316" }}>baixo / moderado / crítico</span>
              </p>
              <p className="text-slate-500">
                <span className="text-slate-400">accuracy</span>
                <span className="text-slate-600"> ....... </span>
                <span style={{ color: "#ef4444" }}>0.8921</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
