"""Regras de contas e escritórios (views finas chamam daqui)."""

from django.db import transaction
from django.http import HttpRequest
from django.utils.text import slugify

from .models import Membership, Organization, User

SESSION_ORG_KEY = "org_id"


def unique_org_slug(name: str) -> str:
    base = slugify(name)[:60] or "escritorio"
    slug, n = base, 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


@transaction.atomic
def create_organization(name: str, owner: User) -> Organization:
    org = Organization.objects.create(name=name.strip(), slug=unique_org_slug(name))
    Membership.objects.create(user=owner, organization=org, role=Membership.Role.OWNER)
    return org


@transaction.atomic
def sign_up(*, email: str, password: str, name: str, organization_name: str) -> User:
    first, _, last = name.strip().partition(" ")
    user = User.objects.create_user(email, password, first_name=first, last_name=last)
    create_organization(organization_name, user)
    return user


def set_active_organization(request: HttpRequest, org: Organization) -> None:
    request.session[SESSION_ORG_KEY] = org.pk
