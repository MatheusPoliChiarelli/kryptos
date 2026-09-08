from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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


class CredentialCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=1024)
    category: str | None = Field(default=None, max_length=60)
    notes: str | None = Field(default=None, max_length=5000)


class CredentialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = Field(default=None, min_length=1, max_length=255)
    password: str | None = Field(default=None, min_length=1, max_length=1024)
    category: str | None = Field(default=None, max_length=60)
    notes: str | None = Field(default=None, max_length=5000)


class CredentialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str | None
    has_notes: bool
    created_at: datetime
    updated_at: datetime


class CredentialSecretOut(BaseModel):
    id: int
    username: str
    password: str
    notes: str | None = None