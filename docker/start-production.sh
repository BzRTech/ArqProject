#!/bin/sh
set -eu
python manage.py migrate --noinput
python manage.py seed_library
# Bucket must already exist; production credentials need no CreateBucket permission.
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-10000}" \
    --workers "${WEB_CONCURRENCY:-2}" --timeout 120 --access-logfile - --error-logfile -
