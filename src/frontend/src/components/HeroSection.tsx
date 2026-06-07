"use client";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function HeroSection() {
  const reduce = useReducedMotion();

  const fadeUp = (delay: number): Variants => ({
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, delay, ease } },
  });

  const fadeIn = (delay: number): Variants => ({
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.55, delay, ease } },
  });

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grid-overlay"
    >
      {/* Radial fire glow from center-bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(234,88,12,0.18) 0%, rgba(249,115,22,0.07) 40%, transparent 70%)",
        }}
      />

      {/* Top-left corner accent */}
      <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
        <div
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(249,115,22,0.08) 0%, transparent 70%)",
          }}
          className="w-full h-full"
        />
      </div>

      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Nav bar */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-20">
        <span
          className="gradient-fire text-fire-glow"
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "1.6rem",
            letterSpacing: "0.15em",
          }}
        >
          ATMOSSHIELD
        </span>
        <div className="flex items-center gap-6">
          <span className="status-online">sistema ativo</span>
          <a
            href="/dashboard"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-medium transition-all duration-200"
            style={{
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.25)",
              color: "#fdba74",
              fontFamily: "var(--font-share-mono)",
              letterSpacing: "0.05em",
            }}
          >
            DASHBOARD →
          </a>
        </div>
      </nav>

      {/* Main hero content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Pre-label */}
        <motion.div
          variants={fadeIn(0.1)}
          initial="hidden"
          animate="show"
          className="inline-flex items-center gap-3 mb-8 px-4 py-2"
          style={{
            border: "1px solid rgba(249,115,22,0.2)",
            background: "rgba(249,115,22,0.04)",
            fontFamily: "var(--font-share-mono)",
            fontSize: "0.65rem",
            letterSpacing: "0.18em",
            color: "#f97316",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 pulse-ring inline-block" />
          TELEMETRIA IoT · SATÉLITE INPE · ML EM TEMPO REAL
        </motion.div>

        {/* Main title */}
        <motion.h1
          variants={fadeUp(0.25)}
          initial="hidden"
          animate="show"
          className="gradient-fire text-fire-glow leading-none mb-2"
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: "clamp(5rem, 16vw, 13rem)",
            letterSpacing: "0.04em",
          }}
        >
          ATMOSSHIELD
        </motion.h1>

        {/* Tagline */}
        <motion.p
          variants={fadeUp(0.42)}
          initial="hidden"
          animate="show"
          className="text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{
            fontSize: "clamp(1rem, 2.2vw, 1.35rem)",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          Prevenção e alerta de queimadas via telemetria e satélite.{" "}
          <span className="text-orange-400">
            Detectamos o perigo antes que o fogo se espalhe.
          </span>
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          variants={fadeUp(0.58)}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/dashboard"
            className="group relative inline-flex items-center gap-3 px-8 py-4 transition-all duration-300 fire-glow-strong"
            style={{
              background: "linear-gradient(135deg, #ea580c, #dc2626)",
              color: "white",
              fontFamily: "var(--font-bebas)",
              fontSize: "1.1rem",
              letterSpacing: "0.12em",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            VER DASHBOARD
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </a>

          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-8 py-4 transition-all duration-300"
            style={{
              background: "transparent",
              border: "1px solid rgba(249,115,22,0.3)",
              color: "#fdba74",
              fontFamily: "var(--font-bebas)",
              fontSize: "1.1rem",
              letterSpacing: "0.12em",
            }}
          >
            COMO FUNCIONA ↓
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          variants={fadeUp(0.72)}
          initial="hidden"
          animate="show"
          className="mt-16 grid grid-cols-3 gap-px"
          style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.05)" }}
        >
          {[
            { value: "~89%", label: "Acurácia do Modelo" },
            { value: "3 MIN", label: "Latência de Alerta" },
            { value: "4 FATORES", label: "Variáveis de Risco" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center py-4 px-6"
              style={{ background: "rgba(10,11,13,0.8)" }}
            >
              <span
                className="gradient-fire"
                style={{ fontFamily: "var(--font-bebas)", fontSize: "1.8rem", letterSpacing: "0.06em" }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-share-mono)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.12em",
                  color: "#64748b",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 opacity-40">
        <span
          style={{
            fontFamily: "var(--font-share-mono)",
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            color: "#f97316",
          }}
        >
          SCROLL
        </span>
        <div
          className="w-px h-12"
          style={{ background: "linear-gradient(to bottom, rgba(249,115,22,0.6), transparent)" }}
        />
      </div>
    </section>
  );
}
