"""Frontera con el módulo de IA (responsable: Daniel).

Para conectar la IA real: crear una clase con el mismo método `extract`
y cambiar `get_extractor()`. El resto del back no se toca."""
import re
from dataclasses import dataclass, field
from typing import Optional, Protocol


@dataclass
class ExtractionResult:
    campos: dict = field(default_factory=dict)         # producto, precio_declarado, unidad, horario...
    ambiguos: list[str] = field(default_factory=list)  # campos que la IA no está segura de haber leído bien


class OfferExtractor(Protocol):
    async def extract(self, texto: Optional[str], imagen: Optional[bytes], mime: Optional[str]) -> ExtractionResult: ...


_PRICE = re.compile(r"\$\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:pesos|mxn)\b", re.I)
_UNIT = re.compile(r"\b(kg|kilo|litro|pieza|docena|paquete|orden|taza)s?\b", re.I)
_HOURS = re.compile(
    r"\d{1,2}(?::\d{2})?\s*(?:am|pm|h|hrs)?\s*(?:a|-|–|hasta)\s*(?:las\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm|h|hrs)?",
    re.I,
)
_FILLER = re.compile(r"^(hoy|vendo|tengo|hay|ofrezco|se vende|a la venta)\s+", re.I)


class MockExtractor:
    """Extracción con regex, solo para desarrollar. No lee imágenes."""

    async def extract(self, texto, imagen, mime) -> ExtractionResult:
        res = ExtractionResult()
        if not texto:
            return res  # con solo foto, el mock no propone nada: todo queda como faltante
        prices = _PRICE.findall(texto)
        if prices:
            raw = (prices[0][0] or prices[0][1]).replace(",", ".")
            res.campos["precio_declarado"] = float(raw)
            if len(prices) > 1:
                res.ambiguos.append("precio_declarado")
        if (u := _UNIT.search(texto)):
            res.campos["unidad"] = u.group(1).lower()
        if (h := _HOURS.search(texto)):
            res.campos["horario"] = h.group(0).strip()
        head = _PRICE.split(texto)[0] if prices else texto
        head = _FILLER.sub("", head.strip(" ,.:;-"))
        words = head.split()[:6]
        if words:
            res.campos["producto"] = " ".join(words)
            if not prices:
                res.ambiguos.append("producto")
        return res


def get_extractor() -> OfferExtractor:
    return MockExtractor()
