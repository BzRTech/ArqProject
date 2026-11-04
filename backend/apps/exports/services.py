"""Memorial do projeto em PDF (WeasyPrint), a partir do índice de linhas (ProjectItemIndex).

O servidor não calcula nada do desenho: as linhas, marcadores e quantidades vêm do relatório
que o editor envia no save. Aqui só se agrupa, formata e imprime, com a marca do escritório.
"""

import base64
from collections import OrderedDict
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from apps.accounts.models import Organization
from apps.assets.models import Asset
from apps.assets.storage import s3_client
from apps.projects.models import Project

FONTS = Path(__file__).parent / "fonts"
DISCIPLINE_ORDER = ["layout", "marcenaria", "revestimentos", "eletrica", "hidraulica", ""]
DISCIPLINE_LABEL = {
    "layout": "Mobiliário e layout",
    "marcenaria": "Marcenaria",
    "revestimentos": "Revestimentos",
    "eletrica": "Elétrica",
    "hidraulica": "Louças e metais",
    "": "Outros",
}


def brl(cents: int | None) -> str:
    """R$ 1.234,56 (centavos inteiros → texto pt-BR)."""
    if cents is None:
        return "—"
    reais, cent = divmod(int(cents), 100)
    return f"R$ {reais:,}".replace(",", ".") + f",{cent:02d}"


def qty_text(q: Decimal) -> str:
    q = q.normalize()
    text = f"{q:f}"
    return text.replace(".", ",")


def logo_data_uri(org: Organization) -> str | None:
    """Logo embutido no PDF (data URI), lido do S3 do escritório."""
    asset: Asset | None = org.logo
    if asset is None or asset.status != Asset.Status.READY:
        return None
    try:
        obj = s3_client().get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=asset.key)
        raw = obj["Body"].read()
    except Exception:  # sem S3 → memorial sem logo, nunca falha por isso
        return None
    return f"data:{asset.content_type};base64,{base64.b64encode(raw).decode()}"


def memorial_context(project: Project) -> dict:
    org = project.organization
    envs: OrderedDict[str, dict] = OrderedDict()
    for row in project.item_index.order_by("pk"):
        env = envs.setdefault(
            row.environment_id,
            {"name": row.environment_name, "groups": OrderedDict(), "total": 0},
        )
        group = env["groups"].setdefault(row.discipline, [])
        total = 0 if row.existing or row.unit_price_cents is None else None
        if total is None:
            total = int((row.qty * row.unit_price_cents).to_integral_value())
        env["total"] += total
        spec = " · ".join(x for x in [row.brand_model, row.detail] if x)
        if row.existing:
            spec = " · ".join(x for x in ["Existente no local", spec] if x)
        group.append(
            {
                "marker": row.marker_no,
                "name": row.name,
                "spec": spec,
                "supplier": row.supplier,
                "qty": f"{qty_text(row.qty)} {row.unit}".strip(),
                "unit_price": brl(row.unit_price_cents) if row.unit_price_cents is not None else "",
                "total": brl(total) if total else ("—" if not row.existing else ""),
                "approved": row.approved,
            }
        )
    environments = []
    for env in envs.values():
        groups = sorted(
            env["groups"].items(),
            key=lambda kv: DISCIPLINE_ORDER.index(kv[0]) if kv[0] in DISCIPLINE_ORDER else 99,
        )
        environments.append(
            {
                "name": env["name"],
                "groups": [
                    {"label": DISCIPLINE_LABEL.get(k, k.capitalize()), "lines": v}
                    for k, v in groups
                ],
                "total": brl(env["total"]),
            }
        )
    grand = sum(
        0
        if r.existing or r.unit_price_cents is None
        else int((r.qty * r.unit_price_cents).to_integral_value())
        for r in project.item_index.all()
    )
    contacts = [x for x in [org.phone, org.email, org.website, org.address, org.registration] if x]
    return {
        "fonts": FONTS.as_uri(),
        "org": org,
        "logo": logo_data_uri(org),
        "accent": org.brand_color or "#1c1b19",
        "contacts": contacts,
        "project": project,
        "date": timezone.localdate().strftime("%d/%m/%Y"),
        "environments": environments,
        "grand_total": brl(grand),
        "empty": not environments,
    }


def render_memorial(project: Project) -> bytes:
    from weasyprint import HTML  # import tardio: só quem gera PDF precisa das libs nativas

    html = render_to_string("exports/memorial.html", memorial_context(project))
    return HTML(string=html, base_url=str(FONTS)).write_pdf()
