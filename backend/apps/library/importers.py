"""Importação de planilhas (CSV/XLSX) para um banco, com relatório de erro por linha.

As colunas são as do formato do front, "achatadas" (ver `COLUMNS`). Linhas válidas entram
(criam ou atualizam pelo `id`); linhas com erro são listadas e não entram.
"""

import csv
import io
from dataclasses import dataclass, field
from pathlib import Path

from django.db import transaction

from .models import LibraryEntry
from .services import InvalidEntry, validate_front

# (coluna da planilha, caminho no formato do front, tipo)
Col = tuple[str, str, str]

COLUMNS: dict[str, list[Col]] = {
    "materials": [
        ("id", "id", "str"),
        ("nome", "name", "str"),
        ("tipo", "kind", "str"),
        ("cor", "hex", "str"),
        ("fabricante", "manufacturer", "str"),
        ("linha", "line", "str"),
        ("codigo", "code", "str"),
        ("espessuras_mm", "thicknessesMm", "int_list"),
        ("chapa_comprimento_mm", "sheet.lengthMm", "int"),
        ("chapa_largura_mm", "sheet.widthMm", "int"),
    ],
    "floors": [
        ("id", "id", "str"),
        ("nome", "name", "str"),
        ("material", "material", "str"),
        ("peca_comprimento_mm", "pieceAMm", "int"),
        ("peca_largura_mm", "pieceBMm", "int"),
        ("junta_mm", "jointMm", "float"),
        ("paginacao", "pattern", "str"),
        ("perda_pct", "wastePct", "float"),
        ("cor", "color", "str"),
        ("fabricante", "manufacturer", "str"),
        ("codigo", "code", "str"),
        ("preco_m2_centavos", "pricePerM2Cents", "int"),
    ],
    "handles": [
        ("id", "id", "str"),
        ("nome", "name", "str"),
        ("tipo", "kind", "str"),
        ("fabricante", "manufacturer", "str"),
        ("codigo", "code", "str"),
        ("comprimento_mm", "lengthMm", "int"),
        ("acabamento", "finish", "str"),
    ],
    "hardware": [
        ("id", "id", "str"),
        ("nome", "name", "str"),
        ("tipo", "kind", "str"),
        ("fabricante", "manufacturer", "str"),
        ("codigo", "code", "str"),
        ("observacoes", "notes", "str"),
    ],
    "spec-templates": [
        ("id", "id", "str"),
        ("nome", "name", "str"),
        ("categoria", "category", "str"),
        ("texto", "text", "str"),
    ],
}

IMPORTABLE_KINDS = list(COLUMNS)


@dataclass
class ImportReport:
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "criados": self.created,
            "atualizados": self.updated,
            "iguais": self.unchanged,
            "erros": self.errors,
        }


def _cell(value: object, kind: str):
    if value is None:
        return None
    text = str(value).strip()
    if text == "":
        return None
    if kind == "str":
        return text
    if kind == "int":
        return int(float(text.replace(",", ".")))
    if kind == "float":
        return float(text.replace(",", "."))
    if kind == "int_list":
        return [int(p) for p in text.replace(",", ";").split(";") if p.strip()]
    raise ValueError(kind)


def read_rows(name: str, content: bytes) -> list[dict[str, object]]:
    """Linhas da planilha como dicionários pelo cabeçalho (minúsculo). CSV: `;` ou `,`."""
    suffix = Path(name).suffix.lower()
    if suffix == ".xlsx":
        from openpyxl import load_workbook

        ws = load_workbook(io.BytesIO(content), read_only=True, data_only=True).active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        header = [str(h or "").strip().lower() for h in rows[0]]
        return [
            dict(zip(header, r, strict=False)) for r in rows[1:] if any(c is not None for c in r)
        ]
    if suffix == ".csv":
        text = content.decode("utf-8-sig")
        dialect = csv.Sniffer().sniff(text.splitlines()[0] if text else ",", delimiters=";,")
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        return [{(k or "").strip().lower(): v for k, v in r.items()} for r in reader]
    raise ValueError("Use um arquivo .csv ou .xlsx.")


def row_to_front(kind: str, row: dict[str, object]) -> dict:
    out: dict = {"version": 1}
    for column, path, typ in COLUMNS[kind]:
        value = _cell(row.get(column), typ)
        if value is None:
            continue
        target = out
        *parents, leaf = path.split(".")
        for p in parents:
            target = target.setdefault(p, {})
        target[leaf] = value
    return out


@transaction.atomic
def import_rows(
    model: type[LibraryEntry], rows: list[dict], *, organization, user=None, dry_run=False
) -> ImportReport:
    report = ImportReport()
    kind = model.KIND
    for n, row in enumerate(rows, start=2):  # linha 1 = cabeçalho
        try:
            data = validate_front(kind, row_to_front(kind, row))
        except (InvalidEntry, ValueError) as exc:
            msgs = exc.errors if isinstance(exc, InvalidEntry) else [str(exc)]
            report.errors.extend(f"linha {n}: {m}" for m in msgs)
            continue
        existing = model.objects.filter(organization=organization, slug=data["id"]).first()
        if existing is None:
            twin = (
                model.objects.filter(organization__isnull=True, slug=data["id"]).first()
                if organization is not None
                else None
            )
            row_obj = model(organization=organization, created_by=user)
            row_obj.set_front(data)
            row_obj.version = twin.version + 1 if twin else 1
            if not dry_run:
                row_obj.save()
            report.created += 1
            continue
        before = existing.to_front()
        existing.set_front({**data, "version": existing.version})
        if existing.to_front() != before:
            existing.version += 1
            if not dry_run:
                existing.save()
            report.updated += 1
        else:
            report.unchanged += 1
    if dry_run:
        transaction.set_rollback(True)
    return report
