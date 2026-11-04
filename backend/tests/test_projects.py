from datetime import timedelta

import pytest
from django.utils import timezone

from apps.projects.models import Project, ProjectItemIndex, ProjectVersion
from tests.conftest import ITEM, client_for, make_document

pytestmark = pytest.mark.django_db

URL = "/api/projects/"


def create(client, doc=None, **extra):
    r = client.post(URL, {"data": doc or make_document(), **extra}, format="json")
    assert r.status_code == 201, r.data
    return r.data


def put(client, project_id, doc, revision):
    headers = {} if revision is None else {"HTTP_IF_MATCH": f'"{revision}"'}
    return client.put(f"{URL}{project_id}/", {"data": doc}, format="json", **headers)


# --- criar, listar, abrir -----------------------------------------------------------------


def test_criar_e_abrir(client_a, document):
    p = create(client_a, document, client_name="Família Silva")
    assert p["name"] == "Casa Silva"
    assert p["revision"] == 1
    assert p["status"] == "draft"
    r = client_a.get(f"{URL}{p['id']}/")
    assert r.status_code == 200
    assert r["ETag"] == '"1"'
    assert r.data["data"] == document
    assert r.data["client_name"] == "Família Silva"


def test_lista_sem_documento_com_contagem_de_ambientes(client_a):
    create(client_a)
    r = client_a.get(URL)
    assert r.status_code == 200
    assert len(r.data) == 1
    assert "data" not in r.data[0]
    assert r.data[0]["environment_count"] == 1


def test_busca_e_filtro_de_situacao(client_a):
    a = create(client_a, make_document("Apto Centro"), client_name="Maria")
    b = create(client_a, make_document("Casa Praia"))
    client_a.patch(f"{URL}{b['id']}/", {"status": "archived"}, format="json")
    names = lambda r: sorted(x["name"] for x in r.data)  # noqa: E731
    assert names(client_a.get(URL)) == ["Apto Centro"]  # arquivados saem da lista padrão
    assert names(client_a.get(URL, {"status": "all"})) == ["Apto Centro", "Casa Praia"]
    assert names(client_a.get(URL, {"status": "archived"})) == ["Casa Praia"]
    assert names(client_a.get(URL, {"search": "maria"})) == ["Apto Centro"]
    assert names(client_a.get(URL, {"search": "praia"})) == ["Casa Praia"]
    assert a["id"]


def test_documento_invalido_e_recusado(client_a, document):
    bad = make_document()
    bad["environments"][0]["ceilingHeightMm"] = -5
    r = client_a.post(URL, {"data": bad}, format="json")
    assert r.status_code == 400
    assert any("ceilingHeightMm" in m for m in r.data["data"])
    r = client_a.post(URL, {"data": {"name": "x"}}, format="json")
    assert r.status_code == 400
    assert Project.objects.count() == 0


def test_formato_antigo_pede_para_atualizar(client_a, document):
    old = {**document, "schemaVersion": 3}
    r = client_a.post(URL, {"data": old}, format="json")
    assert r.status_code == 400
    assert "v3" in r.data["data"][0]


# --- salvar com If-Match ------------------------------------------------------------------


def test_salvar_com_if_match_incrementa_revisao(client_a, document):
    p = create(client_a, document)
    document["name"] = "Casa Silva — revisão"
    r = put(client_a, p["id"], document, 1)
    assert r.status_code == 200, r.data
    assert r.data["revision"] == 2
    assert r["ETag"] == '"2"'
    assert Project.objects.get(pk=p["id"]).name == "Casa Silva — revisão"


def test_salvar_sem_if_match_428(client_a, document):
    p = create(client_a, document)
    assert put(client_a, p["id"], document, None).status_code == 428


def test_conflito_409_quando_outra_aba_salvou_antes(client_a, owner_a, document):
    p = create(client_a, document)
    other_tab = client_for(owner_a)
    assert put(other_tab, p["id"], make_document("Outra aba"), 1).status_code == 200
    r = put(client_a, p["id"], make_document("Minha aba"), 1)
    assert r.status_code == 409
    assert r.data["revision"] == 2
    assert r.data["updated_by_name"] == owner_a.email
    assert Project.objects.get(pk=p["id"]).name == "Outra aba"
    # Sobrescrever conscientemente = salvar com a revisão atual
    assert put(client_a, p["id"], make_document("Minha aba"), 2).status_code == 200


def test_salvar_invalido_nao_muda_revisao(client_a, document):
    p = create(client_a, document)
    bad = make_document()
    bad["environments"] = []
    r = put(client_a, p["id"], bad, 1)
    assert r.status_code == 400
    assert Project.objects.get(pk=p["id"]).revision == 1


def test_patch_de_dados_do_cartao_nao_mexe_na_revisao(client_a):
    p = create(client_a)
    r = client_a.patch(
        f"{URL}{p['id']}/", {"client_name": "João", "status": "review"}, format="json"
    )
    assert r.status_code == 200
    assert r.data["client_name"] == "João" and r.data["status"] == "review"
    assert r.data["revision"] == 1


# --- índice de itens ----------------------------------------------------------------------


