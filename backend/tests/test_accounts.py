import pytest
from django.contrib.auth import authenticate, get_user_model

from tests.factories import UserFactory

User = get_user_model()


def test_custom_user_ativo():
    assert User._meta.label == "accounts.User"
    assert User.USERNAME_FIELD == "email"


@pytest.mark.django_db
def test_create_user_normaliza_email():
    user = User.objects.create_user("Fulana@Exemplo.COM.br", "senha-forte-123")
    assert user.email == "fulana@exemplo.com.br"
    assert not user.is_staff
    assert user.check_password("senha-forte-123")


@pytest.mark.django_db
def test_create_user_sem_email_falha():
    with pytest.raises(ValueError):
        User.objects.create_user("", "x")


@pytest.mark.django_db
def test_create_superuser():
    admin = User.objects.create_superuser("admin@exemplo.com.br", "senha-forte-123")
    assert admin.is_staff and admin.is_superuser


@pytest.mark.django_db
def test_login_por_email():
    user = UserFactory()
    assert authenticate(username=user.email, password="senha-forte-123") == user
