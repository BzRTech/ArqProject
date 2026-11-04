"""Os BANCOS (bibliotecas de conteúdo). Ver PLANO 4.3 e ADR 005.

Toda entrada herda `LibraryEntry`: `organization` nulo = banco GLOBAL do sistema; preenchido =
banco do ESCRITÓRIO (que pode sobrescrever uma entrada global com o mesmo `slug`). `version`
sobe a cada alteração; o projeto guarda uma cópia (snapshot) do que usa.

Cada modelo sabe se converter no formato do front (`to_front`) e voltar (`set_front`). O formato
do front é validado pelos JSON Schemas exportados do zod (`apps/library/schema/`).
"""

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q

HANDLE_KINDS = [
    ("touch", "fecho toque"),
    ("bar", "barra"),
    ("profile", "perfil"),
    ("cava", "cava"),
    ("knob", "botão"),
]
FRONT_KINDS = [
    ("open", "aberto"),
    ("door1", "1 porta"),
    ("door2", "2 portas"),
    ("drawers", "gavetas"),
]
BASE_KINDS = [("floor", "direto no piso"), ("suspended", "suspenso"), ("plinth", "rodapé")]
DISCIPLINES = [
    ("layout", "Layout"),
    ("marcenaria", "Marcenaria"),
    ("eletrica", "Elétrica"),
    ("revestimentos", "Revestimentos"),
    ("hidraulica", "Hidráulica"),
]


def _opt(out: dict, key: str, value) -> None:
    """Campo opcional do front: só entra se tiver valor."""
    if value not in (None, "", []):
        out[key] = value


class LibraryEntry(models.Model):
    KIND = ""  # chave da API: /api/library/<KIND>/

    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="escritório",
        help_text="Vazio = banco global do sistema.",
    )
    slug = models.SlugField("identificador", max_length=80)
    name = models.CharField("nome", max_length=200)
    description = models.TextField("descrição", blank=True)
    tags = ArrayField(models.CharField(max_length=40), default=list, blank=True)
    is_active = models.BooleanField(
        "ativo", default=True, help_text="Inativa no escritório = esconde também a global."
    )
    version = models.PositiveIntegerField("versão", default=1)
    thumbnail = models.ForeignKey(
        "assets.Asset", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("alterado em", auto_now=True)

    class Meta:
        abstract = True
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["slug"],
                condition=Q(organization__isnull=True),
                name="%(app_label)s_%(class)s_uniq_global_slug",
            ),
            models.UniqueConstraint(
                fields=["organization", "slug"],
                condition=Q(organization__isnull=False),
                name="%(app_label)s_%(class)s_uniq_org_slug",
            ),
        ]

    def __str__(self) -> str:
        scope = "global" if self.organization_id is None else str(self.organization)
        return f"{self.name} ({scope})"

    @property
    def is_global(self) -> bool:
        return self.organization_id is None

    # --- formato do front ---------------------------------------------------------------
    def payload(self) -> dict:
        raise NotImplementedError

    def set_payload(self, data: dict) -> None:
        raise NotImplementedError

    def to_front(self) -> dict:
        return {"id": self.slug, "version": self.version, "name": self.name, **self.payload()}

    def set_front(self, data: dict) -> None:
        self.slug = data["id"]
        self.name = data["name"]
        self.set_payload(data)


class Discipline(LibraryEntry):
    KIND = "disciplines"
    color_hex = models.CharField("cor", max_length=7)
    order = models.IntegerField("ordem", default=0)

    class Meta(LibraryEntry.Meta):
        verbose_name = "disciplina"
        verbose_name_plural = "disciplinas"
        ordering = ["order", "name"]

    def payload(self) -> dict:
        return {"color": self.color_hex, "order": self.order}

    def set_payload(self, d: dict) -> None:
        self.color_hex, self.order = d["color"], d["order"]


