"""Qualidade de dados: marca leituras de sensores defeituosos."""
import pandas as pd

TEMP_JUMP_C = 50.0       # salto de temperatura considerado anômalo
SMOKE_CONFIRM_PPM = 120.0  # abaixo disso, não há fumaça que justifique o salto


def flag_outliers(df: pd.DataFrame, temp_jump: float = TEMP_JUMP_C, smoke_threshold: float = SMOKE_CONFIRM_PPM) -> pd.DataFrame:
    """Adiciona coluna booleana `is_outlier` por dispositivo.

    Um salto de temperatura > `temp_jump` entre leituras consecutivas do mesmo
    dispositivo, sem fumaça (`ppm_fumaca` < `smoke_threshold`), indica sensor defeituoso.
    """
    out = df.sort_values(["device_id", "timestamp"]).copy()
    temp_prev = out.groupby("device_id")["temperatura"].shift(1)
    temp_delta = (out["temperatura"] - temp_prev).abs()
    out["is_outlier"] = (temp_delta > temp_jump) & (out["ppm_fumaca"] < smoke_threshold)
    out["is_outlier"] = out["is_outlier"].fillna(False)
    return out
