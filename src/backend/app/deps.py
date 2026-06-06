"""Dependências do FastAPI."""
from src.backend.app import db


def get_db():
    """Fornece uma conexão SQLite por request, criando o schema se necessário."""
    conn = db.get_conn()
    try:
        db.init_db(conn)
        yield conn
    finally:
        conn.close()
