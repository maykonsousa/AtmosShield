from src.backend.app.services.weather import estimate_wind_kmh


def test_determinismo_por_coordenada():
    assert estimate_wind_kmh(-3.5, -52.4) == estimate_wind_kmh(-3.5, -52.4)


def test_faixa_plausivel():
    v = estimate_wind_kmh(-3.5, -52.4)
    assert isinstance(v, float)
    assert 0.0 <= v <= 50.0
