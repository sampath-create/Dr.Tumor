from __future__ import annotations

import base64
import hashlib
import os
from typing import Any, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

ENCRYPTED_TEXT_PREFIX = "encaes::"

_cipher_instance: Optional[Any] = None


def _derive_key(secret: str) -> bytes:
    return hashlib.sha256(secret.encode("utf-8")).digest()


def _build_cipher() -> Optional[Any]:
    configured = (settings.DATA_ENCRYPTION_KEY or "").strip()

    if configured:
        try:
            padded = configured + "=" * (-len(configured) % 4)
            decoded = base64.urlsafe_b64decode(padded.encode("utf-8"))
            key = decoded if len(decoded) == 32 else _derive_key(configured)
        except Exception:
            key = _derive_key(configured)
        return AESGCM(key)

    if settings.SECRET_KEY:
        return AESGCM(_derive_key(settings.SECRET_KEY))

    return None


def get_cipher() -> Optional[Any]:
    global _cipher_instance
    if _cipher_instance is None:
        _cipher_instance = _build_cipher()
    return _cipher_instance


def _encode_blob(blob: bytes) -> str:
    return base64.urlsafe_b64encode(blob).decode("utf-8")


def _decode_blob(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def encrypt_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    if value.startswith(ENCRYPTED_TEXT_PREFIX):
        return value

    cipher = get_cipher()
    if not cipher:
        return value

    nonce = os.urandom(12)
    ciphertext = cipher.encrypt(nonce, value.encode("utf-8"), None)
    return f"{ENCRYPTED_TEXT_PREFIX}{_encode_blob(nonce + ciphertext)}"


def decrypt_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    if not value.startswith(ENCRYPTED_TEXT_PREFIX):
        return value

    cipher = get_cipher()
    if not cipher:
        return value

    encrypted = value[len(ENCRYPTED_TEXT_PREFIX) :]
    try:
        payload = _decode_blob(encrypted)
        nonce, ciphertext = payload[:12], payload[12:]
        return cipher.decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception:
        return value


def encrypt_bytes(payload: bytes) -> tuple[bytes, bool]:
    cipher = get_cipher()
    if not cipher:
        return payload, False
    nonce = os.urandom(12)
    return nonce + cipher.encrypt(nonce, payload, None), True


def decrypt_bytes(payload: bytes) -> bytes:
    cipher = get_cipher()
    if not cipher:
        return payload
    try:
        nonce, ciphertext = payload[:12], payload[12:]
        return cipher.decrypt(nonce, ciphertext, None)
    except Exception:
        return payload
