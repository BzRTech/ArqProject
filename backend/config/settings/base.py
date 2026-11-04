"""Configurações comuns a todos os ambientes.

Valores sensíveis e dependentes do ambiente vêm de variáveis de ambiente
(ver `.env.example` na raiz do repositório).
"""

import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in os.environ.get(name, default).split(",") if v.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "storages",
    "apps.accounts",
    "apps.assets",
    "apps.projects",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": dj_database_url.config(
        env="DATABASE_URL",
        default="postgres://prancheta:prancheta@localhost:5432/prancheta",
        conn_max_age=60,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Armazenamento de arquivos (S3 / MinIO) ---------------------------------
AWS_STORAGE_BUCKET_NAME = os.environ.get("S3_BUCKET", "prancheta")
AWS_S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL") or None
AWS_S3_CUSTOM_DOMAIN = os.environ.get("S3_PUBLIC_DOMAIN") or None
AWS_S3_URL_PROTOCOL = os.environ.get("S3_PUBLIC_PROTOCOL", "https:")
# Endereço do S3 visto pelo NAVEGADOR nas URLs pré-assinadas (ver apps/assets/services.py):
# "same-origin" = o próprio site (dev: o Vite repassa /<bucket>/ ao SeaweedFS), uma URL, ou vazio.
S3_PUBLIC_ENDPOINT_URL = os.environ.get("S3_PUBLIC_ENDPOINT_URL", "")
AWS_ACCESS_KEY_ID = os.environ.get("S3_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.environ.get("S3_SECRET_KEY")
AWS_S3_REGION_NAME = os.environ.get("S3_REGION", "us-east-1")
AWS_S3_ADDRESSING_STYLE = "path"
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True

STORAGES = {
    "default": {"BACKEND": "storages.backends.s3.S3Storage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# --- DRF / OpenAPI -----------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Prancheta API",
    "DESCRIPTION": "API do Prancheta: projetos, bancos de conteúdo e relatórios.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "ProjectStatusEnum": "apps.projects.models.Project.Status",
        "VersionKindEnum": "apps.projects.models.ProjectVersion.Kind",
        "AssetStatusEnum": "apps.assets.models.Asset.Status",
        "RoleEnum": "apps.accounts.models.Membership.Role",
    },
}

# --- Sessão / CSRF (SPA servida no mesmo domínio) ----------------------------
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # o front lê o cookie para enviar X-CSRFToken
CSRF_COOKIE_SAMESITE = "Lax"

# --- Projetos / contas -------------------------------------------------------
# Documento inteiro vai no corpo do save (JSON); plantas e imagens vão ao S3, não aqui.
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
# Uma versão automática no máximo a cada N minutos de edição.
PROJECT_AUTOVERSION_MINUTES = int(os.environ.get("PROJECT_AUTOVERSION_MINUTES", "10"))
# Cadastro aberto (conta + escritório). Em produção, desligar e usar convites (Fase 10).
ALLOW_SIGNUP = env_bool("ALLOW_SIGNUP", True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}
