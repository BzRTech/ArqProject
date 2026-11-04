from django.urls import path

from . import views

urlpatterns = [
    path("presign/", views.PresignView.as_view(), name="asset-presign"),
    path("<uuid:asset_id>/", views.AssetDetailView.as_view(), name="asset-detail"),
    path("<uuid:asset_id>/complete/", views.CompleteView.as_view(), name="asset-complete"),
]
