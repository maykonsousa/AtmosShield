"""Rotulagem de risco de alastramento de fogo por regra física."""

RISCO_BAIXO = 0
RISCO_MODERADO = 1
RISCO_CRITICO = 2

RISK_LABELS = {RISCO_BAIXO: "Baixo", RISCO_MODERADO: "Moderado", RISCO_CRITICO: "Critico"}


def label_risk(temperatura: float, umidade_ar: float, ppm_fumaca: float, dist_foco_km: float,
               vento_kmh: float, precipitation_mm: float = 0.0) -> int:
    """Soma pontos por fator de risco e classifica em Baixo/Moderado/Crítico.

    Vento forte acelera o alastramento (soma pontos); chuva volumosa apaga risco (subtrai).
    """
    score = 0

    if ppm_fumaca >= 300:
        score += 2
    elif ppm_fumaca >= 150:
        score += 1

    if temperatura >= 40:
        score += 2
    elif temperatura >= 32:
        score += 1

    if umidade_ar <= 20:
        score += 2
    elif umidade_ar <= 35:
        score += 1

    if dist_foco_km <= 2:
        score += 2
    elif dist_foco_km <= 10:
        score += 1

    if vento_kmh >= 30:
        score += 2
    elif vento_kmh >= 18:
        score += 1

    # chuva real reduz o risco de ignição/alastramento
    if precipitation_mm >= 15:
        score -= 4
    elif precipitation_mm >= 5:
        score -= 2
    score = max(score, 0)

    if score >= 7:
        return RISCO_CRITICO
    if score >= 4:
        return RISCO_MODERADO
    return RISCO_BAIXO
