from src.backend.ml.risk_rules import label_risk, RISCO_BAIXO, RISCO_MODERADO, RISCO_CRITICO, RISK_LABELS


def test_cenario_critico():
    # muito gas + temp alta + ar seco + foco colado + vento forte => Crítico
    assert label_risk(temperatura=43.0, umidade_ar=15.0, ppm_fumaca=400.0, dist_foco_km=1.0, vento_kmh=35.0) == RISCO_CRITICO


def test_cenario_baixo():
    # ambiente úmido, frio, sem fumaça, longe de foco, sem vento => Baixo
    assert label_risk(temperatura=24.0, umidade_ar=70.0, ppm_fumaca=40.0, dist_foco_km=50.0, vento_kmh=5.0) == RISCO_BAIXO


def test_cenario_moderado():
    # sinais intermediários, vento fraco => Moderado
    assert label_risk(temperatura=34.0, umidade_ar=33.0, ppm_fumaca=160.0, dist_foco_km=8.0, vento_kmh=10.0) == RISCO_MODERADO


def test_vento_eleva_o_risco():
    # mesma leitura, só muda o vento: vento forte empurra Moderado -> Crítico
    sem_vento = label_risk(temperatura=41.0, umidade_ar=19.0, ppm_fumaca=160.0, dist_foco_km=5.0, vento_kmh=5.0)
    com_vento = label_risk(temperatura=41.0, umidade_ar=19.0, ppm_fumaca=160.0, dist_foco_km=5.0, vento_kmh=35.0)
    assert sem_vento == RISCO_MODERADO
    assert com_vento == RISCO_CRITICO


def test_labels_mapeiam_todos_os_niveis():
    assert RISK_LABELS == {0: "Baixo", 1: "Moderado", 2: "Critico"}
