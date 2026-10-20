"""La Lente: el modelo que convierte el texto en vectores, bajado una vez y usado siempre.

Sin esto, una mente nueva no sabe codificar: el modelo no venía con el paquete y nadie
lo bajaba. Ahora `daimon init` lo baja (una vez, 316 MB) y lo deja en
`~/.local/share/esme/modelos/<nombre>-onnx`, que es donde la Lente lo busca.

**El modelo es de Google (Gemma), no nuestro:** su licencia es la de Gemma (uso libre con
condiciones), no la MIT del código. Por eso el README lo dice y por eso el modelo se baja
al instalar, no va dentro del paquete.
"""
from __future__ import annotations

import os
from pathlib import Path

# El repositorio de Hugging Face con el ONNX cuantizado (int8) de la Lente.
REPOS = {
    "embeddinggemma-300m": "onnx-community/embeddinggemma-300m-ONNX",
}
# Los ficheros que hacen falta: el ONNX cuantizado (con sus datos externos) y el tokenizador.
FICHEROS = [
    "config.json",
    "tokenizer.json",
    "special_tokens_map.json",
    "onnx/model_quantized.onnx",
    "onnx/model_quantized.onnx_data",
]

DEFAULT = "embeddinggemma-300m"


def ruta_modelo(nombre: str = DEFAULT) -> Path:
    """La carpeta del modelo (la misma que usa la Lente)."""
    base = Path(os.environ.get("ESME_MODELOS", Path.home() / ".local/share/esme/modelos"))
    return base / f"{nombre}-onnx"


def esta_instalado(nombre: str = DEFAULT) -> bool:
    """¿Está el modelo en su sitio y completo?"""
    d = ruta_modelo(nombre)
    return (d / "onnx" / "model_quantized.onnx").exists() and (d / "tokenizer.json").exists()


def tamano_instalado(nombre: str = DEFAULT) -> int:
    d = ruta_modelo(nombre)
    return sum(f.stat().st_size for f in d.rglob("*") if f.is_file())


def bajar_modelo(nombre: str = DEFAULT, destino: Path | None = None, progreso=None) -> Path:
    """Baja el modelo (si no está) y devuelve su carpeta. Idempotente.

    Se usa `huggingface_hub` porque ya es una dependencia: sabe reanudar, verificar la
    suma y no repetir lo descargado. Si no hay red, lo dice claro y deja la carpeta como
    estaba (nunca a medias: se baja a una carpeta temporal y se mueve al final).
    """
    d = destino or ruta_modelo(nombre)
    if esta_instalado(nombre) and destino is None:
        return d
    repo = REPOS.get(nombre)
    if repo is None:
        raise ValueError(f"no sé bajar la lente «{nombre}»: las conocidas son {', '.join(REPOS)}")
    try:
        from huggingface_hub import snapshot_download
    except ImportError as e:      # pragma: no cover - depende del entorno
        raise RuntimeError("falta huggingface_hub: instálalo o baja el modelo a mano") from e

    temporal = d.with_name(d.name + ".bajando")
    if progreso:
        progreso(f"Bajando la lente «{nombre}» (una vez, unos 316 MB)…")
    snapshot_download(repo_id=repo, local_dir=str(temporal), allow_patterns=FICHEROS)
    # Se mueve entero o no se mueve: una lente a medias rompe la mente en silencio.
    if d.exists():
        for f in d.rglob("*"):
            if f.is_file():
                f.unlink()
    d.parent.mkdir(parents=True, exist_ok=True)
    os.replace(temporal, d)
    if progreso:
        progreso(f"Lente lista en {d}")
    return d
