import pandas as pd
from src.backend.pipelines.batch_inference import run_batch
from src.backend.pipelines.generate_simulation import generate_readings
from src.backend.pipelines.train_model import train


def _focos():
    return pd.DataFrame({"latitude": [-3.50, -5.78, -12.54], "longitude": [-52.38, -53.00, -55.72]})


def test_run_batch_gera_alertas():
    df = generate_readings(_focos(), n_nodes=120, seed=42)
    model, _ = train(df)
    alerts = run_batch(model, df)
    assert len(alerts) == len(df)
    primeiro = alerts[0]
    assert {"device_id", "latitude", "longitude", "risco", "risco_label"}.issubset(primeiro.keys())
    assert primeiro["risco_label"] in {"Baixo", "Moderado", "Critico"}
    assert primeiro["risco"] in {0, 1, 2}
