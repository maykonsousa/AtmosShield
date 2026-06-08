"use client";
import { Reveal } from "./Reveal";

export default function FooterSection() {
  return (
    <footer
      id="rodape"
      className="relative pt-16 pb-10 overflow-hidden"
      style={{
        background: "rgba(8,9,11,0.95)",
        borderTop: "1px solid rgba(249,115,22,0.1)",
      }}
    >
      {/* Top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(239,68,68,0.5), rgba(249,115,22,0.4), transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            {/* Brand */}
            <div>
              <h2
                className="gradient-fire text-fire-glow mb-3"
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "2.2rem",
                  letterSpacing: "0.12em",
                }}
              >
                ATMOSSHIELD
              </h2>
              <p
                className="text-slate-500 leading-relaxed mb-4"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem" }}
              >
                Sistema de prevenção e alerta de queimadas via telemetria IoT e satélite.
                Desenvolvido como projeto acadêmico para a FIAP Global Solution.
              </p>
              <div className="status-online">sistema online</div>
            </div>

            {/* Links */}
            <div>
              <p
                className="mb-4"
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "#f97316",
                }}
              >
                NAVEGAÇÃO
              </p>
              <nav className="flex flex-col gap-2">
                {[
                  { label: "Hero", href: "#hero" },
                  { label: "O Problema", href: "#problema" },
                  { label: "Como Funciona", href: "#como-funciona" },
                  { label: "Arquitetura", href: "#arquitetura" },
                  { label: "Métricas", href: "#metricas" },
                  { label: "Time", href: "#time" },
                  { label: "Dashboard →", href: "/dashboard" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-slate-500 hover:text-orange-400 transition-colors duration-200"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.87rem" }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Tech stack */}
            <div>
              <p
                className="mb-4"
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "#f97316",
                }}
              >
                STACK TECNOLÓGICO
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "IoT / Hardware", value: "ESP32 + Wokwi" },
                  { label: "Backend", value: "FastAPI + Python" },
                  { label: "ML", value: "RandomForest (Scikit-learn)" },
                  { label: "Satélite", value: "INPE / GOES" },
                  { label: "Frontend", value: "Next.js 16 + Tailwind" },
                  { label: "Repositório", value: "github.com/[link]" },
                ].map((item) => (
                  <div key={item.label} className="flex items-baseline gap-2">
                    <span
                      className="flex-shrink-0"
                      style={{
                        fontFamily: "var(--font-share-mono)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.08em",
                        color: "#334155",
                        minWidth: "80px",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="text-slate-400"
                      style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem" }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Repo placeholder link */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 px-4 py-2 transition-all duration-200 hover:fire-glow"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                VER REPOSITÓRIO
              </a>
            </div>
          </div>
        </Reveal>

        {/* Bottom bar */}
        <Reveal delay={0.1}>
          <div
            className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span
                className="gradient-fire"
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "1.1rem",
                  letterSpacing: "0.1em",
                }}
              >
                FIAP — GLOBAL SOLUTION 2026.1
              </span>
              <span
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.55rem",
                  letterSpacing: "0.1em",
                  color: "#334155",
                }}
              >
                · Tecnologia em Inteligência Artificial (On-Line) ·
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.55rem",
                  letterSpacing: "0.1em",
                  color: "#1e293b",
                }}
              >
                BUILD: 2026.1.0
              </span>
              <span
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.55rem",
                  letterSpacing: "0.1em",
                  color: "#334155",
                }}
              >
                © 2026 ATMOSSHIELD
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
