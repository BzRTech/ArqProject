FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH" DJANGO_SETTINGS_MODULE=config.settings.prod
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir "uv>=0.11,<0.12"
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ ./
COPY --from=frontend /build/dist ./frontend_dist
# Build-only key: never persisted as the runtime secret.
RUN DJANGO_SECRET_KEY=build-only-collectstatic python manage.py collectstatic --noinput
COPY docker/start-production.sh ./start-production.sh
RUN chmod +x ./start-production.sh && useradd --system --uid 10001 prancheta
USER prancheta
EXPOSE 10000
CMD ["./start-production.sh"]
