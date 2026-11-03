"""Validação do documento contra o JSON Schema exportado do front (`npm run export:schema`)."""

import json
from functools import cache
from pathlib import Path

from jsonschema import Draft202012Validator

from apps.common.jsonschema_pt import message_pt

SCHEMA_PATH = Path(__file__).parent / "schema" / "project.schema.json"
REPORT_SCHEMA_PATH = Path(__file__).parent / "schema" / "report.schema.json"
MAX_ERRORS = 5


@cache
def validator() -> Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def current_schema_version() -> int:
    return int(validator().schema["properties"]["schemaVersion"]["const"])


def document_errors(data: object) -> list[str]:
    """Erros legíveis (até 5), com o caminho no documento. Lista vazia = válido."""
    if isinstance(data, dict):
        version = data.get("schemaVersion")
        expected = current_schema_version()
        if isinstance(version, int) and version != expected:
            return [
                f"Formato v{version}; o servidor espera v{expected}. "
                "Atualize a página para o editor converter o projeto."
            ]
    errors = sorted(validator().iter_errors(data), key=lambda e: list(e.absolute_path))
    out = []
    for e in errors[:MAX_ERRORS]:
        path = "/".join(str(p) for p in e.absolute_path) or "(documento)"
        out.append(f"{path}: {message_pt(e)}")
    return out


@cache
def report_validator() -> Draft202012Validator:
    schema = json.loads(REPORT_SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def report_errors(report: object) -> list[str]:
    """Erros do relatório do memorial (formato exportado do front)."""
    errors = sorted(report_validator().iter_errors(report), key=lambda e: list(e.absolute_path))
    return [
        f"{'/'.join(str(p) for p in e.absolute_path) or '(relatório)'}: {message_pt(e)}"
        for e in errors[:MAX_ERRORS]
    ]
