from .base import *  # noqa: F403

SECRET_KEY = "test-insecure"
DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
AWS_S3_ENDPOINT_URL = "http://s3.test:8333"
AWS_ACCESS_KEY_ID = "test"
AWS_SECRET_ACCESS_KEY = "test"
S3_PUBLIC_ENDPOINT_URL = "same-origin"
ALLOW_SIGNUP = True
