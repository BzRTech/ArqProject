import json
from pathlib import Path

import pytest
from django.core.management import call_command

from apps.library.models import LIBRARY_MODELS, CatalogItem, Material, RuleProfile
from apps.library.selectors import bundle, merged
from apps.library.services import seed_global
from tests.conftest import client_for

pytestmark = pytest.mark.django_db

SEED = Path(__file__).resolve().parent.parent / "library_seed"
URL = "/api/library/"


@pytest.fixture
def seeded():
    call_command("seed_library", verbosity=0)


def seed_entry(kind: str, slug: str) -> dict:
    return next(e for e in json.loads((SEED / f"{kind}.json").read_text()) if e["id"] == slug)


def mdf(slug="nogueira-escritorio", **over):
    return {
        "id": slug,
        "version": 1,
        "name": "Nogueira do escritório",
        "kind": "madeirado",
        "hex": "#6b4a32",
        **over,
    }


# --- seed --------------------------------------------------------------------------------


def test_seed_carrega_tudo_e_e_idempotente(seeded):
    assert CatalogItem.objects.filter(organization__isnull=True).count() >= 30
    assert Material.objects.filter(organization__isnull=True).count() >= 20
    assert RuleProfile.objects.get(slug="padrao").to_front() == seed_entry("rules", "padrao")
    # Formato do front sai igual ao do seed (ida e volta pelos campos do banco)
    for kind, model in LIBRARY_MODELS.items():
        for e in json.loads((SEED / f"{kind}.json").read_text()):
            assert model.objects.get(organization__isnull=True, slug=e["id"]).to_front() == e
    before = {k: m.objects.count() for k, m in LIBRARY_MODELS.items()}
    call_command("seed_library", verbosity=0)
    assert {k: m.objects.count() for k, m in LIBRARY_MODELS.items()} == before
    assert CatalogItem.objects.get(slug="sofa").version == 1


def test_seed_com_mudanca_sobe_a_versao(seeded):
    sofa = {**seed_entry("items", "sofa"), "name": "Sofá (novo desenho)"}
    stats = seed_global(CatalogItem, [sofa])
    assert stats == {"criados": 0, "atualizados": 1, "iguais": 0}
    row = CatalogItem.objects.get(slug="sofa")
    assert (row.name, row.version) == ("Sofá (novo desenho)", 2)


# --- bundle ------------------------------------------------------------------------------


def test_bundle_com_etag_e_304(seeded, client_a):
    r = client_a.get(f"{URL}bundle/")
    assert r.status_code == 200
    etag = r["ETag"]
    assert r.data["etag"] == etag
    assert set(r.data["kinds"]) == set(LIBRARY_MODELS)
    assert any(e["id"] == "sofa" for e in r.data["kinds"]["items"])
    assert client_a.get(f"{URL}bundle/", HTTP_IF_NONE_MATCH=etag).status_code == 304
    # Mudou o banco do escritório → ETag novo
    client_a.post(f"{URL}materials/", {"entry": mdf()}, format="json")
    r2 = client_a.get(f"{URL}bundle/", HTTP_IF_NONE_MATCH=etag)
    assert r2.status_code == 200 and r2["ETag"] != etag


def test_bundle_mostra_so_o_banco_do_proprio_escritorio(seeded, client_a, client_b):
    client_a.post(f"{URL}materials/", {"entry": mdf()}, format="json")
    ids_a = {e["id"] for e in client_a.get(f"{URL}bundle/").data["kinds"]["materials"]}
    ids_b = {e["id"] for e in client_b.get(f"{URL}bundle/").data["kinds"]["materials"]}
    assert "nogueira-escritorio" in ids_a
    assert "nogueira-escritorio" not in ids_b
    assert "branco" in ids_a and "branco" in ids_b
    assert client_a.get(f"{URL}bundle/")["ETag"] != client_b.get(f"{URL}bundle/")["ETag"]


# --- escritório: criar, personalizar, editar, excluir --------------------------------------


def test_criar_entrada_do_escritorio_valida_formato(client_a, org_a):
    r = client_a.post(f"{URL}materials/", {"entry": mdf(hex="vermelho")}, format="json")
    assert r.status_code == 400
    assert any("hex" in m for m in r.data["entry"])
    r = client_a.post(f"{URL}materials/", {"entry": mdf()}, format="json")
    assert r.status_code == 201, r.data
    assert r.data["scope"] == "org" and r.data["entry"]["version"] == 1
    assert Material.objects.get(slug="nogueira-escritorio").organization == org_a
    again = client_a.post(f"{URL}materials/", {"entry": mdf()}, format="json")
    assert again.status_code == 400


