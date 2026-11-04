import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.library.models import LIBRARY_MODELS
from apps.library.services import InvalidEntry, seed_global

SEED_DIR = Path(settings.BASE_DIR) / "library_seed"


class Command(BaseCommand):
    help = (
        "Carrega o banco GLOBAL a partir de library_seed/ "
        "(idempotente; muda a versão do que mudou)."
    )

    def handle(self, *args, **options) -> None:
        for kind, model in LIBRARY_MODELS.items():
            path = SEED_DIR / f"{kind}.json"
            if not path.exists():
                self.stdout.write(f"{kind}: sem arquivo, pulando")
                continue
            try:
                stats = seed_global(model, json.loads(path.read_text(encoding="utf-8")))
            except InvalidEntry as exc:
                raise CommandError(f"{kind}: {exc}") from exc
            summary = ", ".join(f"{v} {k}" for k, v in stats.items())
            self.stdout.write(self.style.SUCCESS(f"{kind}: {summary}"))
