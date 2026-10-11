from daimon.immune import TRUST, clean, is_excluded, redact


def test_redacta_claves():
    out = redact("key sk-ant-api03-AbCdEf1234567890xyz y ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    assert "sk-ant" not in out and "ghp_" not in out
    assert out.count("[SECRET_REDACTED]") == 2


def test_redacta_password():
    a = redact("password: hunter2!")
    b = redact("contraseña = Clave.123")
    assert "hunter2" not in a and "Clave.123" not in b


def test_excluye_firme():
    for t in ["Proyecto FirmeDigital", "la firma digital", "FIRMÉ el deploy",
              "/run/media/sakai/FC5065AB50656CF8/x", "ssh 172.20.1.101"]:
        assert is_excluded(t), t
    assert not is_excluded("Daimon memoria")


def test_clean():
    assert clean("hablemos de FirmeDigital") is None
    assert clean("token: abcdefghijklmnop") == "token: [SECRET_REDACTED]"
    assert clean("hola") == "hola"


def test_trust_orden():
    assert TRUST["user"] > TRUST["file"] > TRUST["ai_verified"] > TRUST["ai"] > TRUST["web"]
