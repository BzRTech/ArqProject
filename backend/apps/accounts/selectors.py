"""Consultas de contas: escritório ativo do usuário."""

from django.http import HttpRequest

from .models import Membership
from .services import SESSION_ORG_KEY


def memberships_of(user) -> list[Membership]:
    return list(Membership.objects.filter(user=user).select_related("organization"))


def active_membership(request: HttpRequest) -> Membership | None:
    """Vínculo com o escritório ativo na sessão; sem escolha, o primeiro do usuário.

    Uma escolha guardada na sessão só vale se o usuário ainda for membro daquele escritório.
    """
    user = request.user
    if not user.is_authenticated:
        return None
    cached = getattr(request, "_active_membership", None)
    if cached is not None:
        return cached
    qs = Membership.objects.filter(user=user).select_related("organization")
    org_id = request.session.get(SESSION_ORG_KEY)
    membership = (qs.filter(organization_id=org_id).first() if org_id else None) or qs.order_by(
        "created_at", "pk"
    ).first()
    request._active_membership = membership
    return membership
