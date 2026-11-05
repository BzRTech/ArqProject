import copy

import pytest

from apps.projects.validation import document_errors
from tests.conftest import make_document


def perspective_document():
    doc = make_document()
    doc["environments"][0]["perspectives"] = [
        {
            "id": "view-1",
            "title": "Sala",
            "assetId": "asset-1",
            "widthPx": 1600,
            "heightPx": 900,
        }
    ]
    return doc


def test_document_with_perspective_is_valid():
    assert document_errors(perspective_document()) == []


@pytest.mark.parametrize(
    "field,value", [("widthPx", 0), ("heightPx", -1), ("title", ""), ("assetId", "")]
)
def test_invalid_perspective_is_rejected(field, value):
    doc = copy.deepcopy(perspective_document())
    doc["environments"][0]["perspectives"][0][field] = value
    assert any(field in error for error in document_errors(doc))
