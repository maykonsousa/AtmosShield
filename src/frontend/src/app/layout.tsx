import type { Metadata } from "next";
import Script from "next/script";
import { Bebas_Neue, Share_Tech_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-share-mono",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AtmosShield — Prevenção e Alerta de Queimadas",
  description:
    "Sistema de prevenção e alerta de queimadas via telemetria IoT e dados de satélite. Detecta risco com sensores ESP32, API Python + ML e imagens INPE em tempo real.",
  keywords: ["queimadas", "prevenção", "IoT", "ESP32", "satélite", "INPE", "machine learning", "alerta"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bebasNeue.variable} ${shareTechMono.variable} ${dmSans.variable} h-full`}
    >
      <head>
        {/* react-grab: ferramenta de dev — Ctrl/Cmd+C sobre um elemento copia o
            contexto do componente (stack + arquivo-fonte) pro agente. Só em dev. */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col antialiased scanlines">
        {children}
      </body>
    </html>
  );
}
