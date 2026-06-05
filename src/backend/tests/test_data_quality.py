import pandas as pd
from src.backend.data_quality import flag_outliers


def _frame():
    return pd.DataFrame(
        [
            {"device_id": "A", "timestamp": "2025-08-12 10:00", "temperatura": 25.0, "ppm_fumaca": 40},
            {"device_id": "A", "timestamp": "2025-08-12 10:01", "temperatura": 150.0, "ppm_fumaca": 45},  # salto sem fumaça
            {"device_id": "A", "timestamp": "2025-08-12 10:02", "temperatura": 26.0, "ppm_fumaca": 42},
            {"device_id": "B", "timestamp": "2025-08-12 10:00", "temperatura": 30.0, "ppm_fumaca": 90},
            {"device_id": "B", "timestamp": "2025-08-12 10:01", "temperatura": 95.0, "ppm_fumaca": 350},  # salto COM fumaça => fogo real
        ]
    )


def test_salto_sem_fumaca_e_outlier():
    out = flag_outliers(_frame())
    linha_salto = out[(out["device_id"] == "A") & (out["temperatura"] == 150.0)]
    assert bool(linha_salto["is_outlier"].iloc[0]) is True


def test_salto_com_fumaca_nao_e_outlier():
    out = flag_outliers(_frame())
    linha_fogo = out[(out["device_id"] == "B") & (out["temperatura"] == 95.0)]
    assert bool(linha_fogo["is_outlier"].iloc[0]) is False


def test_primeira_leitura_nunca_e_outlier():
    out = flag_outliers(_frame())
    primeiras = out.sort_values(["device_id", "timestamp"]).groupby("device_id").head(1)
    assert not primeiras["is_outlier"].any()
