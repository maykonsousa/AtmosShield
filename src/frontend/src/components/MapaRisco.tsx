"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";

export type Alerta = {
  device_id: string;
  latitude: number;
  longitude: number;
  risco: number;
  risco_label: string;
  temperatura: number;
  ppm_fumaca: number;
  received_at?: string;
};

const CORES: Record<number, string> = { 0: "#22c55e", 1: "#f59e0b", 2: "#ef4444" };

function formatarHora(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Reenquadra o mapa quando a lista de alertas muda (ex.: filtro por nível de risco).
function FitBounds({ alertas }: { alertas: Alerta[] }) {
  const map = useMap();
  useEffect(() => {
    if (!alertas.length) return;
    const bounds = latLngBounds(alertas.map((a) => [a.latitude, a.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8, animate: true });
  }, [alertas, map]);
  return null;
}

// Voa até um sensor específico (ex.: ao clicar num alerta crítico da lista).
function FlyTo({ foco }: { foco?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!foco) return;
    map.flyTo(foco, 9, { duration: 0.8 });
  }, [foco, map]);
  return null;
}

export default function MapaRisco({
  alertas,
  foco,
  onSelecionar,
}: {
  alertas: Alerta[];
  foco?: [number, number] | null;
  onSelecionar?: (a: Alerta) => void;
}) {
  const center: [number, number] = alertas.length
    ? [
        alertas.reduce((s, a) => s + a.latitude, 0) / alertas.length,
        alertas.reduce((s, a) => s + a.longitude, 0) / alertas.length,
      ]
    : [-8, -53];
  return (
    <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds alertas={alertas} />
      <FlyTo foco={foco} />
      {alertas.map((a, i) => (
        <CircleMarker
          key={`${a.device_id}-${i}`}
          center={[a.latitude, a.longitude]}
          radius={7}
          pathOptions={{ color: CORES[a.risco] ?? "#888", fillColor: CORES[a.risco] ?? "#888", fillOpacity: 0.85 }}
          eventHandlers={{ click: () => onSelecionar?.(a) }}
        >
          <Popup>
            <strong>{a.device_id}</strong>
            <br />
            Risco: {a.risco_label}
            <br />
            Temp: {a.temperatura}°C · Fumaça: {a.ppm_fumaca} ppm
            {formatarHora(a.received_at) && (
              <>
                <br />
                Registrado: {formatarHora(a.received_at)}
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
