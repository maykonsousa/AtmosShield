const archNodes = [
  {
    id: "satellite",
    label: "SATÉLITE",
    sublabel: "INPE · GOES",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        <path d="M12 2a14.5 14.5 0 010 20" />
        <path d="M2 12h20" />
        <path d="M12 2a14.5 14.5 0 000 20" />
      </svg>
    ),
    color: "#60a5fa",
    desc: "Imagens termais e focos de calor",
  },
  {
    id: "esp32",
    label: "ESP32",
    sublabel: "Sensores IoT",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
    color: "#4ade80",
    desc: "Temperatura, fumaça, umidade, vento",
  },
];

const processingNodes = [
  {
    id: "api",
    label: "API PYTHON",
    sublabel: "FastAPI",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M8.5 2.5L12 9l3.5-6.5" />
        <path d="M3 12c0-5 4-9 9-9s9 4 9 9" />
        <path d="M21 12c0 5-4 9-9 9s-9-4-9-9" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    color: "#a78bfa",
    desc: "Recebe, valida e processa dados",
  },
  {
    id: "ml",
    label: "MODELO ML",
    sublabel: "Árvore de Decisão",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    color: "#f97316",
    desc: "Classifica risco com ~89% acurácia",
  },
];

export default function ArquiteturaSection() {
  return (
    <section id="arquitetura" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Center glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.04) 0%, transparent 65%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <p
            className="text-orange-500 mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.7rem" }}
          >
            {"// SISTEMA · 003"}
          </p>
          <h2
            className="gradient-ember leading-none"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "0.04em",
            }}
          >
            ARQUITETURA
          </h2>
          <div className="section-divider mt-4 max-w-xs" />
        </div>

        {/* Architecture diagram */}
        <div
          className="p-8 lg:p-12 relative"
          style={{
            background: "rgba(10,11,13,0.9)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Diagram label */}
          <div
            className="absolute top-3 left-4 flex items-center gap-2"
            style={{
              fontFamily: "var(--font-share-mono)",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              color: "#334155",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            FLUXO DE DADOS · TEMPO REAL
          </div>

          {/* Top row: Input sources */}
          <div className="mb-6">
            <p
              className="text-center mb-4"
              style={{
                fontFamily: "var(--font-share-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              FONTES DE DADOS
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {archNodes.map((node) => (
                <div
                  key={node.id}
                  className="arch-node p-5 flex flex-col items-center text-center gap-2"
                >
                  <div style={{ color: node.color }}>{node.icon}</div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-bebas)",
                        fontSize: "1rem",
                        color: "white",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {node.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.6rem",
                        color: node.color,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {node.sublabel}
                    </div>
                  </div>
                  <p
                    className="text-slate-500"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem" }}
                  >
                    {node.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Downward arrow */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-px h-8"
              style={{ background: "linear-gradient(to bottom, rgba(249,115,22,0.5), rgba(249,115,22,0.2))" }}
            />
            <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(249,115,22,0.6)">
              <polygon points="5,10 0,0 10,0" />
            </svg>
          </div>

          {/* Middle row: Processing */}
          <div className="mb-6">
            <p
              className="text-center mb-4"
              style={{
                fontFamily: "var(--font-share-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              PROCESSAMENTO
            </p>
            <div className="flex items-stretch gap-0 max-w-lg mx-auto">
              {processingNodes.map((node, i) => (
                <>
                  <div
                    key={node.id}
                    className="arch-node flex-1 p-5 flex flex-col items-center text-center gap-2"
                    style={{ borderColor: `${node.color}20` }}
                  >
                    <div style={{ color: node.color }}>{node.icon}</div>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-bebas)",
                          fontSize: "0.9rem",
                          color: "white",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {node.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-share-mono)",
                          fontSize: "0.6rem",
                          color: node.color,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {node.sublabel}
                      </div>
                    </div>
                    <p
                      className="text-slate-500"
                      style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem" }}
                    >
                      {node.desc}
                    </p>
                  </div>
                  {i < processingNodes.length - 1 && (
                    <div className="flex items-center px-3" key={`arrow-${i}`}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="rgba(249,115,22,0.5)"
                        strokeWidth="1.5"
                      >
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    </div>
                  )}
                </>
              ))}
            </div>
          </div>

          {/* Downward arrow */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-px h-8"
              style={{ background: "linear-gradient(to bottom, rgba(249,115,22,0.5), rgba(249,115,22,0.2))" }}
            />
            <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(249,115,22,0.6)">
              <polygon points="5,10 0,0 10,0" />
            </svg>
          </div>

          {/* Output: Dashboard */}
          <div>
            <p
              className="text-center mb-4"
              style={{
                fontFamily: "var(--font-share-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.15em",
                color: "#475569",
              }}
            >
              SAÍDA
            </p>
            <div
              className="max-w-sm mx-auto p-6 text-center relative"
              style={{
                background: "rgba(249,115,22,0.05)",
                border: "1px solid rgba(249,115,22,0.25)",
                boxShadow: "0 0 40px rgba(249,115,22,0.08)",
              }}
            >
              <div className="text-orange-500 flex justify-center mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                  <path d="M13 13h4M13 17h4M7 13h2v4H7z" />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "1.3rem",
                  color: "white",
                  letterSpacing: "0.12em",
                }}
              >
                DASHBOARD
              </div>
              <div
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.6rem",
                  color: "#f97316",
                  letterSpacing: "0.1em",
                }}
              >
                Next.js · Alertas em Tempo Real
              </div>

              {/* Alert badges */}
              <div className="flex justify-center gap-2 mt-4">
                {["BAIXO", "MODERADO", "CRÍTICO"].map((level, i) => (
                  <span
                    key={level}
                    className={`px-2 py-0.5 text-xs ${
                      i === 0 ? "risk-low" : i === 1 ? "risk-moderate" : "risk-critical"
                    }`}
                    style={{
                      fontFamily: "var(--font-share-mono)",
                      fontSize: "0.55rem",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Architecture notes */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "⚡", label: "Latência Total", value: "< 3 min" },
            { icon: "🔒", label: "Dados Offline", value: "Edge + Nuvem" },
            { icon: "📡", label: "Protocolo IoT", value: "MQTT / REST" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 p-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-share-mono)",
                    fontSize: "0.58rem",
                    letterSpacing: "0.1em",
                    color: "#475569",
                  }}
                >
                  {item.label.toUpperCase()}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: "1rem",
                    color: "#fdba74",
                    letterSpacing: "0.08em",
                  }}
                >
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
