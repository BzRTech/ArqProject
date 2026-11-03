from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import InOrganization
from apps.accounts.selectors import active_membership

from . import services
from .models import Asset
from .serializers import AssetSerializer, PresignRequestSerializer, PresignResponseSerializer


def org_asset(request: Request, asset_id) -> Asset:
    org = active_membership(request).organization
    return get_object_or_404(Asset.objects.filter(organization=org), pk=asset_id)


class PresignView(APIView):
    """Reserva um arquivo e devolve a URL para o navegador enviá-lo direto ao S3 (PUT)."""

    permission_classes = [InOrganization]

    @extend_schema(
        request=PresignRequestSerializer,
        responses={201: PresignResponseSerializer},
        tags=["assets"],
    )
    def post(self, request: Request) -> Response:
        s = PresignRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            asset, url = services.create_upload(
                organization=active_membership(request).organization,
                user=request.user,
                request=request,
                **s.validated_data,
            )
        except services.AssetError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        payload = {
            "asset": AssetSerializer(asset, context={"request": request}).data,
            "upload_url": url,
            "method": "PUT",
            "headers": {"Content-Type": asset.content_type},
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class CompleteView(APIView):
    """Confirma que o envio terminou (o servidor confere no S3)."""

    permission_classes = [InOrganization]

    @extend_schema(request=None, responses=AssetSerializer, tags=["assets"])
    def post(self, request: Request, asset_id) -> Response:
        asset = org_asset(request, asset_id)
        try:
            services.complete_upload(asset)
        except services.AssetError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(AssetSerializer(asset, context={"request": request}).data)


class AssetDetailView(APIView):
    permission_classes = [InOrganization]

    @extend_schema(responses=AssetSerializer, tags=["assets"])
    def get(self, request: Request, asset_id) -> Response:
        asset = org_asset(request, asset_id)
        return Response(AssetSerializer(asset, context={"request": request}).data)
