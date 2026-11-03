"""Upload direto ao S3: URL pré-assinada para enviar (PUT) e para baixar (GET)."""

import re
import uuid

from botocore.exceptions import ClientError
from django.conf import settings
from django.http import HttpRequest

from .models import Asset
from .storage import s3_client

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "application/pdf"}
MAX_BYTES = 25 * 1024 * 1024
URL_TTL_SECONDS = 3600


class AssetError(Exception):
    pass


def public_endpoint(request: HttpRequest | None) -> str | None:
    """Endereço do S3 visto pelo NAVEGADOR (a assinatura inclui o host).

    - `S3_PUBLIC_ENDPOINT_URL=same-origin`: o próprio site (em dev o Vite repassa `/<bucket>/`
      ao SeaweedFS — sem CORS);
    - uma URL: ela (ex.: CDN/S3 público em produção);
    - vazio: o mesmo endpoint interno (ou a AWS, se não houver).
    """
    configured = settings.S3_PUBLIC_ENDPOINT_URL
    if configured == "same-origin":
        if request is None:
            raise AssetError("same-origin exige a requisição")
        return f"{request.scheme}://{request.get_host()}"
    return configured or settings.AWS_S3_ENDPOINT_URL


def safe_filename(name: str) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", name.strip()).strip("-.")
    return (base or "arquivo")[-120:]


def create_upload(
    *, organization, user, filename: str, content_type: str, size: int, request: HttpRequest
) -> tuple[Asset, str]:
    if content_type not in ALLOWED_TYPES:
        raise AssetError("Tipo de arquivo não aceito (use PNG, JPG, WEBP ou PDF).")
    if size <= 0 or size > MAX_BYTES:
        raise AssetError("O arquivo deve ter até 25 MB.")
    asset_id = uuid.uuid4()
    key = f"orgs/{organization.pk}/assets/{asset_id}/{safe_filename(filename)}"
    asset = Asset.objects.create(
        id=asset_id,
        organization=organization,
        key=key,
        filename=filename[:255],
        content_type=content_type,
        size_bytes=size,
        created_by=user,
    )
    url = s3_client(public_endpoint(request)).generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=URL_TTL_SECONDS,
    )
    return asset, url


def head_object(key: str) -> dict:
    """Metadados do objeto no S3 (endpoint interno)."""
    return s3_client().head_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)


def complete_upload(asset: Asset) -> Asset:
    """Confere no S3 que o arquivo chegou (tamanho) e marca como pronto."""
    if asset.status == Asset.Status.READY:
        return asset
    try:
        head = head_object(asset.key)
    except ClientError as exc:
        raise AssetError("O arquivo ainda não chegou ao armazenamento.") from exc
    if int(head.get("ContentLength", -1)) != asset.size_bytes:
        raise AssetError("O arquivo recebido tem tamanho diferente do informado.")
    asset.status = Asset.Status.READY
    asset.save(update_fields=["status"])
    return asset


def download_url(asset: Asset, request: HttpRequest | None) -> str:
    return s3_client(public_endpoint(request)).generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": asset.key},
        ExpiresIn=URL_TTL_SECONDS,
    )
