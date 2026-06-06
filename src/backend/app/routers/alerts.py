"""GET /alerts — lista as leituras classificadas mais recentes."""
from fastapi import APIRouter, Depends

from src.backend.app import db
from src.backend.app.deps import get_db
from src.backend.app.schemas import RiskAlertOut

router = APIRouter()


@router.get("/alerts", response_model=list[RiskAlertOut])
def get_alerts(conn=Depends(get_db)):
    rows = db.fetch_recent(conn, limit=100)
    alerts = []
    for r in rows:
        d = dict(r)
        d["is_outlier"] = bool(d["is_outlier"])
        alerts.append(d)
    return alerts
