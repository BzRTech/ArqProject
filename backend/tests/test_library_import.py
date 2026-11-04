import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from openpyxl import Workbook

from apps.library.importers import import_rows, read_rows
from apps.library.models import Material

pytestmark = pytest.mark.django_db

CSV = (
    "id;nome;tipo;cor;fabricante;espessuras_mm;chapa_comprimento_mm;chapa_largura_mm\n"
    "louro-freijo;Louro Freijó;madeirado;#a9784b;Fabricante X;15;2750;1840\n"
    "cinza-sagrado;Cinza Sagrado;liso;#9a9a95;;6,18;;\n"
    "ruim;;liso;azul;;;;\n"
)


def test_csv_importa_validas_e_lista_erros_por_linha(org_a):
    rows = read_rows("mdf.csv", CSV.encode())
    report = import_rows(Material, rows, organization=org_a)
    assert (report.created, report.updated) == (2, 0)
    assert len(report.errors) >= 1 and all(e.startswith("linha 4:") for e in report.errors)
    m = Material.objects.get(organization=org_a, slug="louro-freijo")
    assert m.to_front() == {
        "id": "louro-freijo",
        "version": 1,
        "name": "Louro Freijó",
        "kind": "madeirado",
        "hex": "#a9784b",
        "manufacturer": "Fabricante X",
        "thicknessesMm": [15],
        "sheet": {"lengthMm": 2750, "widthMm": 1840},
    }
    # Reimportar igual: nada muda; mudou o nome → versão sobe
    again = import_rows(Material, rows, organization=org_a)
    assert (again.created, again.updated, again.unchanged) == (0, 0, 2)
    changed = read_rows("mdf.csv", CSV.replace("Louro Freijó", "Louro Freijó Claro").encode())
    import_rows(Material, changed, organization=org_a)
    assert Material.objects.get(organization=org_a, slug="louro-freijo").version == 2


def test_xlsx_e_simulacao(org_a):
    wb = Workbook()
    ws = wb.active
    ws.append(["id", "nome", "tipo", "cor"])
    ws.append(["grafite-x", "Grafite X", "liso", "#4a4a48"])
    buf = io.BytesIO()
    wb.save(buf)
    rows = read_rows("mdf.xlsx", buf.getvalue())
    report = import_rows(Material, rows, organization=org_a, dry_run=True)
    assert report.created == 1
    assert not Material.objects.filter(slug="grafite-x").exists()


def test_import_pela_api_vai_para_o_escritorio(client_a, org_a, org_b):
    f = SimpleUploadedFile("mdf.csv", CSV.encode(), content_type="text/csv")
    r = client_a.post("/api/library/materials/import/", {"file": f}, format="multipart")
    assert r.status_code == 200, r.data
    assert r.data["criados"] == 2 and r.data["erros"]
    assert Material.objects.filter(organization=org_a).count() == 2
    assert Material.objects.filter(organization=org_b).count() == 0
    bad = SimpleUploadedFile("x.txt", b"a", content_type="text/plain")
    assert client_a.post("/api/library/materials/import/", {"file": bad}).status_code == 400
    assert client_a.post("/api/library/items/import/", {"file": f}).status_code == 404


def test_comando_import_library_global(tmp_path):
    p = tmp_path / "mdf.csv"
    p.write_text(CSV, encoding="utf-8")
    call_command("import_library", "--kind", "materials", str(p), verbosity=0)
    assert Material.objects.filter(organization__isnull=True, slug="louro-freijo").exists()


def test_erros_da_planilha_em_portugues(org_a):
    rows = read_rows("mdf.csv", b"id;nome;tipo;cor\nx;X;liso;azul\n;Sem id;metal;#ffffff\n")
    report = import_rows(Material, rows, organization=org_a)
    text = " | ".join(report.errors)
    assert "linha 2: hex: 'azul': cor no formato #rrggbb" in text
    assert "campo obrigatório: id" in text
    assert "use: liso, madeirado" in text
