from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class VaultStatusOut(BaseModel):
    initialized: bool
    unlocked: bool
    expires_at: datetime | None = None


class InitVaultIn(BaseModel):
    master_password: str = Field(min_length=12, max_length=256)


class UnlockIn(BaseModel):
    master_password: str = Field(min_length=1, max_length=256)


class UnlockOut(BaseModel):
    token: str
    expires_at: datetime


class MessageOut(BaseModel):
    message: str