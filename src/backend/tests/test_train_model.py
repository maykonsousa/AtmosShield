import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from src.backend.pipelines.train_model import train
from src.backend.pipelines.generate_simulation import generate_readings


def _focos():
    return pd.DataFrame({"latitude": [-3.50, -5.78, -12.54], "longitude": [-52.38, -53.00, -55.72]})


def test_train_retorna_modelo_e_metricas():
    df = generate_readings(_focos(), n_nodes=120, seed=42)
    model, metrics = train(df)
    assert isinstance(model, DecisionTreeClassifier)
    assert "accuracy" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert "confusion_matrix" in metrics
    assert "feature_importances" in metrics
    assert set(metrics["feature_importances"].keys())  # não vazio
