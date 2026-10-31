from django.db import connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@extend_schema(
    responses=inline_serializer(
        name="Health",
        fields={"status": serializers.CharField(), "database": serializers.CharField()},
    ),
    tags=["infra"],
)
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request: Request) -> Response:
    """Verifica se a API e o banco de dados estão respondendo."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        database = "ok"
    except Exception:  # pragma: no cover - depende de falha real do banco
        database = "error"
    status_code = 200 if database == "ok" else 503
    return Response(
        {"status": "ok" if database == "ok" else "degraded", "database": database},
        status=status_code,
    )
