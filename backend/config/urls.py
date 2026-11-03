from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.urls import auth_urls, org_urls
from config.views import health

api_patterns = [
    path("health/", health, name="health"),
    path("auth/", include(auth_urls)),
    path("orgs/", include(org_urls)),
    path("projects/", include("apps.projects.urls")),
    path("assets/", include("apps.assets.urls")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
]
