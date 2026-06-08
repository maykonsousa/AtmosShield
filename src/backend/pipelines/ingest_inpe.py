"""Ingestão e limpeza de focos de calor do INPE (BDQueimadas)."""
import pandas as pd

NUMERIC_COLS = ["latitude", "longitude", "numero_dias_sem_chuva", "precipitacao", "risco_fogo", "frp"]


def load_inpe(path: str) -> pd.DataFrame:
    """Lê o CSV de focos, converte tipos e descarta linhas sem coordenadas."""
    df = pd.read_csv(path)
    df["datahora_gmt"] = pd.to_datetime(df["datahora_gmt"], errors="coerce")
    for col in NUMERIC_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude", "datahora_gmt"]).reset_index(drop=True)
    return df


if __name__ == "__main__":
    focos = load_inpe("data/inpe_focos_sample.csv")
    print(f"Focos carregados: {len(focos)}")
    print(focos[["municipio", "estado", "risco_fogo", "frp"]].head())
