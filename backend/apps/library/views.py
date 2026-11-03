from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import InOrganization
from apps.accounts.selectors import active_membership

from . import importers, selectors, services
from .models import LIBRARY_MODELS, LibraryEntry
from .serializers import (
    BundleSerializer,
    ImportReportSerializer,
    ImportRequestSerializer,
    LibraryRowSerializer,
    LibraryWriteSerializer,
)

KIND = OpenApiParameter(
    "kind", OpenApiTypes.STR, OpenApiParameter.PATH, enum=list(LIBRARY_MODELS), description="Banco."
)


def org_of(request: Request):
    return active_membership(request).organization


def model_or_404(kind: str) -> type[LibraryEntry]:
    model = LIBRARY_MODELS.get(kind)
    if model is None:
        raise NotFound("Banco desconhecido.")
    return model


def row_payload(row: LibraryEntry, org_slugs: set[str], global_slugs: set[str]) -> dict:
    return {
        "pk": row.pk,
        "scope": "global" if row.is_global else "org",
        "overridden": row.is_global and row.slug in org_slugs,
        "overrides": (not row.is_global) and row.slug in global_slugs,
        "is_active": row.is_active,
        "updated_at": row.updated_at,
        "entry": row.to_front(),
    }


def rows_response(model, organization, rows) -> list[dict]:
    org_slugs = set(model.objects.filter(organization=organization).values_list("slug", flat=True))
    global_slugs = set(
        model.objects.filter(organization__isnull=True).values_list("slug", flat=True)
    )
    return [row_payload(r, org_slugs, global_slugs) for r in rows]


def invalid(exc: services.InvalidEntry) -> ValidationError:
    return ValidationError({"entry": exc.errors})


class BundleView(APIView):
    """Tudo o que o editor precisa dos bancos numa chamada (global + escritório), com ETag."""

    permission_classes = [InOrganization]

    @extend_schema(responses={200: BundleSerializer, 304: None}, tags=["library"])
    def get(self, request: Request) -> Response:
        org = org_of(request)
        etag = selectors.bundle_etag(org)
        if request.headers.get("If-None-Match") == etag:
            response = Response(status=status.HTTP_304_NOT_MODIFIED)
        else:
            response = Response({"etag": etag, "kinds": selectors.bundle(org)})
        response["ETag"] = etag
        response["Cache-Control"] = "private, no-cache"
        return response


class EntryListView(APIView):
    """Linhas de um banco: globais e do escritório (para a tela "Banco do escritório")."""

    permission_classes = [InOrganization]

    @extend_schema(
        parameters=[
            KIND,
            OpenApiParameter("scope", OpenApiTypes.STR, enum=["all", "global", "org"]),
            OpenApiParameter("search", OpenApiTypes.STR),
        ],
        responses=LibraryRowSerializer(many=True),
        tags=["library"],
    )
    def get(self, request: Request, kind: str) -> Response:
        model = model_or_404(kind)
        org = org_of(request)
        scope = request.query_params.get("scope", "all")
        qs = selectors.visible_rows(model, org)
        if scope == "global":
            qs = qs.filter(organization__isnull=True)
        elif scope == "org":
            qs = qs.filter(organization=org)
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(slug__icontains=search)
        rows = list(qs.order_by(*(model._meta.ordering or ["name"]), "organization_id"))
        return Response(LibraryRowSerializer(rows_response(model, org, rows), many=True).data)

    @extend_schema(
        parameters=[KIND],
        request=LibraryWriteSerializer,
        responses={201: LibraryRowSerializer},
        tags=["library"],
    )
    def post(self, request: Request, kind: str) -> Response:
        model = model_or_404(kind)
        s = LibraryWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        org = org_of(request)
        try:
            row = services.create_org_entry(
                model,
                org,
                request.user,
                s.validated_data["entry"],
                is_active=s.validated_data.get("is_active", True),
            )
        except services.InvalidEntry as exc:
            raise invalid(exc) from exc
        except services.EntryConflict as exc:
            raise ValidationError({"entry": [str(exc)]}) from exc
        body = rows_response(model, org, [row])[0]
        return Response(LibraryRowSerializer(body).data, status=status.HTTP_201_CREATED)