class CatalogItem(LibraryEntry):
    """Bloco do catálogo: medidas padrão e SÍMBOLO paramétrico em planta (JSON, ADR 004)."""

    KIND = "items"
    category = models.CharField("categoria", max_length=80)
    discipline = models.CharField("disciplina", max_length=20, choices=DISCIPLINES)
    default_w_mm = models.PositiveIntegerField("largura padrão (mm)")
    default_d_mm = models.PositiveIntegerField("profundidade padrão (mm)")
    default_h_mm = models.PositiveIntegerField("altura padrão (mm)", null=True, blank=True)
    min_w_mm = models.PositiveIntegerField("largura mínima (mm)")
    min_d_mm = models.PositiveIntegerField("profundidade mínima (mm)")
    joinery = models.BooleanField("detalhável (marcenaria)", default=False)
    joinery_type = models.SlugField("tipo de móvel", max_length=80, blank=True)
    underlay = models.BooleanField("por baixo dos outros (tapete)", default=False)
    ref_price_cents = models.PositiveBigIntegerField(
        "preço de referência (centavos)", null=True, blank=True
    )
    symbol = models.JSONField("símbolo em planta")

    class Meta(LibraryEntry.Meta):
        verbose_name = "item do catálogo"
        verbose_name_plural = "catálogo de itens"
        ordering = ["category", "name"]

    def payload(self) -> dict:
        size = {"w": self.default_w_mm, "d": self.default_d_mm}
        _opt(size, "h", self.default_h_mm)
        out = {
            "category": self.category,
            "discipline": self.discipline,
            "defaultSize": size,
            "minSize": {"w": self.min_w_mm, "d": self.min_d_mm},
            "symbol": self.symbol,
        }
        if self.joinery:
            out["joinery"] = True
        if self.underlay:
            out["underlay"] = True
        _opt(out, "joineryType", self.joinery_type)
        _opt(out, "refPriceCents", self.ref_price_cents)
        return out

    def set_payload(self, d: dict) -> None:
        self.category = d["category"]
        self.discipline = d["discipline"]
        self.default_w_mm = d["defaultSize"]["w"]
        self.default_d_mm = d["defaultSize"]["d"]
        self.default_h_mm = d["defaultSize"].get("h")
        self.min_w_mm = d["minSize"]["w"]
        self.min_d_mm = d["minSize"]["d"]
        self.joinery = bool(d.get("joinery"))
        self.joinery_type = d.get("joineryType", "")
        self.underlay = bool(d.get("underlay"))
        self.ref_price_cents = d.get("refPriceCents")
        self.symbol = d["symbol"]


