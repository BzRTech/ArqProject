from django.conf import settings
from django.core.management.base import BaseCommand

from apps.assets.storage import ensure_bucket, s3_client


class Command(BaseCommand):
    help = "Cria o bucket S3 configurado (S3_BUCKET), se ainda não existir."

    def handle(self, *args, **options) -> None:
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        created = ensure_bucket(s3_client(), bucket)
        msg = f"Bucket '{bucket}' criado." if created else f"Bucket '{bucket}' já existe."
        self.stdout.write(self.style.SUCCESS(msg))
