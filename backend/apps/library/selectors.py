"""Consultas dos bancos: global + escritório, com a entrada do escritório valendo sobre a global."""

import hashlib
import json

from django.db.models import Count, Max, QuerySet, Sum

from .models import LIBRARY_MODELS, LibraryEntry


def model_for(kind: str) -> type[LibraryEntry]:
    return LIBRARY_MODELS[kind]


def visible_rows(model: type[LibraryEntry], organization) -> QuerySet:
    """Linhas que o escritório pode VER: globais + as dele (nunca de outro escritório)."""
    qs = model.objects.filter(organization__isnull=True)
    if organization is not None:
        qs = qs | model.objects.filter(organization=organization)
    return qs


def merged(model: type[LibraryEntry], organization) -> list[LibraryEntry]:
    """Uma entrada por slug: a do escritório (se houver) no lugar da global; inativas saem."""
    by_slug: dict[str, LibraryEntry] = {}
    for row in visible_rows(model, organization).order_by("organization_id"):
        # Globais (organization nulo) vêm por último no ORDER BY do Postgres → a do escritório
        # chega primeiro; mantém a primeira de cada slug.
        by_slug.setdefault(row.slug, row)
    rows = [r for r in by_slug.values() if r.is_active]
    ordering = model._meta.ordering or ["name"]
    for field in reversed(ordering):
        rows.sort(key=lambda r, f=field: getattr(r, f))
    return rows


def bundle(organization) -> dict[str, list[dict]]:
    return {
        kind: [r.to_front() for r in merged(m, organization)] for kind, m in LIBRARY_MODELS.items()
    }


def bundle_etag(organization) -> str:
    """Muda sempre que alguma entrada visível muda (versão, criação, exclusão, ativação)."""
    parts = []
    for kind, m in LIBRARY_MODELS.items():
        agg = visible_rows(m, organization).aggregate(
            n=Count("id"), last=Max("updated_at"), versions=Sum("version")
        )
        parts.append([kind, agg["n"], str(agg["last"]), agg["versions"]])
    org_id = organization.pk if organization is not None else None
    raw = json.dumps([org_id, parts], sort_keys=True).encode()
    return f'"lib-{hashlib.sha1(raw).hexdigest()[:20]}"'
