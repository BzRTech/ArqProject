"""Curadoria dos bancos no Django Admin (banco GLOBAL: só staff). Ver PLANO 4.3."""

from django.contrib import admin
from django.utils.html import format_html

from apps.assets.models import Asset
from apps.assets.services import download_url

from .models import LIBRARY_MODELS, LibraryEntry


class ScopeFilter(admin.SimpleListFilter):
    title = "banco"
    parameter_name = "scope"

    def lookups(self, request, model_admin):
        return [("global", "Global"), ("org", "De escritório")]

    def queryset(self, request, queryset):
        if self.value() == "global":
            return queryset.filter(organization__isnull=True)
        if self.value() == "org":
            return queryset.filter(organization__isnull=False)
        return queryset


class LibraryEntryAdmin(admin.ModelAdmin):
    list_display = ["thumb", "name", "slug", "scope", "version", "is_active", "updated_at"]
    list_display_links = ["name"]
    list_filter = [ScopeFilter, "is_active", "organization"]
    search_fields = ["name", "slug", "description"]
    readonly_fields = ["version", "created_by", "created_at", "updated_at", "thumb_large"]
    autocomplete_fields = ["organization"]
    raw_id_fields = ["thumbnail"]

    @admin.display(description="banco")
    def scope(self, obj: LibraryEntry) -> str:
        return "global" if obj.is_global else str(obj.organization)

    def _thumb(self, obj: LibraryEntry, size: int) -> str:
        asset: Asset | None = obj.thumbnail
        if asset is None or asset.status != Asset.Status.READY:
            return "—"
        return format_html(
            '<img src="{}" style="max-width:{}px;max-height:{}px;border-radius:4px">',
            download_url(asset, None),
            size,
            size,
        )

    @admin.display(description="miniatura")
    def thumb(self, obj: LibraryEntry) -> str:
        return self._thumb(obj, 48)

    @admin.display(description="miniatura")
    def thumb_large(self, obj: LibraryEntry) -> str:
        return self._thumb(obj, 240)

    def save_model(self, request, obj: LibraryEntry, form, change) -> None:
        """A versão sobe a cada alteração do conteúdo (os projetos verão "versão nova")."""
        if change:
            before = type(obj).objects.get(pk=obj.pk)
            if (before.to_front(), before.is_active) != (obj.to_front(), obj.is_active):
                obj.version = before.version + 1
        elif obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


for model in LIBRARY_MODELS.values():
    admin.site.register(model, LibraryEntryAdmin)
