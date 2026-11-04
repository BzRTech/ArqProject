"""Mensagens de erro do jsonschema em português (o usuário vê na importação e no save)."""

from jsonschema.exceptions import ValidationError

PATTERN_HINTS = {
    "^#[0-9a-fA-F]{6}$": "cor no formato #rrggbb",
    "^[a-z0-9][a-z0-9-]*$": "use letras minúsculas, números e hífen",
}


def message_pt(e: ValidationError) -> str:
    v, arg, inst = e.validator, e.validator_value, e.instance
    if v == "required":
        missing = [k for k in arg if not isinstance(inst, dict) or k not in inst]
        return f"campo obrigatório: {', '.join(missing)}"
    if v == "pattern":
        return f"{inst!r}: {PATTERN_HINTS.get(arg, 'formato inválido')}"
    if v in ("enum", "const"):
        options = arg if v == "enum" else [arg]
        return f"{inst!r} não é válido; use: {', '.join(map(str, options))}"
    if v == "type":
        names = {
            "integer": "número inteiro",
            "number": "número",
            "string": "texto",
            "boolean": "sim/não",
            "array": "lista",
            "object": "objeto",
            "null": "vazio",
        }
        want = arg if isinstance(arg, list) else [arg]
        return f"{inst!r}: deveria ser {' ou '.join(names.get(t, t) for t in want)}"
    if v == "minimum":
        return f"{inst!r}: mínimo {arg}"
    if v == "exclusiveMinimum":
        return f"{inst!r}: deve ser maior que {arg}"
    if v in ("maximum", "exclusiveMaximum"):
        return f"{inst!r}: máximo {arg}"
    if v == "minLength":
        return "não pode ficar vazio" if arg == 1 else f"mínimo de {arg} caracteres"
    if v == "maxLength":
        return f"máximo de {arg} caracteres"
    if v == "minItems":
        return f"precisa de pelo menos {arg} item(ns)"
    if v in ("anyOf", "oneOf"):
        return "valor em formato inválido"
    return e.message
