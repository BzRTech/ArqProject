from django.db.models import F, Func, IntegerField, Q, QuerySet
from django.db.models.fields.json import KeyTransform

from .models import Project


def projects_for(organization) -> QuerySet[Project]:
    """Projetos do escritório (SEMPRE filtrar por aqui)."""
    return Project.objects.filter(organization=organization)


def project_list(organization, *, search: str = "", status: str = "") -> QuerySet[Project]:
    qs = (
        projects_for(organization)
        .defer("data")
        .select_related("updated_by")
        .annotate(
            environment_count=Func(
                KeyTransform("environments", F("data")),
                function="jsonb_array_length",
                output_field=IntegerField(),
            )
        )
    )
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(client_name__icontains=search))
    if status == "all":
        pass
    elif status:
        qs = qs.filter(status=status)
    elif not search:
        qs = qs.exclude(status=Project.Status.ARCHIVED)
    return qs
