from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Usuário do sistema. Login por e-mail; não há username.

    Organização (escritório) e vínculos (Membership) entram na Fase 2.
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
