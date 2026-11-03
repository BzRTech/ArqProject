import pytest

from apps.assets.models import Asset
from tests.conftest import client_for

pytestmark = pytest.mark.django_db
URL = "/api/orgs/current/"


def asset(org, **over):
    data = dict(
        organization=org,
        key=f"orgs/{org.pk}/logo-{Asset.objects.count()}.png",
        filename="logo.png",
        content_type="image/png",
        size_bytes=10,
        status="ready",
    )
    return Asset.objects.create(**{**data, **over})


def test_minha_marca_dono_altera(client_a, org_a):
    logo = asset(org_a)
    r = client_a.patch(
        URL,
        {
            "brand_color": "#a65f45",
            "phone": "(11) 99999-0000",
            "email": "oi@estudio.com",
            "website": "estudio.com",
            "registration": "CAU A12345-6",
            "logo": str(logo.pk),
        },
        format="json",
    )
    assert r.status_code == 200, r.data
    assert r.data["registration"] == "CAU A12345-6"
    assert r.data["logo"] == logo.pk
    assert "X-Amz-Signature" in r.data["logo_url"]
    assert client_a.patch(URL, {"brand_color": "vermelho"}, format="json").status_code == 400
    r = client_a.patch(URL, {"logo": None}, format="json")
    assert r.data["logo"] is None and r.data["logo_url"] is None


def test_logo_precisa_ser_imagem_pronta_do_proprio_escritorio(client_a, org_a, org_b):
    for bad in [
        asset(org_b),
        asset(org_a, status="pending"),
        asset(org_a, content_type="application/pdf"),
    ]:
        r = client_a.patch(URL, {"logo": str(bad.pk)}, format="json")
        assert r.status_code == 400, bad


def test_leitor_e_outro_escritorio(viewer_a, client_b, org_a):
    v = client_for(viewer_a)
    assert v.get(URL).data["name"] == org_a.name
    assert v.patch(URL, {"phone": "1"}, format="json").status_code == 403
    # Cada um só vê/altera o próprio escritório
    client_b.patch(URL, {"phone": "999"}, format="json")
    org_a.refresh_from_db()
    assert org_a.phone == ""
