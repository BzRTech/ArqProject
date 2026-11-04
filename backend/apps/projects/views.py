import re

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.accounts.permissions import InOrganization
from apps.accounts.selectors import active_membership

from . import services
from .models import Project, ProjectVersion
from .selectors import project_list, projects_for
from .serializers import (
    ConflictSerializer,
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectMetaSerializer,
    ProjectSaveSerializer,
    VersionCreateSerializer,
    VersionSerializer,
)

IF_MATCH = OpenApiParameter(
    "If-Match",
    OpenApiTypes.STR,
    OpenApiParameter.HEADER,
    required=True,
    description="Revisão que o editor tem (ETag recebido no GET).",
)


class PreconditionRequired(APIException):
    status_code = 428
    default_detail = "Envie o cabeçalho If-Match com a revisão do projeto."
    default_code = "precondition_required"


def etag(project: Project) -> str:
    return f'"{project.revision}"'


def parse_if_match(request: Request) -> int:
    raw = request.headers.get("If-Match", "")
    m = re.fullmatch(r'\s*(?:W/)?"?(\d+)"?\s*', raw)
    if not m:
        raise PreconditionRequired()
    return int(m.group(1))


def conflict_response(project: Project) -> Response:
    u = project.updated_by
    body = {
        "detail": "Este projeto foi alterado em outra aba ou por outra pessoa.",
        "revision": project.revision,
        "updated_at": project.updated_at,
        "updated_by_name": (u.get_full_name() or u.email) if u else None,
    }
    return Response(ConflictSerializer(body).data, status=status.HTTP_409_CONFLICT)


def invalid_document(exc: services.InvalidDocument) -> ValidationError:
    return ValidationError({"data": exc.errors})


def with_etag(response: Response, project: Project) -> Response:
    response["ETag"] = etag(project)
    return response


class ProjectViewSet(GenericViewSet):
    """Projetos do escritório ativo. Nada de outro escritório aparece (404)."""

    permission_classes = [InOrganization]
    lookup_field = "pk"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        return projects_for(active_membership(self.request).organization)

    def get_serializer_class(self):  # usado só pelo schema
        return ProjectDetailSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, description="Nome ou cliente."),
            OpenApiParameter(
                "status",
                OpenApiTypes.STR,
                description="draft|review|approved|archived|all (padrão: tudo menos arquivados).",
            ),
        ],
        responses=ProjectListSerializer(many=True),
        tags=["projects"],
    )
    def list(self, request: Request) -> Response:
        qs = project_list(
            active_membership(request).organization,
            search=request.query_params.get("search", "").strip(),
            status=request.query_params.get("status", "").strip(),
        )
        return Response(ProjectListSerializer(qs, many=True).data)

    @extend_schema(
        request=ProjectCreateSerializer, responses={201: ProjectDetailSerializer}, tags=["projects"]
    )
    def create(self, request: Request) -> Response:
        s = ProjectCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            project = services.create_project(
                organization=active_membership(request).organization,
                user=request.user,
                **s.validated_data,
            )
        except services.InvalidDocument as exc:
            raise invalid_document(exc) from exc
        return with_etag(
            Response(ProjectDetailSerializer(project).data, status=status.HTTP_201_CREATED),
            project,
        )

    @extend_schema(responses=ProjectDetailSerializer, tags=["projects"])
    def retrieve(self, request: Request, pk=None) -> Response:
        project = self.get_object()
        return with_etag(Response(ProjectDetailSerializer(project).data), project)

    @extend_schema(
        request=ProjectSaveSerializer,
        parameters=[IF_MATCH],
        responses={200: ProjectDetailSerializer, 409: ConflictSerializer},
        tags=["projects"],
    )
    def update(self, request: Request, pk=None) -> Response:
        project = self.get_object()
        expected = parse_if_match(request)
        s = ProjectSaveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            project = services.save_project(
                project, request.user, data=s.validated_data["data"], expected_revision=expected
            )
        except services.RevisionConflict as exc:
            return conflict_response(exc.project)
        except services.InvalidDocument as exc:
            raise invalid_document(exc) from exc
        return with_etag(Response(ProjectDetailSerializer(project).data), project)

    @extend_schema(
        request=ProjectMetaSerializer, responses=ProjectListSerializer, tags=["projects"]
    )
    def partial_update(self, request: Request, pk=None) -> Response:
        project = self.get_object()
        s = ProjectMetaSerializer(project, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        project = project_list(project.organization, status="all").get(pk=project.pk)
        return Response(ProjectListSerializer(project).data)

    @extend_schema(responses={204: None}, tags=["projects"])
    def destroy(self, request: Request, pk=None) -> Response:
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=None, responses={201: ProjectListSerializer}, tags=["projects"])
    @action(detail=True, methods=["post"])
    def duplicate(self, request: Request, pk=None) -> Response:
        copy = services.duplicate_project(self.get_object(), request.user)
        copy = project_list(copy.organization, status="all").get(pk=copy.pk)
        return Response(ProjectListSerializer(copy).data, status=status.HTTP_201_CREATED)

    @extend_schema(methods=["GET"], responses=VersionSerializer(many=True), tags=["projects"])
    @extend_schema(
        methods=["POST"],
        request=VersionCreateSerializer,
        responses={201: VersionSerializer},
        tags=["projects"],
    )
    @action(detail=True, methods=["get", "post"])
    def versions(self, request: Request, pk=None) -> Response:
        project = self.get_object()
        if request.method == "POST":
            s = VersionCreateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            version = services.create_version(
                project,
                request.user,
                label=s.validated_data["label"],
                kind=ProjectVersion.Kind.MANUAL,
            )
            return Response(VersionSerializer(version).data, status=status.HTTP_201_CREATED)
        qs = project.versions.select_related("created_by")
        return Response(VersionSerializer(qs, many=True).data)

    @extend_schema(
        request=None,
        parameters=[IF_MATCH],
        responses={200: ProjectDetailSerializer, 409: ConflictSerializer},
        tags=["projects"],
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"versions/(?P<version_id>\d+)/restore",
        url_name="restore-version",
    )
    def restore(self, request: Request, pk=None, version_id=None) -> Response:
        project = self.get_object()
        expected = parse_if_match(request)
        version = get_object_or_404(project.versions, pk=version_id)
        try:
            project = services.restore_version(
                project, request.user, version=version, expected_revision=expected
            )
        except services.RevisionConflict as exc:
            return conflict_response(exc.project)
        except services.InvalidDocument as exc:
            raise invalid_document(exc) from exc
        return with_etag(Response(ProjectDetailSerializer(project).data), project)
