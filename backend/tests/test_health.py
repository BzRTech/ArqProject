import pytest


@pytest.mark.django_db
def test_health_ok_sem_autenticacao(api_client):
    response = api_client.get("/api/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


@pytest.mark.django_db
def test_schema_openapi_disponivel(api_client):
    response = api_client.get("/api/schema/", HTTP_ACCEPT="application/vnd.oai.openapi+json")
    assert response.status_code == 200
    assert "/api/health/" in response.json()["paths"]
