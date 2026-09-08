from __future__ import annotations

import secrets
import threading
from datetime import datetime, timedelta, timezone

from app.config import settings

TOKEN_BYTES = 32


class VaultSession:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._token: str | None = None
        self._key: bytes | None = None
        self._expires_at: datetime | None = None

    @property
    def timeout(self) -> timedelta:
        return timedelta(minutes=settings.session_timeout_minutes)

    def unlock(self, key: bytes) -> str:
        with self._lock:
            self._token = secrets.token_urlsafe(TOKEN_BYTES)
            self._key = key
            self._expires_at = datetime.now(timezone.utc) + self.timeout
            return self._token

    def lock(self) -> None:
        with self._lock:
            self._token = None
            self._key = None
            self._expires_at = None

    def resolve(self, token: str | None) -> bytes | None:
        with self._lock:
            if self._token is None or self._key is None or self._expires_at is None:
                return None

            if datetime.now(timezone.utc) >= self._expires_at:
                self._token = None
                self._key = None
                self._expires_at = None
                return None

            if not token or not secrets.compare_digest(token, self._token):
                return None

            self._expires_at = datetime.now(timezone.utc) + self.timeout
            return self._key

    def status(self) -> tuple[bool, datetime | None]:
        with self._lock:
            if self._expires_at is None:
                return False, None
            if datetime.now(timezone.utc) >= self._expires_at:
                return False, None
            return True, self._expires_at


vault_session = VaultSession()