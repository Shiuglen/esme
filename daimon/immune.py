"""Sistema inmune: redacta secretos y excluye lo que nunca debe entrar en la mente."""
import re
import unicodedata

REDACTED = "[SECRET_REDACTED]"

# Confianza por procedencia: lo que dice el usuario pesa más que lo leído en la web.
TRUST = {"user": 1.0, "file": 0.8, "ai_verified": 0.6, "ai": 0.4, "web": 0.2}

# Se buscan sobre texto normalizado (minúsculas, sin acentos).
_EXCLUDE = re.compile(r"firme|firma[\s_-]*digital|fc5065ab50656cf8|172\.20\.1\.101")

_SECRETS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S),
    re.compile(r"\b[a-z][a-z0-9+.\-]*://[^\s:/@]+:[^\s@]+@"),          # cadenas de conexión con usuario:clave@
    re.compile(r"\bAIza[0-9A-Za-z_\-]{20,}"),
    re.compile(r"\bxox[abposr]-[0-9A-Za-z\-]{10,}"),
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}"),
    re.compile(r"\b(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bBearer\s+[A-Za-z0-9._\-]{20,}"),
    re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"),
]
_ASSIGN = re.compile(
    r"""(?i)\b((?:[a-z0-9]+_)*)(password|passwd|contraseña|contrasena|clave|token|secret|api[_-]?key)(["']?\s*[:=]\s*["']?)([^\s"',}]+)""")
_PROSE = re.compile(r"(?i)\b(la contraseña|la clave|el password|my password|the password)\s+(es|is)\s+(\S+)")


def _norm(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def is_excluded(text: str) -> bool:
    return bool(_EXCLUDE.search(_norm(text)))


def redact(text: str) -> str:
    for pat in _SECRETS:
        text = pat.sub(REDACTED, text)
    text = _ASSIGN.sub(lambda m: m.group(1) + m.group(2) + m.group(3) + REDACTED, text)
    return _PROSE.sub(lambda m: f"{m.group(1)} {m.group(2)} {REDACTED}", text)


def clean(text: str) -> str | None:
    """None si el fragmento está excluido; si no, el texto con los secretos redactados."""
    return None if is_excluded(text) else redact(text)
