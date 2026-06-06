const members = [
  {
    name: "Matheus de França Fantini",
    role: "IoT & Hardware",
    initials: "MF",
    description: "Responsável pela integração dos sensores ESP32, firmware e protocolo MQTT.",
    color: "#f97316",
    tags: ["ESP32", "C/C++", "MQTT", "Hardware"],
  },
  {
    name: "Maykon Eduardo Pereira de Sousa",
    role: "Backend & ML",
    initials: "ME",
    description: "Desenvolvimento da API FastAPI, treinamento do modelo Árvore de Decisão e pipeline de dados.",
    color: "#fbbf24",
    tags: ["Python", "FastAPI", "Scikit-learn", "ML"],
  },
  {
    name: "Heleno Madeira Pereira",
    role: "Dados & Satélite",
    initials: "HP",
    description: "Integração com API INPE, processamento de imagens termais e análise de dados climáticos.",
    color: "#ef4444",
    tags: ["INPE", "Data Science", "Pandas", "API"],
  },
  {
    name: "Samantha Silva Farias",
    role: "Frontend & UX",
    initials: "SS",
    description: "Design e desenvolvimento do dashboard de monitoramento e landing page do sistema.",
    color: "#a78bfa",
    tags: ["Next.js", "React", "Tailwind", "UX"],
  },
];

export default function TimeSection() {
  return (
    <section id="time" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Bottom-center glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <p
            className="text-orange-500 mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-share-mono)", fontSize: "0.7rem" }}
          >
            {"// EQUIPE · 005"}
          </p>
          <h2
            className="gradient-ember leading-none"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              letterSpacing: "0.04em",
            }}
          >
            NOSSO TIME
          </h2>
          <div className="section-divider mt-4 max-w-xs" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((m) => (
            <article
              key={m.name}
              className="group flex flex-col relative"
              style={{
                background: "rgba(15,17,23,0.8)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Top color bar */}
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${m.color}80, ${m.color}20)` }}
              />

              <div className="p-6 flex flex-col flex-1">
                {/* Avatar */}
                <div
                  className="w-14 h-14 flex items-center justify-center mb-5 relative"
                  style={{
                    background: `${m.color}12`,
                    border: `1px solid ${m.color}30`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: "1.4rem",
                      color: m.color,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {m.initials}
                  </span>
                  {/* Glow dot */}
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                    style={{
                      background: m.color,
                      boxShadow: `0 0 8px ${m.color}`,
                    }}
                  />
                </div>

                {/* Name */}
                <h3
                  className="text-white leading-tight mb-1"
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  }}
                >
                  {m.name}
                </h3>

                {/* Role */}
                <span
                  className="mb-4"
                  style={{
                    fontFamily: "var(--font-share-mono)",
                    fontSize: "0.6rem",
                    letterSpacing: "0.12em",
                    color: m.color,
                    textTransform: "uppercase",
                  }}
                >
                  {m.role}
                </span>

                {/* Description */}
                <p
                  className="text-slate-500 text-sm leading-relaxed flex-1 mb-5"
                  style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem" }}
                >
                  {m.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {m.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5"
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.55rem",
                        letterSpacing: "0.08em",
                        background: `${m.color}08`,
                        border: `1px solid ${m.color}20`,
                        color: `${m.color}cc`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Team badge */}
        <div className="mt-12 text-center">
          <div
            className="inline-flex items-center gap-3 px-6 py-3"
            style={{
              background: "rgba(249,115,22,0.04)",
              border: "1px solid rgba(249,115,22,0.12)",
              fontFamily: "var(--font-share-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              color: "#64748b",
            }}
          >
            <span className="text-orange-500">◆</span>
            TURMA 2TDSPV · FIAP GLOBAL SOLUTION 2026.1
            <span className="text-orange-500">◆</span>
          </div>
        </div>
      </div>
    </section>
  );
}
