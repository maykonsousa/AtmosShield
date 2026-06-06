"""Treina o classificador de risco de alastramento e persiste artefatos."""
import json

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

from src.backend.ml.features import FEATURE_COLUMNS
from src.backend.config import ARTIFACT_DIR, MODEL_PATH, METRICS_PATH, FOCOS_CSV


def train(df: pd.DataFrame) -> tuple[DecisionTreeClassifier, dict]:
    """Treina o DecisionTree e retorna (modelo, métricas)."""
    X = df[FEATURE_COLUMNS]
    y = df["risco"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = DecisionTreeClassifier(max_depth=6, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, preds)),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
        "classification_report": classification_report(y_test, preds, output_dict=True, zero_division=0),
        "feature_importances": dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist())),
    }
    return model, metrics


def main() -> None:
    from src.backend.pipelines.generate_simulation import generate_readings
    from src.backend.pipelines.ingest_inpe import load_inpe

    focos = load_inpe(str(FOCOS_CSV))
    df = generate_readings(focos, n_nodes=300, seed=42)
    model, metrics = train(df)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(f"Modelo salvo em {MODEL_PATH}")
    print(f"Acurácia: {metrics['accuracy']:.3f}")


if __name__ == "__main__":
    main()
