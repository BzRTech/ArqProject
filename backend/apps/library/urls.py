from django.urls import path

from . import views

urlpatterns = [
    path("bundle/", views.BundleView.as_view(), name="library-bundle"),
    path("<slug:kind>/", views.EntryListView.as_view(), name="library-list"),
    path("<slug:kind>/import/", views.ImportView.as_view(), name="library-import"),
    path("<slug:kind>/<int:pk>/", views.EntryDetailView.as_view(), name="library-detail"),
    path("<slug:kind>/<int:pk>/override/", views.OverrideView.as_view(), name="library-override"),
]
