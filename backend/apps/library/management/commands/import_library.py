from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Organization
from apps.library.importers import IMPORTABLE_KINDS, import_rows, read_rows
from apps.library.models import LIBRARY_MODELS


class Command(BaseCommand):
    help = (
        "Importa uma planilha (CSV/XLSX) para um banco. Sem --org vai para o banco GLOBAL. "
        "Linhas com erro são listadas e não entram."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument("--kind", required=True, choices=IMPORTABLE_KINDS)
        parser.add_argument("file")
        parser.add_argument("--org", help="slug do escritório (padrão: banco global)")
        parser.add_argument("--dry-run", action="store_true", help="só confere, não grava")

    def handle(self, *args, **o) -> None:
        path = Path(o["file"])
        if not path.exists():
            raise CommandError(f"Arquivo não encontrado: {path}")
        org = None
        if o["org"]:
            org = Organization.objects.filter(slug=o["org"]).first()
            if org is None:
                raise CommandError(f"Escritório não encontrado: {o['org']}")
        try:
            rows = read_rows(path.name, path.read_bytes())
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        report = import_rows(
            LIBRARY_MODELS[o["kind"]], rows, organization=org, dry_run=o["dry_run"]
        )
        prefix = "[simulação] " if o["dry_run"] else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}{report.created} criados, {report.updated} atualizados, "
                f"{report.unchanged} iguais, {len(report.errors)} com erro"
            )
        )
        for e in report.errors:
            self.stdout.write(self.style.WARNING(e))
