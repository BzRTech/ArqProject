from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Usuário do sistema. Login por e-mail; não há username.

    Pertence a um ou mais escritórios por `Membership`.
    """

    username = None
    email = models.EmailField("e-mail", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"
        ordering = ["email"]

    def __str__(self) -> str:
        return self.email


class Organization(models.Model):
    """Escritório. Todo dado de cliente (projetos, arquivos, banco do escritório) pertence a um."""

    name = models.CharField("nome", max_length=200)
    slug = models.SlugField("identificador", max_length=80, unique=True)
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    # --- Minha marca (carimbo das pranchas e cabeçalho do memorial) -----------------------
    logo = models.ForeignKey(
        "assets.Asset", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    brand_color = models.CharField("cor da marca", max_length=7, blank=True)
    phone = models.CharField("telefone", max_length=40, blank=True)
    email = models.EmailField("e-mail de contato", blank=True)
    website = models.CharField("site", max_length=120, blank=True)
    address = models.CharField("endereço", max_length=200, blank=True)
    registration = models.CharField(
        "registro profissional", max_length=80, blank=True, help_text="Ex.: CAU A12345-6"
    )

    class Meta:
        verbose_name = "escritório"
        verbose_name_plural = "escritórios"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Membership(models.Model):
    """Vínculo usuário ↔ escritório, com papel."""

    class Role(models.TextChoices):
        OWNER = "owner", "dono"
        EDITOR = "editor", "editor"
        VIEWER = "viewer", "leitor"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="memberships", verbose_name="usuário"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="escritório",
    )
    role = models.CharField("papel", max_length=10, choices=Role.choices, default=Role.EDITOR)
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "vínculo"
        verbose_name_plural = "vínculos"
        ordering = ["organization__name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "organization"], name="uniq_membership"),
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.organization} ({self.role})"

    @property
    def can_edit(self) -> bool:
        return self.role in {self.Role.OWNER, self.Role.EDITOR}