def test_personalizar_global_vale_no_lugar_dela_e_versao_acima(seeded, client_a, org_a, org_b):
    sofa = CatalogItem.objects.get(organization__isnull=True, slug="sofa")
    r = client_a.post(f"{URL}items/{sofa.pk}/override/")
    assert r.status_code == 201
    assert r.data["overrides"] is True
    assert r.data["entry"]["version"] == sofa.version + 1
    pk = r.data["pk"]
    entry = {**r.data["entry"], "name": "Sofá do escritório"}
    r = client_a.put(f"{URL}items/{pk}/", {"entry": entry}, format="json")
    assert r.status_code == 200 and r.data["entry"]["version"] == sofa.version + 2
    # Salvar igual não sobe a versão
    r = client_a.put(f"{URL}items/{pk}/", {"entry": r.data["entry"]}, format="json")
    assert r.data["entry"]["version"] == sofa.version + 2
    # No bundle do escritório A vale a dele; no B, a global
    names_a = {e["id"]: e["name"] for e in bundle(org_a)["items"]}
    names_b = {e["id"]: e["name"] for e in bundle(org_b)["items"]}
    assert names_a["sofa"] == "Sofá do escritório"
    assert names_b["sofa"] == sofa.name
    # Lista marca a global como personalizada
    rows = client_a.get(f"{URL}items/", {"search": "sofa"}).data
    g = next(x for x in rows if x["scope"] == "global" and x["entry"]["id"] == "sofa")
    assert g["overridden"] is True
    # Excluir a personalização volta à global
    assert client_a.delete(f"{URL}items/{pk}/").status_code == 204
    assert {e["id"]: e["name"] for e in bundle(org_a)["items"]}["sofa"] == sofa.name


def test_desativar_no_escritorio_esconde_a_global(seeded, client_a, org_a):
    branco = Material.objects.get(organization__isnull=True, slug="branco")
    pk = client_a.post(f"{URL}materials/{branco.pk}/override/").data["pk"]
    r = client_a.put(
        f"{URL}materials/{pk}/", {"entry": branco.to_front(), "is_active": False}, format="json"
    )
    assert r.status_code == 200 and r.data["is_active"] is False
    assert "branco" not in {m.slug for m in merged(Material, org_a)}


def test_global_nao_se_edita_pela_api(seeded, client_a):
    sofa = CatalogItem.objects.get(organization__isnull=True, slug="sofa")
    entry = {**sofa.to_front(), "name": "x"}
    assert (
        client_a.put(f"{URL}items/{sofa.pk}/", {"entry": entry}, format="json").status_code == 403
    )
    assert client_a.delete(f"{URL}items/{sofa.pk}/").status_code == 403
    assert CatalogItem.objects.get(pk=sofa.pk).name == sofa.name


def test_escritorio_nao_ve_nem_altera_banco_do_outro(seeded, client_a, client_b):
    pk = client_a.post(f"{URL}materials/", {"entry": mdf()}, format="json").data["pk"]
    assert all(
        r["entry"]["id"] != "nogueira-escritorio" for r in client_b.get(f"{URL}materials/").data
    )
    assert client_b.get(f"{URL}materials/{pk}/").status_code == 404
    assert client_b.put(f"{URL}materials/{pk}/", {"entry": mdf()}, format="json").status_code == 404
    assert client_b.delete(f"{URL}materials/{pk}/").status_code == 404
    assert client_b.post(f"{URL}materials/{pk}/override/").status_code == 404
    assert Material.objects.filter(pk=pk).exists()


def test_leitor_ve_mas_nao_altera(seeded, viewer_a):
    v = client_for(viewer_a)
    assert v.get(f"{URL}bundle/").status_code == 200
    assert v.get(f"{URL}items/").status_code == 200
    assert v.post(f"{URL}materials/", {"entry": mdf()}, format="json").status_code == 403
    sofa = CatalogItem.objects.get(slug="sofa")
    assert v.post(f"{URL}items/{sofa.pk}/override/").status_code == 403


def test_anonimo_e_banco_desconhecido(api_client, client_a):
    assert api_client.get(f"{URL}bundle/").status_code == 403
    assert client_a.get(f"{URL}nada/").status_code == 404


def test_filtro_de_escopo(seeded, client_a):
    client_a.post(f"{URL}materials/", {"entry": mdf()}, format="json")
    org_rows = client_a.get(f"{URL}materials/", {"scope": "org"}).data
    assert [r["entry"]["id"] for r in org_rows] == ["nogueira-escritorio"]
    global_rows = client_a.get(f"{URL}materials/", {"scope": "global"}).data
    assert all(r["scope"] == "global" for r in global_rows) and len(global_rows) >= 20
