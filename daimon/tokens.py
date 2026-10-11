"""Estimación de tokens única para todo Daimon: así todas las variantes se miden igual."""
import math


def count(text: str) -> int:
    return math.ceil(len(text) / 4) if text else 0
