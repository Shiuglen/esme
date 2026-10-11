"""Profesores: las IAs que responden. F1: Ollama local (nada privado sale del equipo)."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request

_THINK = re.compile(r"<think>.*?</think>", re.S)


class TeacherError(RuntimeError):
    pass


class Ollama:
    def __init__(self, model: str, host: str = "http://127.0.0.1:11434", timeout: float = 180,
                 retries: int = 3, backoff: float = 2.0):
        self.model, self.host, self.timeout, self.retries, self.backoff = model, host.rstrip("/"), timeout, retries, backoff

    def answer(self, system: str, prompt: str, max_tokens: int = 256) -> str:
        body = json.dumps({
            "model": self.model, "stream": False, "think": False,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "options": {"temperature": 0, "num_predict": max_tokens},
        }).encode()
        last = None
        for attempt in range(self.retries):
            try:
                req = urllib.request.Request(f"{self.host}/api/chat", data=body, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    content = json.loads(r.read())["message"]["content"]
                return _THINK.sub("", content).strip()
            except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError, ConnectionError) as e:
                last = e
                if attempt < self.retries - 1:
                    time.sleep(self.backoff * (2 ** attempt))
        raise TeacherError(f"{self.model}: {last}")
