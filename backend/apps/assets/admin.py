from django.contrib import admin

from .models import Asset


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = [
        "filename",
        "organization",
        "content_type",
        "size_bytes",
        "status",
        "created_at",
    ]
    list_filter = ["status", "content_type", "organization"]
    search_fields = ["filename", "key"]
    readonly_fields = ["id", "key", "created_at", "created_by"]
