import { classificarRiscoClima } from "@/lib/clima-risco";

// Local padrão (região amazônica que aparece nos dados de foco do INPE).
const DEFAULT_LAT = -3.2027;
const DEFAULT_LON = -52.2069;
const DEFAULT_LOCAL = "Altamira, PA";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const PRECIP_WINDOW_H = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  const hasCoords =
    latRaw !== null && lonRaw !== null && Number.isFinite(lat) && Number.isFinite(lon);

  const latitude = hasCoords ? lat : DEFAULT_LAT;
  const longitude = hasCoords ? lon : DEFAULT_LON;
  const local = hasCoords ? "Sua região" : DEFAULT_LOCAL;

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    hourly: "precipitation",
    forecast_days: "1",
  });

  try {
    // cache do upstream por 10 min (revalidate), por URL/coordenada
    const resp = await fetch(`${FORECAST_URL}?${params.toString()}`, {
      next: { revalidate: 600 },
    });
    if (!resp.ok) throw new Error(`open-meteo ${resp.status}`);
    const data = await resp.json();

    const temperatura = Number(data.current.temperature_2m);
    const umidade = Number(data.current.relative_humidity_2m);
    const vento_kmh = Number(data.current.wind_speed_10m);
    const precs: number[] = (data.hourly?.precipitation ?? []).slice(0, PRECIP_WINDOW_H);
    const precipitation_mm = precs.reduce((s, p) => s + (typeof p === "number" ? p : 0), 0);

    const risco = classificarRiscoClima({ temperatura, umidade, vento_kmh, precipitation_mm });

    return Response.json({
      latitude,
      longitude,
      local,
      temperatura: Math.round(temperatura * 10) / 10,
      umidade: Math.round(umidade),
      vento_kmh: Math.round(vento_kmh * 10) / 10,
      precipitation_mm: Math.round(precipitation_mm * 100) / 100,
      risco_nivel: risco.nivel,
      risco_label: risco.label,
      fonte: "open-meteo",
    });
  } catch {
    return Response.json({ erro: "clima indisponível" }, { status: 502 });
  }
}
