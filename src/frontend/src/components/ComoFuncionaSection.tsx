const steps = [
  {
    step: "01",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
        <path d="M12 8v4m0 0l2-2m-2 2l-2-2" />
        <path d="M16 10h.5" />
        <circle cx="16.5" cy="10" r="0.5" fill="currentColor" />
      </svg>
    ),
    title: "Sensor no Solo",
    subtitle: "ESP32 + Sensores IoT",
    description:
      "Dispositivos ESP32 instalados em campo coletam continuamente temperatura, umidade, concentração de fumaça (MQ-2) e velocidade do vento. Os dados são transmitidos via Wi-Fi/MQTT para a API central.",
    tags: ["ESP32", "MQ-2", "DHT22", "MQTT"],
    color: "#fbbf24",
  },
  {
    step: "02",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v3" />
        <path d="M15 12a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.5 16.5l1.5 1.5m0 0l-1.5 1.5M21 18h-3" />
      </svg>
    ),
    title: "API + IA",
    subtitle: "FastAPI · Árvore de Decisão · INPE",
    description:
      "A API Python recebe os dados dos sensores e os cruza com imagens de satélite do INPE e dados de vento. Um modelo Árvore de Decisão calcula a probabilidade de risco real, eliminando falsos positivos.",
    tags: ["FastAPI", "Scikit-learn", "INPE API", "Vento"],
    color: "#f97316",
  },
  {
    step: "03",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Alerta Classificado",
    subtitle: "Baixo · Moderado · Crítico",
    description:
      "O sistema emite alertas com classificação de risco em três níveis. Cada alerta inclui localização, confiança do modelo, fatores contribuintes e recomendação de ação — tudo no dashboard em tempo real.",
    tags: ["Baixo", "Moderado", "Crítico"],
    color: "#ef4444",
  },
];

export default function ComoFuncionaSection() {
  return (
    <section id="como-funciona" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Left-side glow */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-72 h-96 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 0% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <p
            className="text-orange-500 mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.7rem" }}
          >
            {"// FUNCIONAMENTO · 002"}
          </p>
          <h2
            className="gradient-ember leading-none"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "0.04em",
            }}
          >
            COMO FUNCIONA
          </h2>
          <div className="section-divider mt-4 max-w-xs" />
        </div>

        {/* Steps — vertical timeline on mobile, horizontal on desktop */}
        <div className="relative">
          {/* Horizontal connector line (desktop only) */}
          <div
            className="hidden lg:block absolute top-24 left-[16.66%] right-[16.66%] h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(249,115,22,0.4) 20%, rgba(249,115,22,0.4) 80%, transparent)",
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative flex flex-col">
                {/* Step number circle */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                    style={{
                      background: "#0a0b0d",
                      border: `2px solid ${s.color}`,
                      boxShadow: `0 0 20px ${s.color}33`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-bebas)",
                        fontSize: "1rem",
                        color: s.color,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {s.step}
                    </span>
                  </div>
                  {/* Mobile connector */}
                  {i < steps.length - 1 && (
                    <div
                      className="lg:hidden flex-1 h-px"
                      style={{
                        background: `linear-gradient(90deg, ${s.color}66, transparent)`,
                      }}
                    />
                  )}
                </div>

                {/* Card */}
                <div
                  className="flex-1 p-7 relative"
                  style={{
                    background: "rgba(15,17,23,0.8)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderTop: `2px solid ${s.color}44`,
                  }}
                >
                  {/* Icon */}
                  <div className="mb-5" style={{ color: s.color }}>
                    {s.icon}
                  </div>

                  <h3
                    className="text-white mb-1"
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "1.5rem",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="mb-4"
                    style={{
                      fontFamily: "var(--font-share-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.1em",
                      color: s.color,
                    }}
                  >
                    {s.subtitle}
                  </p>

                  <p
                    className="text-slate-400 leading-relaxed mb-5"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.9rem" }}
                  >
                    {s.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs"
                        style={{
                          fontFamily: "var(--font-share-mono)",
                          fontSize: "0.6rem",
                          letterSpacing: "0.1em",
                          background: `${s.color}10`,
                          border: `1px solid ${s.color}30`,
                          color: s.color,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk levels legend */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6">
          <span
            style={{
              fontFamily: "var(--font-share-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              color: "#475569",
            }}
          >
            NÍVEIS DE RISCO:
          </span>
          {[
            { label: "BAIXO", className: "risk-low" },
            { label: "MODERADO", className: "risk-moderate" },
            { label: "CRÍTICO", className: "risk-critical" },
          ].map((r) => (
            <span
              key={r.label}
              className={`px-4 py-1.5 text-xs font-medium ${r.className}`}
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "0.9rem",
                letterSpacing: "0.12em",
              }}
            >
              ● {r.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