class EntryDetailView(APIView):
    permission_classes = [InOrganization]

    def get_row(
        self, request: Request, kind: str, pk: int
    ) -> tuple[type[LibraryEntry], LibraryEntry]:
        model = model_or_404(kind)
        row = selectors.visible_rows(model, org_of(request)).filter(pk=pk).first()
        if row is None:
            raise NotFound("Entrada não encontrada.")
        return model, row

    def own_row(self, request: Request, kind: str, pk: int):
        model, row = self.get_row(request, kind, pk)
        if row.is_global:
            raise PermissionDenied(
                "Entradas globais não se editam aqui: use “Personalizar” para ter uma "
                "cópia do escritório."
            )
        return model, row

    @extend_schema(parameters=[KIND], responses=LibraryRowSerializer, tags=["library"])
    def get(self, request: Request, kind: str, pk: int) -> Response:
        model, row = self.get_row(request, kind, pk)
        return Response(LibraryRowSerializer(rows_response(model, org_of(request), [row])[0]).data)

    @extend_schema(
        parameters=[KIND],
        request=LibraryWriteSerializer,
        responses=LibraryRowSerializer,
        tags=["library"],
    )
    def put(self, request: Request, kind: str, pk: int) -> Response:
        model, row = self.own_row(request, kind, pk)
        s = LibraryWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            services.update_org_entry(
                row, s.validated_data["entry"], is_active=s.validated_data.get("is_active")
            )
        except services.InvalidEntry as exc:
            raise invalid(exc) from exc
        return Response(LibraryRowSerializer(rows_response(model, org_of(request), [row])[0]).data)

    @extend_schema(parameters=[KIND], responses={204: None}, tags=["library"])
    def delete(self, request: Request, kind: str, pk: int) -> Response:
        _, row = self.own_row(request, kind, pk)
        row.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OverrideView(APIView):
    """Personalizar uma entrada global: cópia no banco do escritório, com o mesmo id."""

    permission_classes = [InOrganization]

    @extend_schema(
        parameters=[KIND], request=None, responses={201: LibraryRowSerializer}, tags=["library"]
    )
    def post(self, request: Request, kind: str, pk: int) -> Response:
        model = model_or_404(kind)
        org = org_of(request)
        row = model.objects.filter(organization__isnull=True, pk=pk).first()
        if row is None:
            raise NotFound("Entrada global não encontrada.")
        try:
            copy = services.override_global(row, org, request.user)
        except services.EntryConflict as exc:
            raise ValidationError({"entry": [str(exc)]}) from exc
        body = rows_response(model, org, [copy])[0]
        return Response(LibraryRowSerializer(body).data, status=status.HTTP_201_CREATED)


class ImportView(APIView):
    """Importa uma planilha (CSV/XLSX) para o banco do escritório."""

    permission_classes = [InOrganization]
    parser_classes = [MultiPartParser]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "kind", OpenApiTypes.STR, OpenApiParameter.PATH, enum=importers.IMPORTABLE_KINDS
            )
        ],
        request={"multipart/form-data": ImportRequestSerializer},
        responses=ImportReportSerializer,
        tags=["library"],
    )
    def post(self, request: Request, kind: str) -> Response:
        if kind not in importers.COLUMNS:
            raise NotFound("Este banco não importa planilha.")
        s = ImportRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        f = s.validated_data["file"]
        try:
            rows = importers.read_rows(f.name, f.read())
        except (ValueError, KeyError) as exc:
            raise ValidationError({"file": [str(exc) or "Planilha ilegível."]}) from exc
        report = importers.import_rows(
            LIBRARY_MODELS[kind],
            rows,
            organization=org_of(request),
            user=request.user,
            dry_run=s.validated_data["dry_run"],
        )
        return Response(ImportReportSerializer(report.as_dict()).data)
