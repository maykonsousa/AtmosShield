"""Dependências do FastAPI."""
from src.backend.app import db


def get_db():
    """Fornece uma conexão SQLite por request (o schema é criado no lifespan da app)."""
    conn = db.get_conn()
    try:
        yield conn
    finally:
        conn.close()
