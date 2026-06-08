"""POST /readings — recebe leitura do ESP32, valida, classifica e persiste."""
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request

from src.backend.app import db
from src.backend.app.auth import is_valid_api_key
from src.backend.app.deps import get_db
from src.backend.app.schemas import SensorReadingIn, RiskAlertOut
from src.backend.app.services.scoring import score_reading
from src.backend.data_quality import flag_outliers

router = APIRouter()


@router.post("/readings", response_model=RiskAlertOut)
def post_reading(payload: SensorReadingIn, request: Request, conn=Depends(get_db)):
    if not is_valid_api_key(payload.api_key):
        raise HTTPException(status_code=401, detail="api_key inválida ou dispositivo não homologado")

    scored = score_reading(
        latitude=payload.coordenadas.latitude,
        longitude=payload.coordenadas.longitude,
        temperatura=payload.leitura.temperatura,
        umidade_ar=payload.leitura.umidade_ar,
        ppm_fumaca=payload.leitura.ppm_fumaca,
        model=request.app.state.model,
        focos_df=request.app.state.focos,
    )

    received_at = datetime.now(timezone.utc).isoformat()

    # outlier: compara com a última leitura do mesmo dispositivo
    hist = []
    prev = db.last_reading_for_device(conn, payload.device_id)
    if prev is not None:
        hist.append({
            "device_id": prev["device_id"], "timestamp": prev["received_at"],
            "temperatura": prev["temperatura"], "ppm_fumaca": prev["ppm_fumaca"],
        })
    hist.append({
        "device_id": payload.device_id, "timestamp": received_at,
        "temperatura": payload.leitura.temperatura, "ppm_fumaca": payload.leitura.ppm_fumaca,
    })
    flagged = flag_outliers(pd.DataFrame(hist))
    is_outlier = bool(flagged.iloc[-1]["is_outlier"])

    alert = {
        "device_id": payload.device_id,
        "latitude": payload.coordenadas.latitude,
        "longitude": payload.coordenadas.longitude,
        "temperatura": payload.leitura.temperatura,
        "umidade_ar": payload.leitura.umidade_ar,
        "ppm_fumaca": payload.leitura.ppm_fumaca,
        "vento_kmh": scored["vento_kmh"],
        "vento_fonte": scored["vento_fonte"],
        "precipitation_mm": scored["precipitation_mm"],
        "densidade_focos": scored["densidade_focos"],
        "dist_foco_km": scored["dist_foco_km"],
        "risco": scored["risco"],
        "risco_label": scored["risco_label"],
        "is_outlier": is_outlier,
        "received_at": received_at,
    }
    db.insert_reading(conn, {**alert, "is_outlier": int(is_outlier)})
    return alert
