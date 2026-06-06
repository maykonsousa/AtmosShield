"""Visualizações do AtmosShield: mapa de calor (Folium) e gráficos (Seaborn/Matplotlib)."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # backend headless (sem display)
import matplotlib.pyplot as plt  # noqa: E402
import seaborn as sns  # noqa: E402
import pandas as pd  # noqa: E402
import folium  # noqa: E402

RISK_COLORS = {0: "green", 1: "orange", 2: "red"}
RISK_NAMES = {0: "Baixo", 1: "Moderado", 2: "Critico"}


def build_risk_heatmap(focos_df: pd.DataFrame, alerts: list[dict]) -> folium.Map:
    """Mapa Folium: focos de satélite (INPE) + nós/alertas coloridos por risco."""
    center = [float(focos_df["latitude"].mean()), float(focos_df["longitude"].mean())]
    m = folium.Map(location=center, zoom_start=5, tiles="CartoDB positron")
    for _, f in focos_df.iterrows():
        folium.CircleMarker(
            [f["latitude"], f["longitude"]], radius=4, color="#8B0000",
            fill=True, fill_opacity=0.5,
            popup=f"Foco INPE — {f.get('municipio', '')}",
        ).add_to(m)
    for a in alerts:
        folium.CircleMarker(
            [a["latitude"], a["longitude"]], radius=7,
            color=RISK_COLORS.get(a["risco"], "gray"), fill=True, fill_opacity=0.9,
            popup=f"{a['device_id']} — {a['risco_label']}",
        ).add_to(m)
    return m


def plot_confusion_matrix(metrics: dict, out_path) -> Path:
    cm = metrics["confusion_matrix"]
    labels = [RISK_NAMES[i] for i in range(len(cm))]
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Reds", xticklabels=labels, yticklabels=labels, ax=ax)
    ax.set_xlabel("Previsto")
    ax.set_ylabel("Real")
    ax.set_title("Matriz de Confusão — Risco de Alastramento")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return Path(out_path)


def plot_feature_importance(metrics: dict, out_path) -> Path:
    s = pd.Series(metrics["feature_importances"]).sort_values()
    fig, ax = plt.subplots(figsize=(6, 4))
    sns.barplot(x=s.values, y=list(s.index), color="#c0392b", ax=ax)
    ax.set_title("Importância das Features")
    ax.set_xlabel("Importância")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return Path(out_path)


def plot_risk_distribution(alerts: list[dict], out_path) -> Path:
    df = pd.DataFrame(alerts)
    order = ["Baixo", "Moderado", "Critico"]
    counts = df["risco_label"].value_counts().reindex(order, fill_value=0)
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.bar(order, counts.values, color=["#27ae60", "#f39c12", "#c0392b"])
    ax.set_title("Distribuição de Risco dos Alertas")
    ax.set_xlabel("Risco")
    ax.set_ylabel("Nós")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return Path(out_path)
