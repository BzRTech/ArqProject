from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import ProjectViewSet

router = SimpleRouter()
router.register("", ProjectViewSet, basename="project")

urlpatterns = [
    # Sem barra no fim (é um arquivo): /api/projects/<id>/memorial.pdf
    path(
        "<uuid:pk>/memorial.pdf",
        ProjectViewSet.as_view({"get": "memorial"}),
        name="project-memorial",
    ),
    *router.urls,
]
