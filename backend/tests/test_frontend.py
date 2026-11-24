import pytest


@pytest.mark.parametrize("route", ["/", "/entrar", "/editor", "/projetos", "/projetos/" + "a" * 36])
def test_frontend_deep_links(client, settings, tmp_path, route):
    settings.FRONTEND_DIST = tmp_path
    (tmp_path / "index.html").write_text('<div id="root">SPA</div>')
    response = client.get(route)
    assert response.status_code == 200
    assert b"SPA" in b"".join(response.streaming_content)
    assert "no-store" in response["Cache-Control"]


@pytest.mark.parametrize(
    "route", ["/api/inexistente/", "/assets/missing.js", "/static/missing.css"]
)
def test_unknown_resources_are_not_spa(client, settings, tmp_path, route):
    settings.FRONTEND_DIST = tmp_path
    (tmp_path / "index.html").write_text("SPA")
    assert client.get(route).status_code == 404


def test_missing_build_is_404(client, settings, tmp_path):
    settings.FRONTEND_DIST = tmp_path
    assert client.get("/editor").status_code == 404


def test_frontend_rejects_posts(client):
    assert client.post("/editor").status_code == 405
