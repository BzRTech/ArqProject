import io
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from apps.assets.models import Asset
from apps.exports.services import brl, memorial_context
from apps.projects.models import Project, ProjectItemIndex
from tests.conftest import client_for, make_document, make_report

pytestmark = pytest.mark.django_db
URL = "/api/projects/"


def create_with_report(client):
    r = client.post(URL, {"data": make_document(), "report": make_report()}, format="json")
    assert r.status_code == 201, r.data
    return r.data


def pdf_text(content: bytes) -> str:
    """Texto do PDF (pdftotext, do poppler)."""
    out = subprocess.run(
        ["pdftotext", "-layout", "-", "-"], input=content, capture_output=True, check=True
    )
    return out.stdout.decode()


def test_brl():
    assert brl(0) == "R$ 0,00"
    assert brl(459900) == "R$ 4.599,00"
    assert brl(123456789) == "R$ 1.234.567,89"


def test_relatorio_no_save_vira_indice_com_marcador(client_a):
    p = create_with_report(client_a)
    rows = list(ProjectItemIndex.objects.filter(project_id=p["id"]).order_by("pk"))
    assert [(r.marker_no, r.discipline, r.name) for r in rows] == [
        ("1", "layout", "Sofá 3 lugares"),
        ("M01", "marcenaria", "Rack"),
        ("P1", "revestimentos", "Porcelanato 90x90"),
    ]
    assert rows[0].qty == 2 and rows[2].unit == "m²"
    assert p["has_report"] is True
    # Save sem relatório: o antigo sai (ficaria desatualizado) e volta o índice por item
    r = client_a.put(
        f"{URL}{p['id']}/", {"data": make_document()}, format="json", HTTP_IF_MATCH='"1"'
    )
    assert r.status_code == 200 and r.data["has_report"] is False
    assert ProjectItemIndex.objects.filter(project_id=p["id"]).count() == 1


def test_relatorio_invalido_recusado(client_a):
    bad = make_report()
    bad["environments"][0]["lines"][0]["totalCents"] = -1
    r = client_a.post(URL, {"data": make_document(), "report": bad}, format="json")
    assert r.status_code == 400
    assert any(m.startswith("relatório:") for m in r.data["data"])


def test_memorial_pdf_com_itens_totais_e_marca(client_a, org_a):
    org_a.phone = "(11) 99999-0000"
    org_a.registration = "CAU A12345-6"
    org_a.brand_color = "#a65f45"
    org_a.save()
    p = create_with_report(client_a)
    r = client_a.get(f"{URL}{p['id']}/memorial.pdf")
    assert r.status_code == 200
    assert r["Content-Type"] == "application/pdf"
    assert 'filename="memorial-casa-silva.pdf"' in r["Content-Disposition"]
    content = r.content
    assert content.startswith(b"%PDF")
    text = pdf_text(content)
    for expected in [
        "Casa Silva",
        "Sala",
        "Mobiliário e layout",
        "Marcenaria",
        "Revestimentos",
        "Sofá 3 lugares",
        "Modelo Lina",
        "Frentes: Freijó",
        "18,5 m²",
        "R$ 9.198,00",
        "Total do ambiente R$ 13.797,00",
        "R$ 13.797,00",
        "Escritório A",
        "CAU A12345-6",
    ]:
        assert expected in text, expected


def test_memorial_com_logo_do_s3(client_a, org_a):
    logo = Asset.objects.create(
        organization=org_a,
        key="orgs/x/logo.png",
        filename="logo.png",
        content_type="image/png",
        size_bytes=10,
        status="ready",
    )
    org_a.logo = logo
    org_a.save()
    p = Project.objects.get(pk=create_with_report(client_a)["id"])
    # PNG 1x1 transparente
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
        "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
    )
    client = MagicMock()
    client.get_object.return_value = {"Body": io.BytesIO(png)}
    with patch("apps.exports.services.s3_client", return_value=client):
        ctx = memorial_context(p)
    assert ctx["logo"].startswith("data:image/png;base64,")
    # Sem S3 acessível o memorial sai sem logo, sem erro
    broken = MagicMock()
    broken.get_object.side_effect = OSError("sem rede")
    with patch("apps.exports.services.s3_client", return_value=broken):
        assert memorial_context(p)["logo"] is None


def test_memorial_vazio_explica(client_a):
    r = client_a.post(URL, {"data": make_document(items=[])}, format="json")
    pdf = client_a.get(f"{URL}{r.data['id']}/memorial.pdf")
    assert pdf.status_code == 200
    assert "Ainda não há itens" in pdf_text(pdf.content)


def test_memorial_de_outro_escritorio_404(client_a, client_b, viewer_a):
    p = create_with_report(client_a)
    assert client_b.get(f"{URL}{p['id']}/memorial.pdf").status_code == 404
    # Leitor do escritório pode baixar
    assert client_for(viewer_a).get(f"{URL}{p['id']}/memorial.pdf").status_code == 200
