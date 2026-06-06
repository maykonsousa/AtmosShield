"""Caminhos e configuração centralizados do AtmosShield (resolvidos pelo pacote, não pelo CWD)."""
import os
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent          # .../src/backend
REPO_ROOT = PACKAGE_ROOT.parent.parent                  # raiz do repositório

ARTIFACT_DIR = PACKAGE_ROOT / "ml" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "risk_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"

DATA_DIR = REPO_ROOT / "data"
FOCOS_CSV = DATA_DIR / "inpe_focos_sample.csv"
ALERTS_JSON = DATA_DIR / "alerts.json"
IMAGES_DIR = REPO_ROOT / "docs" / "images"

DEFAULT_DB_PATH = DATA_DIR / "atmosshield.db"


def db_path() -> Path:
    """Caminho do SQLite; a env var ATMOSSHIELD_DB permite apontar para um arquivo temporário em testes."""
    return Path(os.environ.get("ATMOSSHIELD_DB", str(DEFAULT_DB_PATH)))


# Dispositivos homologados (api_key -> descrição). POC: chaves estáticas.
VALID_API_KEYS = {
    "atm_shield_secure_token_abc123": "Sensor privado homologado",
    "atm_shield_anchor_gov_0001": "Sensor âncora governamental",
}
