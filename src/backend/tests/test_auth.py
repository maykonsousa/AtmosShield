from src.backend.app.auth import is_valid_api_key


def test_chave_valida():
    assert is_valid_api_key("atm_shield_secure_token_abc123") is True


def test_chave_invalida():
    assert is_valid_api_key("chave-que-nao-existe") is False


def test_chave_vazia():
    assert is_valid_api_key("") is False
