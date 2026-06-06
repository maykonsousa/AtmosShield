import pandas as pd
from src.backend.pipelines.ingest_inpe import load_inpe


def test_carrega_e_limpa(tmp_path):
    csv = tmp_path / "focos.csv"
    csv.write_text(
        "datahora_gmt,latitude,longitude,municipio,estado,bioma,numero_dias_sem_chuva,precipitacao,risco_fogo,frp\n"
        "2025-08-12 16:20:00,-3.4712,-52.3812,Altamira,PA,Amazonia,21,0.0,0.92,48.3\n"
        ",,-52.0,SemCoord,PA,Amazonia,1,0.0,0.10,1.0\n"  # sem lat/lon => descartada
        "2025-08-13 15:40:00,-5.7811,-53.0021,Novo Progresso,PA,Amazonia,28,0.0,0.97,88.4\n"
    )
    df = load_inpe(str(csv))
    assert len(df) == 2  # linha sem coordenadas foi removida
    assert {"latitude", "longitude", "risco_fogo", "datahora_gmt"}.issubset(df.columns)
    assert pd.api.types.is_datetime64_any_dtype(df["datahora_gmt"])
    assert pd.api.types.is_float_dtype(df["latitude"])
