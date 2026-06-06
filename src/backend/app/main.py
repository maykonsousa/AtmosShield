"""Aplicação FastAPI do AtmosShield."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.backend.app import db
from src.backend.app.routers import health, readings, alerts, stats
from src.backend.app.services.scoring import load_model, load_focos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # cria o schema uma vez e carrega modelo/focos
    conn = db.get_conn()
    db.init_db(conn)
    conn.close()
    app.state.model = load_model()
    app.state.focos = load_focos()
    yield


app = FastAPI(title="AtmosShield API", version="0.1.0", lifespan=lifespan)
app.include_router(health.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(stats.router)
