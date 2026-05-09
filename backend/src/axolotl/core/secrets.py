"""Fernet-based encryption for at-rest secrets (third-party API tokens, etc.).

Uses the symmetric ``cryptography.Fernet`` primitive (AES-128 CBC + HMAC-SHA256)
with the application's ``FERNET_KEY`` env var as the key. Tokens stored
through these helpers are encrypted at rest and never logged in plaintext.

Usage::

    cipher = encrypt_secret("hf_xxx")        # str -> str (urlsafe-b64)
    plain = decrypt_secret(cipher)           # str -> str
"""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from axolotl.config import get_settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    """Return a process-wide Fernet instance keyed off ``FERNET_KEY``."""
    settings = get_settings()
    return Fernet(settings.fernet_key.encode("utf-8"))


def encrypt_secret(plain: str) -> str:
    """Encrypt a secret. Returns the urlsafe-base64 ciphertext as a string."""
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_secret(cipher: str) -> str:
    """Decrypt a secret previously encrypted with :func:`encrypt_secret`.

    Raises :class:`cryptography.fernet.InvalidToken` if the ciphertext was
    produced with a different key (i.e. ``FERNET_KEY`` rotated without
    re-encrypting the rows).
    """
    return _fernet().decrypt(cipher.encode("utf-8")).decode("utf-8")


__all__ = ["InvalidToken", "decrypt_secret", "encrypt_secret"]
