from rest_framework.permissions import SAFE_METHODS, BasePermission

from .selectors import active_membership


class InOrganization(BasePermission):
    """Usuário logado e membro de um escritório (o ativo na sessão).

    Leitura: qualquer papel. Escrita: dono ou editor.
    """

    message = "Você não participa de nenhum escritório."

    def has_permission(self, request, view) -> bool:
        membership = active_membership(request)
        if membership is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        if not membership.can_edit:
            self.message = "Seu papel neste escritório é somente leitura."
            return False
        return True


class IsOrganizationOwner(BasePermission):
    message = "Só o dono do escritório pode alterar estes dados."

    def has_permission(self, request, view) -> bool:
        membership = active_membership(request)
        if membership is None:
            return False
        return request.method in SAFE_METHODS or membership.role == membership.Role.OWNER
