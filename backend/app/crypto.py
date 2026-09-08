from __future__ import annotations

import os
from dataclasses import dataclass

from argon2.low_level import Type, hash_secret_raw
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY_SIZE = 32
SALT_SIZE = 16
NONCE_SIZE = 12

DEFAULT_TIME_COST = 3
DEFAULT_MEMORY_COST = 131072
DEFAULT_PARALLELISM = 4

VERIFIER_PLAINTEXT = b"kryptos-verifier-v1"


@dataclass(frozen=True)
class KdfParams:
    time_cost: int = DEFAULT_TIME_COST
    memory_cost: int = DEFAULT_MEMORY_COST
    parallelism: int = DEFAULT_PARALLELISM


def generate_salt() -> bytes:
    return os.urandom(SALT_SIZE)


def derive_key(master_password: str, salt: bytes, params: KdfParams) -> bytes:
    return hash_secret_raw(
        secret=master_password.encode("utf-8"),
        salt=salt,
        time_cost=params.time_cost,
        memory_cost=params.memory_cost,
        parallelism=params.parallelism,
        hash_len=KEY_SIZE,
        type=Type.ID,
    )


def encrypt(key: bytes, plaintext: str) -> tuple[bytes, bytes]:
    nonce = os.urandom(NONCE_SIZE)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce, ciphertext


def decrypt(key: bytes, nonce: bytes, ciphertext: bytes) -> str:
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")


def build_verifier(key: bytes) -> tuple[bytes, bytes]:
    nonce = os.urandom(NONCE_SIZE)
    ciphertext = AESGCM(key).encrypt(nonce, VERIFIER_PLAINTEXT, None)
    return nonce, ciphertext


def check_verifier(key: bytes, nonce: bytes, ciphertext: bytes) -> bool:
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, None) == VERIFIER_PLAINTEXT
    except InvalidTag:
        return False