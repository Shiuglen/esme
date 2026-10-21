# La distribución de Esme: lo que hay, lo que falta y lo que falta por hacer (2026-10-20)

> Lo que el creador tenía pendiente y este documento deja reducido a **un solo paso humano**
> (cinco minutos en el navegador) y **una línea de código**.

## 1. Lo que ya está hecho y verificado

| Pieza | Estado | Cómo se comprueba |
|---|---|---|
| **El repositorio, público** | ✅ `github.com/Shiuglen/esme` responde 200 | El historial se revisó antes de hacerlo: los únicos «secretos» son fixtures de los tests de redacción |
| **La release con el paquete** | ✅ `v0.1.0` con la rueda (77 KB) y el sdist (98 KB) | `gh release view v0.1.0` |
| **La entrada del registro (la mente en marcha)** | ✅ **publicada**: `io.github.Shiuglen/esme-remoto` | `GET /v0/servers?search=esme` la devuelve |
| **La entrada del registro (el conector)** | ✅ válida; **bloqueada por un 404 de PyPI** | `POST /v0/publish` → «PyPI package 'daimon-esme' not found» |
| **La rueda, instalable y hablando MCP** | ✅ probada en un venv limpio | `initialize` + `tools/list` (7 herramientas) + `tools/call` con `daimon serve-mcp` |
| **El nombre en PyPI** | ✅ libre | `GET pypi.org/pypi/daimon-esme/json` → 404 |
| **El publicador sin token** | ✅ workflow listo | `.github/workflows/publicar-pypi.yml` (publicación de confianza, OIDC) |

### El fallo que se cazó por el camino

El paquete publicado **se caía al arrancar**: el codificador por defecto era `model2vec`, que es un
extra opcional, así que `pip install daimon-esme` → `daimon serve-mcp` → `ModuleNotFoundError`.
El README y `daimon/modelos.py` ya decían que el de por defecto es **la Lente ONNX**; el código no
lo estaba haciendo.

**Arreglado**: el default es ahora `onnx:embeddinggemma-300m` (sus dependencias —onnxruntime,
tokenizers, huggingface_hub— son del paquete base) y `daimon serve` / `serve-mcp` **bajan la Lente
solos** si no está (316 MB, una vez, con un aviso). La rueda se reconstruyó y se volvió a probar
en un venv limpio: `initialize`, `tools/list` y `tools/call` responden.

### Y un detalle que costó un 403

El nombre del namespace es **canónico**: `io.github.Shiuglen/esme`, con la `S` mayúscula, porque
el permiso del registro sale de la identidad OAuth de GitHub y la comparación es literal. Con la
minúscula (`io.github.shiuglen/esme`) el registro responde 403 aunque valide la entrada.

## 2. El paso que queda (cinco minutos, en el navegador)

**Crear la cuenta de PyPI y registrar el nombre.** No hay forma de hacerlo con una API: PyPI exige
correo verificado y 2FA. Es lo único que no puede hacer un agente.

1. Crear la cuenta en <https://pypi.org/manage/account/> (con 2FA).
2. Registrar el proyecto **«daimon-esme»** en <https://pypi.org/manage/project/> y añadir como
   *pending publisher* el repositorio `Shiuglen/esme` con el entorno **«pypi»**.
3. En GitHub: `Settings › Environments` → crear el entorno **«pypi»** (y permitir el despliegue
   desde la rama que se etiquete).

Y ya está. A partir de ahí:

```bash
git tag v0.1.1 && git push origin v0.1.1     # el workflow sube la rueda a PyPI
node mcp/publicar.mjs --publicar             # la entrada del conector (necesita el canje)
```

El canje del registro (lo que antes era «pide un token») **ya no hace falta pedirlo**: el token de
GitHub de esta máquina se canjea por un JWT del registro:

```bash
gh auth token | python3 -c "
import json,sys,urllib.request
req=urllib.request.Request('https://registry.modelcontextprotocol.io/v0/auth/github-at',
  data=json.dumps({'github_token':sys.stdin.read().strip()}).encode(),
  headers={'Content-Type':'application/json'},method='POST')
print(json.loads(urllib.request.urlopen(req).read())['registry_token'])"
# → export REGISTRY_TOKEN=<eso> y node mcp/publicar.mjs --publicar
```

## 3. Los agregadores (el registro no los reparte)

- **Smithery**: <https://smithery.ai> — publicar el servidor (5 min).
- **Glama**: <https://glama.ai/mcp/servers> — alta (3 min).
- **npm**: la entrada admite `registryType: npm`; la cuenta de npm de esta máquina **no tiene
  sesión** (`npm whoami` → ENEEDAUTH), así que sigue siendo un paso de cuenta.

## 4. Lo que la publicación no arregla (y es lo de verdad importante)

Publicar el conector **no** da usuarios: da **distribución sin cuentas**. El motor de Esme sigue
siendo lo que es (0,929 de acierto contra el 0,857 de mem0, con un 25 % menos de contexto) y la
percepción sigue siendo lo que falta. La publicación es la última milla, no el camino.
