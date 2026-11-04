from rest_framework import serializers

from .models import Asset


class PresignRequestSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100)
    size = serializers.IntegerField(min_value=1)


class AssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = ["id", "filename", "content_type", "size_bytes", "status", "created_at", "url"]

    def get_url(self, obj: Asset) -> str | None:
        """URL temporária (1 h) para baixar; nula enquanto o envio não termina."""
        from .services import download_url

        if obj.status != Asset.Status.READY:
            return None
        return download_url(obj, self.context.get("request"))


class PresignResponseSerializer(serializers.Serializer):
    asset = AssetSerializer()
    upload_url = serializers.URLField()
    method = serializers.CharField()
    headers = serializers.DictField(child=serializers.CharField())
