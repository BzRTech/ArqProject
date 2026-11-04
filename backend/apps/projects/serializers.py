from rest_framework import serializers

from .models import Project, ProjectVersion


class ProjectListSerializer(serializers.ModelSerializer):
    environment_count = serializers.IntegerField(read_only=True, allow_null=True)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "client_name",
            "status",
            "revision",
            "schema_version",
            "environment_count",
            "created_at",
            "updated_at",
            "updated_by_name",
        ]
        read_only_fields = fields

    def get_updated_by_name(self, obj: Project) -> str | None:
        u = obj.updated_by
        return (u.get_full_name() or u.email) if u else None


class ProjectDetailSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "client_name",
            "status",
            "revision",
            "schema_version",
            "data",
            "created_at",
            "updated_at",
            "updated_by_name",
        ]
        read_only_fields = fields

    def get_updated_by_name(self, obj: Project) -> str | None:
        u = obj.updated_by
        return (u.get_full_name() or u.email) if u else None


class ProjectCreateSerializer(serializers.Serializer):
    data = serializers.JSONField(help_text="Documento completo (formato atual).")
    client_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Project.Status.choices, required=False)


class ProjectSaveSerializer(serializers.Serializer):
    """PUT: o documento inteiro. Exige o cabeçalho `If-Match: <revision>`."""

    data = serializers.JSONField()


class ProjectMetaSerializer(serializers.ModelSerializer):
    """PATCH: dados fora do documento (não mexem na revisão)."""

    class Meta:
        model = Project
        fields = ["client_name", "status"]


class ConflictSerializer(serializers.Serializer):
    detail = serializers.CharField()
    revision = serializers.IntegerField()
    updated_at = serializers.DateTimeField()
    updated_by_name = serializers.CharField(allow_null=True)


class VersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectVersion
        fields = [
            "id",
            "revision",
            "schema_version",
            "label",
            "kind",
            "created_at",
            "created_by_name",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj: ProjectVersion) -> str | None:
        u = obj.created_by
        return (u.get_full_name() or u.email) if u else None


class VersionCreateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=200)
