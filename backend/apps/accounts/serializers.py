from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.assets.models import Asset

from .models import Membership, Organization, User


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug"]
        read_only_fields = ["id", "slug"]


HEX = r"^#[0-9a-fA-F]{6}$"


class BrandSerializer(serializers.ModelSerializer):
    """Escritório com a "Minha marca" (só o dono altera)."""

    logo = serializers.PrimaryKeyRelatedField(
        queryset=Asset.objects.all(), allow_null=True, required=False
    )
    logo_url = serializers.SerializerMethodField()
    brand_color = serializers.RegexField(HEX, allow_blank=True, required=False)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "logo",
            "logo_url",
            "brand_color",
            "phone",
            "email",
            "website",
            "address",
            "registration",
        ]
        read_only_fields = ["id", "slug"]

    def get_logo_url(self, obj: Organization) -> str | None:
        """URL temporária do logo (para a tela e para o PDF)."""
        from apps.assets.services import download_url

        if obj.logo is None or obj.logo.status != Asset.Status.READY:
            return None
        return download_url(obj.logo, self.context.get("request"))

    def validate_logo(self, asset: Asset | None) -> Asset | None:
        if asset is None:
            return None
        org = self.instance
        if org is None or asset.organization_id != org.pk:
            raise serializers.ValidationError("Arquivo não encontrado.")
        if asset.status != Asset.Status.READY:
            raise serializers.ValidationError("O envio do logo ainda não terminou.")
        if asset.content_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise serializers.ValidationError("Use uma imagem PNG, JPG ou WEBP.")
        return asset


class MembershipSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["organization", "role"]


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    name = serializers.CharField()
    is_staff = serializers.BooleanField()
    organization = OrganizationSerializer(allow_null=True)
    role = serializers.ChoiceField(choices=Membership.Role.choices, allow_null=True)
    memberships = MembershipSerializer(many=True)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class SignUpSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    organization_name = serializers.CharField(max_length=200)

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate(self, attrs):
        user = User(email=attrs["email"], first_name=attrs["name"])
        validate_password(attrs["password"], user)
        return attrs


class SwitchOrganizationSerializer(serializers.Serializer):
    organization = serializers.IntegerField()
