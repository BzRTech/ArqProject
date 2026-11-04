import uuid

from django.conf import settings
from django.db import models


class Asset(models.Model):
    """Arquivo do escritório guardado no S3 (planta base, logo, textura…).

    O navegador envia o arquivo direto ao S3 por uma URL pré-assinada; aqui fica só o registro.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "aguardando envio"
        READY = "ready", "pronto"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="assets",
        verbose_name="escritório",
    )
    key = models.CharField("chave no S3", max_length=500, unique=True)
    filename = models.CharField("nome do arquivo", max_length=255)
    content_type = models.CharField("tipo", max_length=100)
    size_bytes = models.PositiveBigIntegerField("tamanho (bytes)")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "arquivo"
        verbose_name_plural = "arquivos"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.filename
