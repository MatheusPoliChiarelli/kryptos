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
    auth_type: str = Field(default="password", max_length=20)
    provider: str | None = Field(default=None, max_length=20)
    username: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=1024)
    category: str | None = Field(default=None, max_length=60)
    notes: str | None = Field(default=None, max_length=5000)


class CredentialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    auth_type: str | None = Field(default=None, max_length=20)
    provider: str | None = Field(default=None, max_length=20)
    username: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=1024)
    category: str | None = Field(default=None, max_length=60)
    notes: str | None = Field(default=None, max_length=5000)


class CredentialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str | None
    auth_type: str
    provider: str | None
    has_notes: bool
    created_at: datetime
    updated_at: datetime


class CredentialSecretOut(BaseModel):
    id: int
    auth_type: str
    provider: str | None = None
    username: str | None = None
    password: str | None = None
    notes: str | None = None

class UnlockPendingOut(BaseModel):
    status: str = "biometrics_required"
    challenge_id: str
    face_enrolled: bool


class VerifyFaceIn(BaseModel):
    challenge_id: str
    image: str = Field(min_length=1)


class VerifyGestureIn(BaseModel):
    challenge_id: str
    frames: list[str] = Field(min_length=1, max_length=60)


class EnrollFaceIn(BaseModel):
    images: list[str] = Field(min_length=3, max_length=5)


class BiometricStatusOut(BaseModel):
    face_enrolled: bool
    sample_count: int


class ChangeMasterPasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)


class GestureStatusOut(BaseModel):
    gesture_enrolled: bool


class EnrollGestureIn(BaseModel):
    gesture_id: str = Field(min_length=1, max_length=32)
    frames: list[str] = Field(min_length=1, max_length=60)


class SecurityStatusOut(BaseModel):
    face_enrolled: bool
    sample_count: int
    gesture_enrolled: bool