// Heurística qualitativa de risco a partir de variáveis climáticas.
// Espelha o espírito do label_risk do backend, mas NÃO é o modelo de ML
// (não usa sensores nem focos). Serve só para o indicador visual do widget.

export type Clima = {
  temperatura: number;       // °C
  umidade: number;           // %
  vento_kmh: number;         // km/h
  precipitation_mm: number;  // mm (soma das próximas ~6h)
};

export type Risco = {
  nivel: 0 | 1 | 2;
  label: "Baixo" | "Moderado" | "Crítico";
};

export function classificarRiscoClima(c: Clima): Risco {
  let score = 0;

  if (c.umidade <= 20) score += 2;
  else if (c.umidade <= 35) score += 1;

  if (c.vento_kmh >= 30) score += 2;
  else if (c.vento_kmh >= 18) score += 1;

  if (c.temperatura >= 40) score += 2;
  else if (c.temperatura >= 32) score += 1;

  // chuva reduz o risco de ignição/propagação
  if (c.precipitation_mm >= 15) score -= 2;
  else if (c.precipitation_mm >= 5) score -= 1;

  score = Math.max(score, 0);

  if (score >= 4) return { nivel: 2, label: "Crítico" };
  if (score >= 2) return { nivel: 1, label: "Moderado" };
  return { nivel: 0, label: "Baixo" };
}
