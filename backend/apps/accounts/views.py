from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Membership
from .permissions import IsOrganizationOwner
from .selectors import active_membership, memberships_of
from .serializers import (
    LoginSerializer,
    MeSerializer,
    OrganizationSerializer,
    SignUpSerializer,
    SwitchOrganizationSerializer,
)


def me_payload(request: Request) -> dict:
    user = request.user
    active = active_membership(request)
    return {
        "id": user.pk,
        "email": user.email,
        "name": user.get_full_name() or user.email,
        "is_staff": user.is_staff,
        "organization": active.organization if active else None,
        "role": active.role if active else None,
        "memberships": memberships_of(user),
    }


@method_decorator(ensure_csrf_cookie, name="get")
class CsrfView(APIView):
    """Entrega o cookie `csrftoken` (o front o devolve em X-CSRFToken)."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    @extend_schema(responses={204: None}, tags=["auth"])
    def get(self, request: Request) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses=MeSerializer, tags=["auth"])
    def post(self, request: Request) -> Response:
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=s.validated_data["email"].lower(),
            password=s.validated_data["password"],
        )
        if user is None:
            raise PermissionDenied("E-mail ou senha incorretos.")
        login(request, user)
        return Response(MeSerializer(me_payload(request)).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None}, tags=["auth"])
    def post(self, request: Request) -> Response:
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SignUpView(APIView):
    """Cria a conta e o escritório (o usuário vira dono). Desligável com ALLOW_SIGNUP."""

    permission_classes = [AllowAny]

    @extend_schema(request=SignUpSerializer, responses={201: MeSerializer}, tags=["auth"])
    def post(self, request: Request) -> Response:
        if not settings.ALLOW_SIGNUP:
            raise PermissionDenied("O cadastro está fechado. Peça um convite ao escritório.")
        s = SignUpSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = services.sign_up(**s.validated_data)
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(MeSerializer(me_payload(request)).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=MeSerializer, tags=["auth"])
    def get(self, request: Request) -> Response:
        return Response(MeSerializer(me_payload(request)).data)


class CurrentOrganizationView(APIView):
    """Escritório ativo. Só o dono altera (a "Minha marca" completa vem na Fase 6)."""

    permission_classes = [IsAuthenticated, IsOrganizationOwner]

    @extend_schema(responses=OrganizationSerializer, tags=["orgs"])
    def get(self, request: Request) -> Response:
        return Response(OrganizationSerializer(active_membership(request).organization).data)

    @extend_schema(request=OrganizationSerializer, responses=OrganizationSerializer, tags=["orgs"])
    def patch(self, request: Request) -> Response:
        org = active_membership(request).organization
        s = OrganizationSerializer(org, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class SwitchOrganizationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=SwitchOrganizationSerializer, responses=MeSerializer, tags=["orgs"])
    def post(self, request: Request) -> Response:
        s = SwitchOrganizationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        membership = (
            Membership.objects.filter(
                user=request.user, organization_id=s.validated_data["organization"]
            )
            .select_related("organization")
            .first()
        )
        if membership is None:
            raise NotFound("Escritório não encontrado.")
        services.set_active_organization(request, membership.organization)
        request._active_membership = membership
        return Response(MeSerializer(me_payload(request)).data)
