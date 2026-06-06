const problems = [
  {
    id: "01",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "Latência do Satélite",
    stat: "+6h",
    statLabel: "atraso médio INPE",
    description:
      "Imagens de satélite como as do INPE podem ter atraso de 6 a 12 horas. Em queimadas, isso é tempo suficiente para hectares serem consumidos antes do primeiro alerta chegar às autoridades.",
  },
  {
    id: "02",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945" />
        <path d="M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
        <path d="M15 20.488V18a2 2 0 012-2h3.064" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Queimadas no Brasil",
    stat: "22M ha",
    statLabel: "área queimada/ano",
    description:
      "O Brasil registra milhões de focos de calor anualmente. A Amazônia, Cerrado e Pantanal são os biomas mais afetados. A velocidade de detecção é decisiva para conter o avanço das chamas.",
  },
  {
    id: "03",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.75L13.75 4a2 2 0 00-3.5 0L4.25 16.25A2 2 0 005.07 19z" />
      </svg>
    ),
    title: "Falsos Positivos",
    stat: "~40%",
    statLabel: "alertas incorretos",
    description:
      "Sistemas baseados apenas em satélite geram falsos positivos por reflexo solar, queimadas controladas e calor industrial. Isso satura canais de emergência e reduz a confiança nos alertas.",
  },
];

export default function ProblemaSection() {
  return (
    <section id="problema" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(239,68,68,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <p
            className="text-orange-500 mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.7rem" }}
          >
            {"// CONTEXTO · 001"}
          </p>
          <h2
            className="gradient-ember leading-none"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "0.04em",
            }}
          >
            O PROBLEMA
          </h2>
          <div className="section-divider mt-4 max-w-xs" />
        </div>

        {/* Problem cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <article
              key={p.id}
              className="glass-card-ember rounded-none p-8 relative group transition-all duration-300 hover:fire-glow"
            >
              {/* Corner decoration */}
              <div
                className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
                style={{
                  borderTop: "1px solid rgba(249,115,22,0.4)",
                  borderLeft: "1px solid rgba(249,115,22,0.4)",
                }}
              />
              <div
                className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none"
                style={{
                  borderBottom: "1px solid rgba(249,115,22,0.2)",
                  borderRight: "1px solid rgba(249,115,22,0.2)",
                }}
              />

              {/* Number */}
              <span
                className="absolute top-4 right-6 opacity-10"
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "3rem",
                  color: "#f97316",
                  letterSpacing: "0.06em",
                }}
              >
                {p.id}
              </span>

              {/* Icon */}
              <div className="text-orange-500 mb-5 opacity-80">{p.icon}</div>

              {/* Stat */}
              <div className="mb-4">
                <span
                  className="gradient-fire"
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: "2.8rem",
                    letterSpacing: "0.06em",
                  }}
                >
                  {p.stat}
                </span>
                <span
                  className="block text-slate-500 mt-0.5"
                  style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.65rem", letterSpacing: "0.1em" }}
                >
                  {p.statLabel.toUpperCase()}
                </span>
              </div>

              <h3
                className="text-slate-200 mb-3"
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "1.25rem",
                  letterSpacing: "0.08em",
                }}
              >
                {p.title}
              </h3>

              <p
                className="text-slate-400 leading-relaxed"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.9rem" }}
              >
                {p.description}
              </p>
            </article>
          ))}
        </div>

        {/* Conclusion callout */}
        <div
          className="mt-10 p-6 flex flex-col md:flex-row items-start md:items-center gap-4"
          style={{
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderLeft: "3px solid #ef4444",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            className="flex-shrink-0"
          >
            <path d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.75L13.75 4a2 2 0 00-3.5 0L4.25 16.25A2 2 0 005.07 19z" />
          </svg>
          <p
            className="text-slate-300"
            style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.95rem", lineHeight: "1.6" }}
          >
            <span className="text-red-400 font-semibold">A janela de resposta é crítica.</span> Cada hora de atraso na
            detecção pode resultar em dezenas de quilômetros quadrados destruídos. O AtmosShield foi criado para fechar
            essa lacuna com dados em solo e inteligência artificial.
          </p>
        </div>
      </div>
    </section>
  );
}
