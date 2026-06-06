from src.backend.app.services.scoring import load_model, load_focos, score_reading


def test_leitura_quente_perto_de_foco_classifica_alto():
    model = load_model()
    focos = load_focos()
    res = score_reading(
        latitude=-3.4712, longitude=-52.3812,
        temperatura=44.0, umidade_ar=16.0, ppm_fumaca=420.0,
        model=model, focos_df=focos,
    )
    assert res["risco"] == 2
    assert res["risco_label"] == "Critico"
    assert res["densidade_focos"] >= 1
    assert isinstance(res["vento_kmh"], float)


def test_leitura_fria_e_longe_classifica_baixo():
    model = load_model()
    focos = load_focos()
    res = score_reading(
        latitude=0.0, longitude=0.0,
        temperatura=24.0, umidade_ar=70.0, ppm_fumaca=30.0,
        model=model, focos_df=focos,
    )
    assert res["risco"] == 0
    assert res["risco_label"] == "Baixo"
