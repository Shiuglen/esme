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
