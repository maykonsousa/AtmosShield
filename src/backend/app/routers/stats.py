"""GET /stats — contagem de alertas por risco."""
from fastapi import APIRouter, Depends

from src.backend.app import db
from src.backend.app.deps import get_db

router = APIRouter()


@router.get("/stats")
def get_stats(conn=Depends(get_db)):
    return db.stats_by_risk(conn)
