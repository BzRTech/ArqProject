import factory

from apps.accounts.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"usuario{n}@exemplo.com.br")
    password = factory.django.Password("senha-forte-123")
