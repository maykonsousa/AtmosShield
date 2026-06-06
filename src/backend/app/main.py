"""Aplicação FastAPI do AtmosShield."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.backend.app.routers import health, readings, alerts
from src.backend.app.services.scoring import load_model, load_focos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # carrega o modelo e os focos uma única vez
    app.state.model = load_model()
    app.state.focos = load_focos()
    yield


app = FastAPI(title="AtmosShield API", version="0.1.0", lifespan=lifespan)
app.include_router(health.router)
app.include_router(readings.router)
app.include_router(alerts.router)
