"""Validação das entradas pelo formato do front (JSON Schemas exportados do zod)."""

import json
from functools import cache
from pathlib import Path

from jsonschema import Draft202012Validator

from apps.common.jsonschema_pt import message_pt

SCHEMA_DIR = Path(__file__).parent / "schema"
MAX_ERRORS = 5


@cache
def validator(kind: str) -> Draft202012Validator:
    schema = json.loads((SCHEMA_DIR / f"{kind}.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def entry_errors(kind: str, data: object) -> list[str]:
    """Erros legíveis (até 5) com o caminho do campo. Lista vazia = válido."""
    errors = sorted(validator(kind).iter_errors(data), key=lambda e: list(e.absolute_path))
    out = []
    for e in errors[:MAX_ERRORS]:
        path = ".".join(str(p) for p in e.absolute_path) or "(entrada)"
        out.append(f"{path}: {message_pt(e)}")
    return out
