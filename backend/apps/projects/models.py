import uuid

from django.conf import settings
from django.db import models


class Project(models.Model):
    """Projeto = UM documento JSONB (formato do schema zod do front, validado por JSON Schema).

    `revision` faz o controle de concorrência otimista: o save envia `If-Match: <revision>`
    e recebe 409 se outra aba/pessoa salvou antes.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "rascunho"
        REVIEW = "review", "em aprovação"
        APPROVED = "approved", "aprovado"
        ARCHIVED = "archived", "arquivado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="projects",
        verbose_name="escritório",
    )
    name = models.CharField("nome", max_length=200)
    client_name = models.CharField("cliente", max_length=200, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    schema_version = models.PositiveIntegerField("versão do formato")
    data = models.JSONField("documento")
    # Relatório do memorial, calculado pelo núcleo do front e enviado junto com o save
    # (marcadores, quantidades de piso com perda, totais). O servidor só guarda e imprime.
    report = models.JSONField("relatório (memorial)", default=dict, blank=True)
    revision = models.PositiveIntegerField("revisão", default=1)
    thumbnail = models.ForeignKey(
        "assets.Asset", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("alterado em", auto_now=True)

    class Meta:
        verbose_name = "projeto"
        verbose_name_plural = "projetos"
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["organization", "-updated_at"])]

    def __str__(self) -> str:
        return self.name


class ProjectVersion(models.Model):
    """Cópia do documento numa revisão (histórico / restaurar)."""

    class Kind(models.TextChoices):
        AUTO = "auto", "automática"
        MANUAL = "manual", "salva pelo usuário"
        RESTORE = "restore", "antes de restaurar"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="versions")
    revision = models.PositiveIntegerField("revisão")
    schema_version = models.PositiveIntegerField("versão do formato")
    data = models.JSONField("documento")
    label = models.CharField("nome", max_length=200, blank=True)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.AUTO)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField("criada em", auto_now_add=True)

    class Meta:
        verbose_name = "versão do projeto"
        verbose_name_plural = "versões do projeto"
        ordering = ["-created_at", "-pk"]

    def __str__(self) -> str:
        return f"{self.project} rev {self.revision}"


class ProjectItemIndex(models.Model):
    """Linhas do memorial (derivadas a cada save) — memorial, busca e relatórios.

    Vêm do relatório que o front envia (uma linha por marcador: itens iguais somados, pisos
    com perda); sem relatório, uma linha por item do documento. O servidor só COPIA.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="item_index")
    environment_id = models.CharField(max_length=64)
    environment_name = models.CharField(max_length=200)
    item_id = models.CharField(max_length=64, blank=True)
    marker_no = models.CharField("marcador", max_length=12, blank=True)
    discipline = models.CharField("disciplina", max_length=20, blank=True)
    block_id = models.CharField("bloco", max_length=100, blank=True)
    name = models.CharField("nome", max_length=300)
    detail = models.TextField("especificação", blank=True)
    qty = models.DecimalField("quantidade", max_digits=12, decimal_places=3)
    unit = models.CharField("unidade", max_length=10)
    size_w_mm = models.PositiveIntegerField(null=True)
    size_d_mm = models.PositiveIntegerField(null=True)
    size_h_mm = models.PositiveIntegerField(null=True)
    unit_price_cents = models.PositiveBigIntegerField(null=True)
    supplier = models.CharField("fornecedor", max_length=200, blank=True)
    brand_model = models.CharField("marca/modelo", max_length=300, blank=True)
    approved = models.BooleanField("aprovado", default=False)
    existing = models.BooleanField("existente", default=False)
    in_legend = models.BooleanField("na legenda", default=True)
    has_joinery = models.BooleanField("marcenaria detalhada", default=False)

    class Meta:
        verbose_name = "item do projeto (índice)"
        verbose_name_plural = "itens dos projetos (índice)"
        ordering = ["project", "environment_name", "pk"]
        indexes = [models.Index(fields=["project", "environment_id"])]

    def __str__(self) -> str:
        return self.name
