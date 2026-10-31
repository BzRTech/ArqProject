#!/bin/sh
# Prepara o ambiente de desenvolvimento antes de subir o servidor.
set -e
python manage.py migrate --noinput
python manage.py ensure_bucket
exec "$@"
