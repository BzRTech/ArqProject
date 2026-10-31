from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from apps.assets.storage import ensure_bucket


def _error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code}}, "HeadBucket")


def test_ensure_bucket_cria_quando_nao_existe():
    client = MagicMock()
    client.head_bucket.side_effect = _error("404")
    assert ensure_bucket(client, "prancheta") is True
    client.create_bucket.assert_called_once_with(Bucket="prancheta")


def test_ensure_bucket_nao_recria():
    client = MagicMock()
    assert ensure_bucket(client, "prancheta") is False
    client.create_bucket.assert_not_called()


def test_ensure_bucket_propaga_outros_erros():
    client = MagicMock()
    client.head_bucket.side_effect = _error("403")
    with pytest.raises(ClientError):
        ensure_bucket(client, "prancheta")
