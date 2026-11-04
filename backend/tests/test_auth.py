import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Membership, Organization
from tests.conftest import client_for
from tests.factories import MembershipFactory, OrganizationFactory, UserFactory

pytestmark = pytest.mark.django_db


def test_csrf_entrega_cookie(api_client):
    r = api_client.get("/api/auth/csrf/")
    assert r.status_code == 204
    assert "csrftoken" in r.cookies


def test_cadastro_cria_conta_escritorio_e_entra():
    c = APIClient()
    r = c.post(
        "/api/auth/signup/",
        {
            "name": "Ana Souza",
            "email": "Ana@Exemplo.com",
            "password": "uma-senha-boa-9",
            "organization_name": "Estúdio Ana",
        },
        format="json",
    )
    assert r.status_code == 201, r.data
    assert r.data["email"] == "ana@exemplo.com"
    assert r.data["name"] == "Ana Souza"
    assert r.data["organization"]["name"] == "Estúdio Ana"
    assert r.data["organization"]["slug"] == "estudio-ana"
    assert r.data["role"] == "owner"
    # Já está logado
    assert c.get("/api/auth/me/").status_code == 200


def test_cadastro_email_repetido_e_senha_fraca():
    UserFactory(email="ja@exemplo.com")
    c = APIClient()
    base = {"name": "X", "organization_name": "Y"}
    r = c.post(
        "/api/auth/signup/",
        {**base, "email": "JA@exemplo.com", "password": "uma-senha-boa-9"},
        format="json",
    )
    assert r.status_code == 400 and "email" in r.data
    r = c.post("/api/auth/signup/", {**base, "email": "n@e.com", "password": "123"}, format="json")
    assert r.status_code == 400


@override_settings(ALLOW_SIGNUP=False)
def test_cadastro_fechado():
    r = APIClient().post(
        "/api/auth/signup/",
        {"name": "A", "email": "a@b.com", "password": "uma-senha-boa-9", "organization_name": "Z"},
        format="json",
    )
    assert r.status_code == 403


def test_login_logout_e_me():
    m = MembershipFactory()
    c = APIClient()
    assert c.get("/api/auth/me/").status_code == 403
    bad = c.post("/api/auth/login/", {"email": m.user.email, "password": "errada"}, format="json")
    assert bad.status_code == 403
    r = c.post(
        "/api/auth/login/",
        {"email": m.user.email.upper(), "password": "senha-forte-123"},
        format="json",
    )
    assert r.status_code == 200
    assert r.data["organization"]["id"] == m.organization.id
    assert [x["organization"]["id"] for x in r.data["memberships"]] == [m.organization.id]
    assert c.post("/api/auth/logout/").status_code == 204
    assert c.get("/api/auth/me/").status_code == 403


def test_trocar_de_escritorio_so_onde_e_membro():
    m1 = MembershipFactory(organization=OrganizationFactory(name="A"))
    other = OrganizationFactory(name="B")
    MembershipFactory(user=m1.user, organization=other, role=Membership.Role.VIEWER)
    stranger = OrganizationFactory(name="C")
    c = APIClient()
    c.login(username=m1.user.email, password="senha-forte-123")
    assert c.get("/api/auth/me/").data["organization"]["name"] == "A"
    r = c.post("/api/orgs/switch/", {"organization": other.id}, format="json")
    assert r.status_code == 200 and r.data["role"] == "viewer"
    # Fica gravado na sessão
    assert c.get("/api/auth/me/").data["organization"]["name"] == "B"
    r = c.post("/api/orgs/switch/", {"organization": stranger.id}, format="json")
    assert r.status_code == 404
    assert c.get("/api/auth/me/").data["organization"]["name"] == "B"


def test_sessao_com_escritorio_que_perdeu_acesso_volta_ao_primeiro():
    m1 = MembershipFactory(organization=OrganizationFactory(name="A"))
    m2 = MembershipFactory(user=m1.user, organization=OrganizationFactory(name="B"))
    c = APIClient()
    c.login(username=m1.user.email, password="senha-forte-123")
    c.post("/api/orgs/switch/", {"organization": m2.organization.id}, format="json")
    m2.delete()
    assert c.get("/api/auth/me/").data["organization"]["name"] == "A"


def test_escritorio_atual_so_o_dono_altera(org_a, owner_a, viewer_a):
    r = client_for(owner_a).patch("/api/orgs/current/", {"name": "Novo nome"}, format="json")
    assert r.status_code == 200 and r.data["name"] == "Novo nome"
    v = client_for(viewer_a)
    assert v.get("/api/orgs/current/").status_code == 200
    assert v.patch("/api/orgs/current/", {"name": "X"}, format="json").status_code == 403
    assert Organization.objects.get(pk=org_a.pk).name == "Novo nome"


def test_usuario_sem_escritorio_nao_acessa_dados(lonely_user):
    c = client_for(lonely_user)
    assert c.get("/api/auth/me/").data["organization"] is None
    assert c.get("/api/orgs/current/").status_code == 403
    assert c.get("/api/projects/").status_code == 403
