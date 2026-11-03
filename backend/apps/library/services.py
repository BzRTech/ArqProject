"""Regras dos bancos: criar/alterar entradas do escritório, personalizar uma global, seed."""

from django.db import transaction

from .models import LibraryEntry
from .validation import entry_errors


class InvalidEntry(Exception):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


class EntryConflict(Exception):
    pass


def validate_front(kind: str, data: object) -> dict:
    errors = entry_errors(kind, data)
    if errors:
        raise InvalidEntry(errors)
    assert isinstance(data, dict)
    return data


def _global_twin(model: type[LibraryEntry], slug: str) -> LibraryEntry | None:
    return model.objects.filter(organization__isnull=True, slug=slug).first()


@transaction.atomic
def create_org_entry(
    model: type[LibraryEntry], organization, user, data: dict, *, is_active: bool = True
) -> LibraryEntry:
    """Entrada nova no banco do escritório. Mesmo `id` de uma global = sobrescrita: a versão
    começa acima da global (o projeto que usava a global vê "versão nova no banco")."""
    data = validate_front(model.KIND, {**data, "version": data.get("version", 1)})
    if model.objects.filter(organization=organization, slug=data["id"]).exists():
        raise EntryConflict(f"Já existe “{data['id']}” no banco do escritório.")
    twin = _global_twin(model, data["id"])
    row = model(organization=organization, created_by=user, is_active=is_active)
    row.set_front(data)
    row.version = twin.version + 1 if twin else 1
    row.save()
    return row


@transaction.atomic
def update_org_entry(
    row: LibraryEntry, data: dict, *, is_active: bool | None = None
) -> LibraryEntry:
    """Altera a entrada do escritório; a versão sobe se algo mudou. O `id` não muda."""
    data = validate_front(type(row).KIND, {**data, "id": row.slug, "version": row.version})
    before = (row.to_front(), row.is_active)
    row.set_front(data)
    if is_active is not None:
        row.is_active = is_active
    if (row.to_front(), row.is_active) != before:
        row.version += 1
        row.save()
    return row


def override_global(row: LibraryEntry, organization, user) -> LibraryEntry:
    """Personalizar: copia a entrada global para o banco do escritório (mesmo id)."""
    if not row.is_global:
        raise EntryConflict("Só entradas globais podem ser personalizadas.")
    return create_org_entry(type(row), organization, user, row.to_front())


@transaction.atomic
def seed_global(model: type[LibraryEntry], entries: list[dict]) -> dict[str, int]:
    """Carrega o seed global (idempotente): cria o que falta; atualiza o que mudou (versão +1)."""
    stats = {"criados": 0, "atualizados": 0, "iguais": 0}
    for raw in entries:
        data = validate_front(model.KIND, raw)
        row = _global_twin(model, data["id"])
        if row is None:
            row = model(organization=None)
            row.set_front(data)
            row.version = data["version"]
            row.save()
            stats["criados"] += 1
            continue
        before = row.to_front()
        row.set_front(data)
        if row.to_front() | {"version": 0} != before | {"version": 0}:
            row.version = max(row.version + 1, data["version"])
            row.save()
            stats["atualizados"] += 1
        else:
            stats["iguais"] += 1
    return stats
