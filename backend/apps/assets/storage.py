"""Acesso ao armazenamento S3 (MinIO/SeaweedFS em dev, S3 em produção)."""

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings


def s3_client() -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(
            signature_version=settings.AWS_S3_SIGNATURE_VERSION,
            s3={"addressing_style": settings.AWS_S3_ADDRESSING_STYLE},
        ),
    )


def ensure_bucket(client: BaseClient, bucket: str) -> bool:
    """Cria o bucket se ainda não existir. Devolve True se criou."""
    try:
        client.head_bucket(Bucket=bucket)
        return False
    except ClientError as exc:
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code not in {"404", "NoSuchBucket", "NotFound"}:
            raise
    client.create_bucket(Bucket=bucket)
    return True
