from src.backend.ml.risk_rules import label_risk, RISCO_BAIXO, RISCO_MODERADO, RISCO_CRITICO, RISK_LABELS


def test_cenario_critico():
    # muito gas + temp alta + ar seco + foco colado => Crítico
    assert label_risk(temperatura=43.0, umidade_ar=15.0, ppm_fumaca=400.0, dist_foco_km=1.0) == RISCO_CRITICO


def test_cenario_baixo():
    # ambiente úmido, frio, sem fumaça, longe de foco => Baixo
    assert label_risk(temperatura=24.0, umidade_ar=70.0, ppm_fumaca=40.0, dist_foco_km=50.0) == RISCO_BAIXO


def test_cenario_moderado():
    # sinais intermediários => Moderado
    assert label_risk(temperatura=34.0, umidade_ar=33.0, ppm_fumaca=160.0, dist_foco_km=8.0) == RISCO_MODERADO


def test_labels_mapeiam_todos_os_niveis():
    assert RISK_LABELS == {0: "Baixo", 1: "Moderado", 2: "Critico"}
