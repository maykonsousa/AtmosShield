"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type Alerta = {
  device_id: string;
  latitude: number;
  longitude: number;
  risco: number;
  risco_label: string;
  temperatura: number;
  ppm_fumaca: number;
};

const CORES: Record<number, string> = { 0: "#22c55e", 1: "#f59e0b", 2: "#ef4444" };

export default function MapaRisco({ alertas }: { alertas: Alerta[] }) {
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
      {alertas.map((a, i) => (
        <CircleMarker
          key={`${a.device_id}-${i}`}
          center={[a.latitude, a.longitude]}
          radius={7}
          pathOptions={{ color: CORES[a.risco] ?? "#888", fillColor: CORES[a.risco] ?? "#888", fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{a.device_id}</strong>
            <br />
            Risco: {a.risco_label}
            <br />
            Temp: {a.temperatura}°C · Fumaça: {a.ppm_fumaca} ppm
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
