import factory

from apps.accounts.models import Membership, Organization, User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"usuario{n}@exemplo.com.br")
    password = factory.django.Password("senha-forte-123")


class OrganizationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Organization

    name = factory.Sequence(lambda n: f"Escritório {n}")
    slug = factory.Sequence(lambda n: f"escritorio-{n}")


class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Membership

    user = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    role = Membership.Role.OWNER
