"""Regras de projeto: criar, salvar com controle de revisão, versões, restaurar, duplicar."""

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Project, ProjectItemIndex, ProjectVersion
from .validation import document_errors

AUTO_VERSIONS_KEPT = 50


class InvalidDocument(Exception):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


class RevisionConflict(Exception):
    def __init__(self, project: Project):
        super().__init__("conflito de revisão")
        self.project = project


def validate_document(data: object) -> dict:
    errors = document_errors(data)
    if errors:
        raise InvalidDocument(errors)
    assert isinstance(data, dict)
    return data


def _document_name(data: dict) -> str:
    return str(data.get("name") or "Projeto sem nome")[:200]


def rebuild_item_index(project: Project) -> None:
    """Refaz as linhas do índice a partir do documento (mesma transação do save)."""
    ProjectItemIndex.objects.filter(project=project).delete()
    rows = []
    for env in project.data.get("environments", []):
        for item in env.get("items", []):
            size = item.get("sizeMm", {})
            rows.append(
                ProjectItemIndex(
                    project=project,
                    environment_id=str(env.get("id", ""))[:64],
                    environment_name=str(env.get("name", ""))[:200],
                    item_id=str(item.get("id", ""))[:64],
                    block_id=str(item.get("blockId", ""))[:100],
                    name=str(item.get("name", ""))[:300],
                    qty=Decimal(str(item.get("qty", 1))).quantize(Decimal("0.001")),
                    unit=str(item.get("unit", "un"))[:10],
                    size_w_mm=int(size.get("w", 0)),
                    size_d_mm=int(size.get("d", 0)),
                    size_h_mm=size.get("h"),
                    unit_price_cents=item.get("unitPriceCents"),
                    supplier=str(item.get("supplier") or "")[:200],
                    brand_model=str(item.get("brandModel") or "")[:300],
                    approved=bool(item.get("approved")),
                    existing=bool(item.get("existing")),
                    in_legend=bool(item.get("inLegend", True)),
                    has_joinery=bool((item.get("joinery") or {}).get("design")),
                )
            )
    ProjectItemIndex.objects.bulk_create(rows)


def create_version(
    project: Project, user, *, label: str = "", kind: str = ProjectVersion.Kind.AUTO
) -> ProjectVersion:
    version = ProjectVersion.objects.create(
        project=project,
        revision=project.revision,
        schema_version=project.schema_version,
        data=project.data,
        label=label,
        kind=kind,
        created_by=user,
    )
    if kind == ProjectVersion.Kind.AUTO:
        old = ProjectVersion.objects.filter(project=project, kind=kind).values_list(
            "pk", flat=True
        )[AUTO_VERSIONS_KEPT:]
        ProjectVersion.objects.filter(pk__in=list(old)).delete()
    return version


def _maybe_auto_version(project: Project, user) -> None:
    """Uma versão automática no máximo a cada N minutos de edição (o autosave é frequente)."""
    interval = timedelta(minutes=settings.PROJECT_AUTOVERSION_MINUTES)
    last = project.versions.order_by("-created_at", "-pk").first()
    if last is None or timezone.now() - last.created_at >= interval:
        create_version(project, user)


@transaction.atomic
def create_project(
    *, organization, user, data: object, client_name: str = "", status: str = Project.Status.DRAFT
) -> Project:
    doc = validate_document(data)
    project = Project.objects.create(
        organization=organization,
        name=_document_name(doc),
        client_name=client_name,
        status=status,
        schema_version=doc["schemaVersion"],
        data=doc,
        created_by=user,
        updated_by=user,
    )
    rebuild_item_index(project)
    create_version(project, user)
    return project


@transaction.atomic
def save_project(project: Project, user, *, data: object, expected_revision: int) -> Project:
    """Grava o documento se `expected_revision` for a atual; senão, RevisionConflict."""
    locked = Project.objects.select_for_update().get(pk=project.pk)
    if locked.revision != expected_revision:
        raise RevisionConflict(locked)
    doc = validate_document(data)
    locked.data = doc
    locked.name = _document_name(doc)
    locked.schema_version = doc["schemaVersion"]
    locked.revision += 1
    locked.updated_by = user
    locked.save()
    rebuild_item_index(locked)
    _maybe_auto_version(locked, user)
    return locked


@transaction.atomic
def restore_version(
    project: Project, user, *, version: ProjectVersion, expected_revision: int
) -> Project:
    """Guarda o estado atual como versão e grava o documento da versão escolhida como nova revisão.

    Versões de formato antigo são devolvidas como estão; o editor as converte ao abrir e o
    próximo save grava no formato atual. Por isso a validação aqui só confere o formato atual.
    """
    locked = Project.objects.select_for_update().get(pk=project.pk)
    if locked.revision != expected_revision:
        raise RevisionConflict(locked)
    create_version(
        locked, user, label=f"Antes de restaurar a revisão {version.revision}", kind="restore"
    )
    if version.schema_version == locked.schema_version:
        validate_document(version.data)
    locked.data = version.data
    locked.name = _document_name(version.data)
    locked.schema_version = version.schema_version
    locked.revision += 1
    locked.updated_by = user
    locked.save()
    rebuild_item_index(locked)
    return locked


@transaction.atomic
def duplicate_project(project: Project, user) -> Project:
    data = dict(project.data)
    data["name"] = f"{_document_name(project.data)} (cópia)"[:200]
    copy = Project.objects.create(
        organization=project.organization,
        name=data["name"],
        client_name=project.client_name,
        status=Project.Status.DRAFT,
        schema_version=project.schema_version,
        data=data,
        created_by=user,
        updated_by=user,
    )
    rebuild_item_index(copy)
    create_version(copy, user)
    return copy
