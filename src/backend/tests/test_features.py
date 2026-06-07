import pandas as pd
from src.backend.ml.features import haversine_km, focus_metrics, build_features, FEATURE_COLUMNS


def test_haversine_um_grau_de_latitude():
    # ~111 km por grau de latitude
    assert abs(haversine_km(0.0, 0.0, 1.0, 0.0) - 111.19) < 1.0


def test_focus_metrics_conta_focos_no_raio():
    focos = pd.DataFrame({"latitude": [-3.50, -3.51, -9.97], "longitude": [-52.38, -52.39, -67.82]})
    densidade, dist = focus_metrics(-3.50, -52.38, focos, radius_km=10.0)
    assert densidade == 2          # dois focos próximos em Altamira
    assert dist < 2.0              # foco mais próximo a poucos km


def test_build_features_gera_colunas_do_modelo():
    focos = pd.DataFrame({"latitude": [-3.50], "longitude": [-52.38]})
    readings = pd.DataFrame(
        [{"latitude": -3.50, "longitude": -52.38, "temperatura": 41.0, "umidade_ar": 18.0, "ppm_fumaca": 360.0, "vento_kmh": 22.0, "precipitation_mm": 0.0}]
    )
    out = build_features(readings, focos, radius_km=10.0)
    assert set(FEATURE_COLUMNS).issubset(out.columns)
    assert out["densidade_focos"].iloc[0] == 1


from src.backend.ml.risk_rules import label_risk, RISCO_CRITICO, RISCO_MODERADO


def test_chuva_reduz_risco():
    # cenário crítico sem chuva
    seco = label_risk(temperatura=44, umidade_ar=15, ppm_fumaca=420, dist_foco_km=1, vento_kmh=35)
    assert seco == RISCO_CRITICO
    # mesma leitura com chuva volumosa → score cai pelo menos um nível
    molhado = label_risk(temperatura=44, umidade_ar=15, ppm_fumaca=420, dist_foco_km=1, vento_kmh=35,
                         precipitation_mm=20.0)
    assert molhado < seco


def test_chuva_nao_deixa_score_negativo():
    # cenário já baixo + chuva: não pode quebrar nem ir abaixo de Baixo (0)
    r = label_risk(temperatura=22, umidade_ar=80, ppm_fumaca=10, dist_foco_km=50, vento_kmh=3,
                   precipitation_mm=30.0)
    assert r == 0


def test_precipitation_e_feature():
    assert "precipitation_mm" in FEATURE_COLUMNS
    assert len(FEATURE_COLUMNS) == 7
