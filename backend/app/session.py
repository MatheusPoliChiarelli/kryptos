from __future__ import annotations

import secrets
import threading
from datetime import datetime, timedelta, timezone

from app.config import settings

TOKEN_BYTES = 32
CHALLENGE_TTL_SECONDS = 120


class PendingChallenge:
    def __init__(self, key: bytes, expires_at: datetime) -> None:
        self.key = key
        self.expires_at = expires_at
        self.face_verified = False


class VaultSession:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._token: str | None = None
        self._key: bytes | None = None
        self._expires_at: datetime | None = None
        self._challenges: dict[str, PendingChallenge] = {}

    @property
    def timeout(self) -> timedelta:
        return timedelta(minutes=settings.session_timeout_minutes)

    def _purge_challenges(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [cid for cid, c in self._challenges.items() if now >= c.expires_at]
        for cid in expired:
            del self._challenges[cid]

    def create_challenge(self, key: bytes) -> str:
        with self._lock:
            self._purge_challenges()
            challenge_id = secrets.token_urlsafe(TOKEN_BYTES)
            expires = datetime.now(timezone.utc) + timedelta(
                seconds=CHALLENGE_TTL_SECONDS
            )
            self._challenges[challenge_id] = PendingChallenge(key, expires)
            return challenge_id

    def get_challenge(self, challenge_id: str) -> PendingChallenge | None:
        with self._lock:
            self._purge_challenges()
            return self._challenges.get(challenge_id)

    def mark_face_verified(self, challenge_id: str) -> bool:
        with self._lock:
            self._purge_challenges()
            challenge = self._challenges.get(challenge_id)
            if challenge is None:
                return False
            challenge.face_verified = True
            return True

    def consume_challenge(self, challenge_id: str) -> bytes | None:
        with self._lock:
            self._purge_challenges()
            challenge = self._challenges.pop(challenge_id, None)
            if challenge is None or not challenge.face_verified:
                return None
            return challenge.key

    def drop_challenge(self, challenge_id: str) -> None:
        with self._lock:
            self._challenges.pop(challenge_id, None)

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
            self._challenges.clear()

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