from unittest.mock import MagicMock, patch
from urllib.parse import urlparse

import pytest
from botocore.exceptions import ClientError

from apps.assets.models import Asset
from tests.conftest import client_for

pytestmark = pytest.mark.django_db

PNG = {"filename": "Planta baixa (1).png", "content_type": "image/png", "size": 1234}


def presign(client, **over):
    return client.post("/api/assets/presign/", {**PNG, **over}, format="json")


def test_presign_reserva_arquivo_e_assina_para_o_proprio_site(client_a, org_a):
    r = presign(client_a)
    assert r.status_code == 201, r.data
    asset = Asset.objects.get(pk=r.data["asset"]["id"])
    assert asset.organization == org_a
    assert asset.status == "pending"
    assert asset.key.startswith(f"orgs/{org_a.pk}/assets/{asset.pk}/")
    assert asset.key.endswith("/Planta-baixa-1-.png")
    url = urlparse(r.data["upload_url"])
    # same-origin: o navegador envia para o próprio site (o Vite repassa ao S3 em dev)
    assert url.netloc == "testserver"
    assert url.path == f"/prancheta/{asset.key}"
    assert "X-Amz-Signature" in url.query
    assert r.data["method"] == "PUT"
    assert r.data["headers"] == {"Content-Type": "image/png"}
    assert r.data["asset"]["url"] is None


def test_presign_valida_tipo_e_tamanho(client_a):
    assert presign(client_a, content_type="application/zip").status_code == 400
    assert presign(client_a, size=26 * 1024 * 1024).status_code == 400
    assert Asset.objects.count() == 0


HEAD = "apps.assets.services.head_object"


def _ok_head(size):
    return MagicMock(return_value={"ContentLength": size})


def test_completar_confere_no_s3(client_a):
    aid = presign(client_a).data["asset"]["id"]
    missing = MagicMock(side_effect=ClientError({"Error": {"Code": "404"}}, "HeadObject"))
    with patch(HEAD, missing):
        assert client_a.post(f"/api/assets/{aid}/complete/").status_code == 400
    with patch(HEAD, _ok_head(999)):
        assert client_a.post(f"/api/assets/{aid}/complete/").status_code == 400
    with patch(HEAD, _ok_head(1234)):
        r = client_a.post(f"/api/assets/{aid}/complete/")
    assert r.status_code == 200
    assert r.data["status"] == "ready"
    assert "X-Amz-Signature" in r.data["url"]
    r = client_a.get(f"/api/assets/{aid}/")
    assert r.status_code == 200 and r.data["url"]


def test_arquivo_de_outro_escritorio_404(client_a, client_b):
    aid = presign(client_a).data["asset"]["id"]
    assert client_b.get(f"/api/assets/{aid}/").status_code == 404
    with patch(HEAD, _ok_head(1234)):
        assert client_b.post(f"/api/assets/{aid}/complete/").status_code == 404
    assert Asset.objects.get(pk=aid).status == "pending"


def test_leitor_nao_envia(viewer_a):
    assert presign(client_for(viewer_a)).status_code == 403