def test_indice_de_itens_refeito_a_cada_save(client_a):
    p = create(client_a)
    row = ProjectItemIndex.objects.get(project_id=p["id"])
    assert row.name == "Sofá 3 lugares"
    assert row.environment_name == "Sala"
    assert row.unit_price_cents == 459900
    assert row.size_w_mm == 2100 and row.size_h_mm is None
    assert row.approved and not row.has_joinery
    two = [ITEM, {**ITEM, "id": "i2", "name": "Rack", "qty": 2, "unitPriceCents": None}]
    two[1].pop("unitPriceCents")
    assert put(client_a, p["id"], make_document(items=two), 1).status_code == 200
    rows = ProjectItemIndex.objects.filter(project_id=p["id"]).order_by("item_id")
    assert [(r.item_id, r.name, int(r.qty)) for r in rows] == [
        ("i1", "Sofá 3 lugares", 1),
        ("i2", "Rack", 2),
    ]


# --- versões ------------------------------------------------------------------------------


def test_versoes_automaticas_espacadas(client_a, document):
    p = create(client_a, document)
    assert ProjectVersion.objects.filter(project_id=p["id"]).count() == 1
    put(client_a, p["id"], document, 1)
    put(client_a, p["id"], document, 2)
    # Autosave seguido não cria uma versão por save
    assert ProjectVersion.objects.filter(project_id=p["id"]).count() == 1
    ProjectVersion.objects.filter(project_id=p["id"]).update(
        created_at=timezone.now() - timedelta(minutes=11)
    )
    put(client_a, p["id"], document, 3)
    revs = list(
        ProjectVersion.objects.filter(project_id=p["id"]).values_list("revision", flat=True)
    )
    assert revs == [4, 1]


def test_salvar_versao_com_nome_e_restaurar(client_a):
    p = create(client_a, make_document("Estudo A"))
    r = client_a.post(f"{URL}{p['id']}/versions/", {"label": "Enviado ao cliente"}, format="json")
    assert r.status_code == 201 and r.data["kind"] == "manual"
    version_id = r.data["id"]
    put(client_a, p["id"], make_document("Estudo B"), 1)
    lst = client_a.get(f"{URL}{p['id']}/versions/").data
    assert lst[0]["label"] == "Enviado ao cliente"
    url = f"{URL}{p['id']}/versions/{version_id}/restore/"
    assert client_a.post(url).status_code == 428
    assert client_a.post(url, HTTP_IF_MATCH='"1"').status_code == 409
    r = client_a.post(url, HTTP_IF_MATCH='"2"')
    assert r.status_code == 200
    assert r.data["revision"] == 3
    assert r.data["data"]["name"] == "Estudo A"
    # O estado anterior virou versão "antes de restaurar"
    kinds = [v["kind"] for v in client_a.get(f"{URL}{p['id']}/versions/").data]
    assert "restore" in kinds


def test_duplicar(client_a):
    p = create(client_a, client_name="Maria")
    r = client_a.post(f"{URL}{p['id']}/duplicate/")
    assert r.status_code == 201
    assert r.data["name"] == "Casa Silva (cópia)"
    assert r.data["client_name"] == "Maria"
    assert r.data["revision"] == 1
    copy = Project.objects.get(pk=r.data["id"])
    assert copy.data["environments"] == Project.objects.get(pk=p["id"]).data["environments"]
    assert ProjectItemIndex.objects.filter(project=copy).count() == 1


def test_excluir(client_a):
    p = create(client_a)
    assert client_a.delete(f"{URL}{p['id']}/").status_code == 204
    assert not Project.objects.filter(pk=p["id"]).exists()


# --- permissões ---------------------------------------------------------------------------


def test_escritorio_nao_ve_projeto_do_outro(client_a, client_b, document):
    p = create(client_a, document)
    pid = p["id"]
    assert client_b.get(URL).data == []
    assert client_b.get(f"{URL}{pid}/").status_code == 404
    assert put(client_b, pid, document, 1).status_code == 404
    assert client_b.patch(f"{URL}{pid}/", {"status": "archived"}, format="json").status_code == 404
    assert client_b.post(f"{URL}{pid}/duplicate/").status_code == 404
    assert client_b.get(f"{URL}{pid}/versions/").status_code == 404
    assert client_b.post(f"{URL}{pid}/versions/", {"label": "x"}, format="json").status_code == 404
    vid = ProjectVersion.objects.get(project_id=pid).pk
    restore = f"{URL}{pid}/versions/{vid}/restore/"
    assert client_b.post(restore, HTTP_IF_MATCH='"1"').status_code == 404
    assert client_b.delete(f"{URL}{pid}/").status_code == 404
    assert Project.objects.get(pk=pid).revision == 1


def test_versao_de_outro_projeto_nao_restaura(client_a, client_b):
    a = create(client_a)
    b = create(client_b)
    vb = ProjectVersion.objects.get(project_id=b["id"]).pk
    r = client_a.post(f"{URL}{a['id']}/versions/{vb}/restore/", HTTP_IF_MATCH='"1"')
    assert r.status_code == 404


def test_leitor_ve_mas_nao_altera(client_a, viewer_a, document):
    p = create(client_a, document)
    v = client_for(viewer_a)
    assert v.get(URL).status_code == 200
    assert v.get(f"{URL}{p['id']}/").status_code == 200
    assert v.post(URL, {"data": document}, format="json").status_code == 403
    assert put(v, p["id"], document, 1).status_code == 403
    assert v.delete(f"{URL}{p['id']}/").status_code == 403
    assert v.post(f"{URL}{p['id']}/duplicate/").status_code == 403


def test_anonimo_nao_acessa(api_client):
    assert api_client.get(URL).status_code == 403
