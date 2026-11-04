from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Membership, Organization, User


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug"]
        read_only_fields = ["id", "slug"]


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
