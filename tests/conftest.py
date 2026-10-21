"""Las pruebas no comparten el cerrojo de la máquina: cada una usa el suyo.

El cerrojo del espejo (`daimon/presupuesto.py`) es de **toda** la máquina, y a propósito: dos
análisis de REA a la vez son los que se comieron la memoria el 21-oct y tumbaron el escritorio.
Pero eso significa que, si hay un análisis de verdad en marcha, las pruebas que analizan reciben
«ya hay un análisis en marcha» y fallan sin motivo. Aquí cada prueba usa su propio cerrojo
(`DAIMON_CACHE`), que es lo que las hace herméticas.
"""
import os
import tempfile

os.environ["DAIMON_CACHE"] = tempfile.mkdtemp(prefix="daimon-pruebas-")