class Material(LibraryEntry):
    """Chapa de MDF (liso, madeirado…), com fabricante, linha e textura."""

    KIND = "materials"
    kind = models.CharField(
        "tipo", max_length=20, choices=[("liso", "liso"), ("madeirado", "madeirado")]
    )
    color_hex = models.CharField("cor", max_length=7)
    manufacturer = models.CharField("fabricante", max_length=120, blank=True)
    line = models.CharField("linha", max_length=120, blank=True)
    code = models.CharField("código", max_length=60, blank=True)
    thicknesses_mm = ArrayField(models.PositiveIntegerField(), default=list, blank=True)
    sheet_length_mm = models.PositiveIntegerField("chapa: comprimento (mm)", null=True, blank=True)
    sheet_width_mm = models.PositiveIntegerField("chapa: largura (mm)", null=True, blank=True)
    texture = models.ForeignKey(
        "assets.Asset", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta(LibraryEntry.Meta):
        verbose_name = "MDF / material"
        verbose_name_plural = "MDF / materiais"

    def payload(self) -> dict:
        out = {"kind": self.kind, "hex": self.color_hex}
        _opt(out, "manufacturer", self.manufacturer)
        _opt(out, "line", self.line)
        _opt(out, "code", self.code)
        _opt(out, "thicknessesMm", list(self.thicknesses_mm))
        if self.sheet_length_mm and self.sheet_width_mm:
            out["sheet"] = {"lengthMm": self.sheet_length_mm, "widthMm": self.sheet_width_mm}
        return out

    def set_payload(self, d: dict) -> None:
        self.kind, self.color_hex = d["kind"], d["hex"]
        self.manufacturer = d.get("manufacturer", "")
        self.line = d.get("line", "")
        self.code = d.get("code", "")
        self.thicknesses_mm = d.get("thicknessesMm", [])
        sheet = d.get("sheet") or {}
        self.sheet_length_mm = sheet.get("lengthMm")
        self.sheet_width_mm = sheet.get("widthMm")


class FloorFinish(LibraryEntry):
    """Revestimento de piso: peça, junta, paginação, perda."""

    KIND = "floors"
    material = models.CharField(
        "material",
        max_length=20,
        choices=[
            (m, m)
            for m in [
                "porcelanato",
                "ceramica",
                "madeira",
                "vinilico",
                "laminado",
                "pedra",
                "cimento",
                "carpete",
            ]
        ],
    )
    piece_a_mm = models.PositiveIntegerField("peça: comprimento (mm)")
    piece_b_mm = models.PositiveIntegerField("peça: largura (mm)")
    joint_mm = models.FloatField("junta (mm)")
    pattern = models.CharField(
        "paginação",
        max_length=10,
        choices=[("grid", "grade"), ("half", "amarração 1/2"), ("third", "amarração 1/3")],
    )
    waste_pct = models.FloatField("perda (%)")
    color_hex = models.CharField("cor", max_length=7)
    manufacturer = models.CharField("fabricante", max_length=120, blank=True)
    code = models.CharField("código", max_length=60, blank=True)
    price_per_m2_cents = models.PositiveBigIntegerField(
        "preço por m² (centavos)", null=True, blank=True
    )

    class Meta(LibraryEntry.Meta):
        verbose_name = "revestimento de piso"
        verbose_name_plural = "revestimentos de piso"

    def payload(self) -> dict:
        out = {
            "material": self.material,
            "pieceAMm": self.piece_a_mm,
            "pieceBMm": self.piece_b_mm,
            "jointMm": self.joint_mm,
            "pattern": self.pattern,
            "wastePct": self.waste_pct,
            "color": self.color_hex,
        }
        _opt(out, "manufacturer", self.manufacturer)
        _opt(out, "code", self.code)
        _opt(out, "pricePerM2Cents", self.price_per_m2_cents)
        return out

    def set_payload(self, d: dict) -> None:
        self.material = d["material"]
        self.piece_a_mm, self.piece_b_mm = d["pieceAMm"], d["pieceBMm"]
        self.joint_mm, self.pattern = d["jointMm"], d["pattern"]
        self.waste_pct, self.color_hex = d["wastePct"], d["color"]
        self.manufacturer = d.get("manufacturer", "")
        self.code = d.get("code", "")
        self.price_per_m2_cents = d.get("pricePerM2Cents")


class Handle(LibraryEntry):
    KIND = "handles"
    kind = models.CharField("tipo", max_length=10, choices=HANDLE_KINDS)
    manufacturer = models.CharField("fabricante", max_length=120, blank=True)
    code = models.CharField("código", max_length=60, blank=True)
    length_mm = models.PositiveIntegerField("comprimento/diâmetro (mm)", null=True, blank=True)
    finish = models.CharField("acabamento", max_length=80, blank=True)
    detail = models.JSONField(
        "desenho do detalhe ampliado", default=dict, blank=True, help_text="Fase 8."
    )

    class Meta(LibraryEntry.Meta):
        verbose_name = "puxador"
        verbose_name_plural = "puxadores"

    def payload(self) -> dict:
        out = {"kind": self.kind}
        _opt(out, "manufacturer", self.manufacturer)
        _opt(out, "code", self.code)
        _opt(out, "lengthMm", self.length_mm)
        _opt(out, "finish", self.finish)
        return out

    def set_payload(self, d: dict) -> None:
        self.kind = d["kind"]
        self.manufacturer = d.get("manufacturer", "")
        self.code = d.get("code", "")
        self.length_mm = d.get("lengthMm")
        self.finish = d.get("finish", "")


class Hardware(LibraryEntry):
    KIND = "hardware"
    kind = models.CharField(
        "tipo",
        max_length=20,
        choices=[
            ("dobradica", "dobradiça"),
            ("corredica", "corrediça"),
            ("fecho-toque", "fecho toque"),
            ("articulador", "articulador"),
            ("cesto", "cesto"),
            ("outro", "outro"),
        ],
    )
    manufacturer = models.CharField("fabricante", max_length=120, blank=True)
    code = models.CharField("código", max_length=60, blank=True)
    notes = models.TextField("observações", blank=True)

    class Meta(LibraryEntry.Meta):
        verbose_name = "ferragem"
        verbose_name_plural = "ferragens"

    def payload(self) -> dict:
        out = {"kind": self.kind}
        _opt(out, "manufacturer", self.manufacturer)
        _opt(out, "code", self.code)
        _opt(out, "notes", self.notes)
        return out

    def set_payload(self, d: dict) -> None:
        self.kind = d["kind"]
        self.manufacturer = d.get("manufacturer", "")
        self.code = d.get("code", "")
        self.notes = d.get("notes", "")


class JoineryType(LibraryEntry):
    """Tipo de móvel (rack, roupeiro…): padrões do assistente de detalhamento."""

    KIND = "joinery-types"
    base_kind = models.CharField("base", max_length=10, choices=BASE_KINDS)
    base_height_mm = models.PositiveIntegerField("altura da base (mm)")
    handle = models.CharField("puxador", max_length=10, choices=HANDLE_KINDS)
    module_width_mm = models.PositiveIntegerField("largura alvo do módulo (mm)")
    front = models.CharField("frente", max_length=10, choices=FRONT_KINDS)
    shelves = models.PositiveSmallIntegerField("prateleiras", default=1)

    class Meta(LibraryEntry.Meta):
        verbose_name = "tipo de móvel"
        verbose_name_plural = "tipos de móvel"

    def payload(self) -> dict:
        return {
            "base": {"kind": self.base_kind, "heightMm": self.base_height_mm},
            "handle": self.handle,
            "moduleWidthMm": self.module_width_mm,
            "front": self.front,
            "shelves": self.shelves,
        }

    def set_payload(self, d: dict) -> None:
        self.base_kind = d["base"]["kind"]
        self.base_height_mm = d["base"]["heightMm"]
        self.handle, self.module_width_mm = d["handle"], d["moduleWidthMm"]
        self.front, self.shelves = d["front"], d["shelves"]


class JoineryPreset(LibraryEntry):
    """Modelo pronto: módulos em frações da largura (o núcleo resolve para o L x P x A)."""

    KIND = "presets"
    joinery_type = models.SlugField("tipo de móvel", max_length=80)
    base_kind = models.CharField("base", max_length=10, choices=BASE_KINDS)
    base_height_mm = models.PositiveIntegerField("altura da base (mm)")
    handle = models.CharField("puxador", max_length=10, choices=HANDLE_KINDS)
    modules = models.JSONField("módulos")

    class Meta(LibraryEntry.Meta):
        verbose_name = "modelo pronto de marcenaria"
        verbose_name_plural = "modelos prontos de marcenaria"

    def payload(self) -> dict:
        return {
            "joineryType": self.joinery_type,
            "base": {"kind": self.base_kind, "heightMm": self.base_height_mm},
            "handle": self.handle,
            "modules": self.modules,
        }

    def set_payload(self, d: dict) -> None:
        self.joinery_type = d["joineryType"]
        self.base_kind = d["base"]["kind"]
        self.base_height_mm = d["base"]["heightMm"]
        self.handle, self.modules = d["handle"], d["modules"]


class RuleProfile(LibraryEntry):
    """Regras de marcenaria (espessuras, folgas, chapa, dobradiças…). Ver PLANO 4.6."""

    KIND = "rules"
    profile = models.JSONField("regras")

    class Meta(LibraryEntry.Meta):
        verbose_name = "perfil de regras de marcenaria"
        verbose_name_plural = "perfis de regras de marcenaria"

    def payload(self) -> dict:
        return dict(self.profile)

    def set_payload(self, d: dict) -> None:
        self.profile = {k: v for k, v in d.items() if k not in {"id", "version", "name"}}


class DetailBlock(LibraryEntry):
    """Detalhe técnico reutilizável (encontro de tampo, cava, LED…). Inserível na Fase 8."""

    KIND = "details"
    category = models.CharField("categoria", max_length=80, blank=True)
    size_w_mm = models.PositiveIntegerField("largura de referência (mm)")
    size_d_mm = models.PositiveIntegerField("altura de referência (mm)")
    symbol = models.JSONField("desenho")
    text = models.TextField("texto padrão", blank=True)

    class Meta(LibraryEntry.Meta):
        verbose_name = "detalhe"
        verbose_name_plural = "banco de detalhes"

    def payload(self) -> dict:
        out = {
            "category": self.category,
            "sizeMm": {"w": self.size_w_mm, "d": self.size_d_mm},
            "symbol": self.symbol,
        }
        _opt(out, "text", self.text)
        return out

    def set_payload(self, d: dict) -> None:
        self.category = d["category"]
        self.size_w_mm, self.size_d_mm = d["sizeMm"]["w"], d["sizeMm"]["d"]
        self.symbol, self.text = d["symbol"], d.get("text", "")


class SheetTemplate(LibraryEntry):
    KIND = "sheet-templates"
    paper = models.CharField(
        "folha", max_length=2, choices=[(p, p) for p in ["A4", "A3", "A2", "A1"]]
    )
    orientation = models.CharField(
        "orientação", max_length=10, choices=[("landscape", "paisagem"), ("portrait", "retrato")]
    )
    margin_mm = models.PositiveIntegerField("margem (mm)", default=10)
    notes = ArrayField(models.CharField(max_length=300), default=list, blank=True)

    class Meta(LibraryEntry.Meta):
        verbose_name = "modelo de folha"
        verbose_name_plural = "modelos de folha"

    def payload(self) -> dict:
        return {
            "paper": self.paper,
            "orientation": self.orientation,
            "marginMm": self.margin_mm,
            "notes": list(self.notes),
        }

    def set_payload(self, d: dict) -> None:
        self.paper, self.orientation = d["paper"], d["orientation"]
        self.margin_mm, self.notes = d["marginMm"], d["notes"]


class SpecTemplate(LibraryEntry):
    KIND = "spec-templates"
    category = models.CharField("categoria", max_length=80, blank=True)
    text = models.TextField("texto")

    class Meta(LibraryEntry.Meta):
        verbose_name = "texto padrão"
        verbose_name_plural = "textos padrão"

    def payload(self) -> dict:
        return {"category": self.category, "text": self.text}

    def set_payload(self, d: dict) -> None:
        self.category, self.text = d["category"], d["text"]


LIBRARY_MODELS: dict[str, type[LibraryEntry]] = {
    m.KIND: m
    for m in [
        Discipline,
        CatalogItem,
        Material,
        FloorFinish,
        Handle,
        Hardware,
        JoineryType,
        JoineryPreset,
        RuleProfile,
        DetailBlock,
        SheetTemplate,
        SpecTemplate,
    ]
}
