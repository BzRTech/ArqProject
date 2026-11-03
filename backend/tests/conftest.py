import copy
import json
from pathlib import Path

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Membership
from apps.projects.validation import current_schema_version
from tests.factories import MembershipFactory, OrganizationFactory, UserFactory


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


def client_for(user) -> APIClient:
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def org_a():
    return OrganizationFactory(name="Escritório A")


@pytest.fixture
def org_b():
    return OrganizationFactory(name="Escritório B")


@pytest.fixture
def owner_a(org_a):
    return MembershipFactory(organization=org_a, role=Membership.Role.OWNER).user


@pytest.fixture
def owner_b(org_b):
    return MembershipFactory(organization=org_b, role=Membership.Role.OWNER).user


@pytest.fixture
def viewer_a(org_a):
    return MembershipFactory(organization=org_a, role=Membership.Role.VIEWER).user


@pytest.fixture
def client_a(owner_a) -> APIClient:
    return client_for(owner_a)


@pytest.fixture
def client_b(owner_b) -> APIClient:
    return client_for(owner_b)


@pytest.fixture
def lonely_user():
    """Usuário sem escritório."""
    return UserFactory()


ITEM = {
    "id": "i1",
    "blockId": "sofa",
    "blockVersion": 1,
    "name": "Sofá 3 lugares",
    "position": {"x": 1000, "y": 800},
    "rotationDeg": 0,
    "mirrored": False,
    "sizeMm": {"w": 2100, "d": 900},
    "qty": 1,
    "unit": "un",
    "showMarker": True,
    "inLegend": True,
    "existing": False,
    "approved": True,
    "unitPriceCents": 459900,
    "supplier": "Loja X",
}


SEED = Path(__file__).resolve().parent.parent / "library_seed"


def seed_entry(kind: str, slug: str) -> dict:
    return next(e for e in json.loads((SEED / f"{kind}.json").read_text()) if e["id"] == slug)


def make_document(name: str = "Casa Silva", items: list | None = None) -> dict:
    return {
        "librarySnapshots": {
            "blocks": {"sofa@1": seed_entry("items", "sofa")},
            "rules": seed_entry("rules", "padrao"),
            "sheetTemplate": seed_entry("sheet-templates", "a3-paisagem"),
        },
        "schemaVersion": current_schema_version(),
        "name": name,
        "environments": [
            {
                "id": "e1",
                "name": "Sala",
                "ceilingHeightMm": 2700,
                "basePlan": None,
                "drawings": [],
                "openings": [],
                "items": copy.deepcopy(items if items is not None else [ITEM]),
            }
        ],
    }


@pytest.fixture
def document() -> dict:
    return make_document()


def make_report(doc: dict | None = None) -> dict:
    """Relatório do memorial como o editor envia (uma linha por marcador + piso)."""
    return {
        "version": 1,
        "totalCents": 1379700,
        "environments": [
            {
                "id": "e1",
                "name": "Sala",
                "totalCents": 1379700,
                "lines": [
                    {
                        "label": "1",
                        "discipline": "layout",
                        "name": "Sofá 3 lugares",
                        "qty": 2,
                        "unit": "un",
                        "sizeMm": {"w": 2100, "d": 900},
                        "supplier": "Loja X",
                        "brandModel": "Modelo Lina",
                        "unitPriceCents": 459900,
                        "totalCents": 919800,
                        "existing": False,
                        "approved": True,
                        "itemIds": ["i1", "i2"],
                    },
                    {
                        "label": "M01",
                        "discipline": "marcenaria",
                        "name": "Rack",
                        "detail": "Frentes: Freijó (veio vertical) · Corpo: Branco",
                        "qty": 1,
                        "unit": "un",
                        "sizeMm": {"w": 1800, "d": 450, "h": 400},
                        "unitPriceCents": 459900,
                        "totalCents": 459900,
                        "existing": False,
                        "approved": False,
                        "itemIds": ["i3"],
                    },
                    {
                        "label": "P1",
                        "discipline": "revestimentos",
                        "name": "Porcelanato 90x90",
                        "detail": "Quantidade já com a perda.",
                        "qty": 18.5,
                        "unit": "m²",
                        "totalCents": 0,
                        "existing": False,
                        "approved": False,
                        "itemIds": [],
                    },
                ],
            }
        ],
    }
