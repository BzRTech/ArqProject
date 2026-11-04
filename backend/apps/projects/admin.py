from django.contrib import admin

from .models import Project, ProjectItemIndex, ProjectVersion


class VersionInline(admin.TabularInline):
    model = ProjectVersion
    extra = 0
    fields = ["revision", "label", "kind", "created_by", "created_at"]
    readonly_fields = fields
    can_delete = False
    show_change_link = False


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "client_name", "organization", "status", "revision", "updated_at"]
    list_filter = ["status", "organization"]
    search_fields = ["name", "client_name"]
    readonly_fields = ["id", "revision", "schema_version", "created_at", "updated_at"]
    inlines = [VersionInline]


@admin.register(ProjectItemIndex)
class ProjectItemIndexAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "environment_name", "qty", "unit", "unit_price_cents"]
    list_filter = ["project__organization"]
    search_fields = ["name", "supplier", "brand_model"]
