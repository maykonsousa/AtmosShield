"""Validação de dispositivos por api_key (homologação de sensores)."""
from src.backend.config import VALID_API_KEYS


def is_valid_api_key(api_key: str) -> bool:
    """True se a api_key pertence a um dispositivo homologado."""
    return api_key in VALID_API_KEYS
