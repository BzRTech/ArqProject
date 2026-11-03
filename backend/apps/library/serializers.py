from rest_framework import serializers

from .models import LIBRARY_MODELS


class LibraryRowSerializer(serializers.Serializer):
    """Uma linha do banco (global ou do escritório), com a entrada no formato do front."""

    pk = serializers.IntegerField()
    scope = serializers.ChoiceField(choices=[("global", "global"), ("org", "escritório")])
    overridden = serializers.BooleanField(
        help_text="Global que o escritório personalizou (vale a do escritório)."
    )
    overrides = serializers.BooleanField(help_text="Do escritório, no lugar de uma global.")
    is_active = serializers.BooleanField()
    updated_at = serializers.DateTimeField()
    entry = serializers.DictField()


class LibraryWriteSerializer(serializers.Serializer):
    entry = serializers.DictField(help_text="Entrada no formato do front (id, name, …).")
    is_active = serializers.BooleanField(required=False)


class BundleSerializer(serializers.Serializer):
    etag = serializers.CharField()
    kinds = serializers.DictField(
        child=serializers.ListField(child=serializers.DictField()),
        help_text=f"Por banco: {', '.join(LIBRARY_MODELS)}.",
    )


class ImportReportSerializer(serializers.Serializer):
    criados = serializers.IntegerField()
    atualizados = serializers.IntegerField()
    iguais = serializers.IntegerField()
    erros = serializers.ListField(child=serializers.CharField())


class ImportRequestSerializer(serializers.Serializer):
    file = serializers.FileField()
    dry_run = serializers.BooleanField(required=False, default=False)
