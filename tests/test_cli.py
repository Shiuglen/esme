from pathlib import Path

import pytest

from daimon.cli import ingest_cmd, main
from tests.fakes import fake_encoder

FIX = Path(__file__).parent / "fixtures"


def test_ingest_cmd(tmp_path):
    n = ingest_cmd(tmp_path / "home", [FIX], encoder=fake_encoder(32))
    assert n >= 3
    assert ingest_cmd(tmp_path / "home", [FIX], encoder=fake_encoder(32)) == 0   # idempotente


def test_help():
    with pytest.raises(SystemExit) as e:
        main(["--help"])
    assert e.value.code == 0


def test_serve_arranca_y_responde(tmp_path):
    import json, subprocess, sys, urllib.request, os
    home = tmp_path / "home"; home.mkdir()
    (home / "config.json").write_text('{"encoder": "hash:32"}')
    env = dict(os.environ)
    p = subprocess.Popen([sys.executable, "-m", "daimon.cli", "serve", "--home", str(home), "--port", "0"],
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env=env)
    try:
        info = json.loads(p.stdout.readline())
        req = urllib.request.Request(f"http://127.0.0.1:{info['port']}/health",
                                     headers={"Authorization": f"Bearer {info['token']}"})
        assert json.loads(urllib.request.urlopen(req, timeout=10).read())["ok"] is True
    finally:
        p.terminate(); p.wait(10)
