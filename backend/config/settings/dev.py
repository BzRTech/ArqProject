from .base import *  # noqa: F403
from .base import env_list

DEBUG = True
SECRET_KEY = SECRET_KEY or "dev-insecure-change-me"  # noqa: F405
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend,0.0.0.0")
CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
