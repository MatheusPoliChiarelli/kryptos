from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crypto import decrypt, encrypt
from app.db import get_db
from app.deps import VaultKey
from app.models import Credential
from app.schemas import (
    CredentialCreate,
    CredentialOut,
    CredentialSecretOut,
    CredentialUpdate,
)

router = APIRouter(prefix="/credentials", tags=["credentials"])

AUTH_TYPES = ("password", "social")
PROVIDERS = ("google", "github", "apple", "microsoft", "facebook")


def get_or_404(db: Session, credential_id: int) -> Credential:
    credential = db.get(Credential, credential_id)
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credencial não encontrada",
        )
    return credential


def validate_auth(auth_type: str, provider: str | None) -> None:
    if auth_type not in AUTH_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de acesso desconhecido",
        )

    if auth_type == "social" and provider not in PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provedor desconhecido",
        )


@router.get("", response_model=list[CredentialOut])
def list_credentials(
    key: VaultKey,
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, max_length=120),
    category: str | None = Query(default=None, max_length=60),
) -> list[Credential]:
    stmt = select(Credential)

    if search:
        stmt = stmt.where(Credential.title.ilike(f"%{search}%"))

    if category:
        stmt = stmt.where(Credential.category == category)

    stmt = stmt.order_by(Credential.title.asc())
    return list(db.scalars(stmt).all())


@router.get("/categories", response_model=list[str])
def list_categories(key: VaultKey, db: Session = Depends(get_db)) -> list[str]:
    stmt = (
        select(Credential.category)
        .where(Credential.category.is_not(None))
        .distinct()
        .order_by(Credential.category.asc())
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=CredentialOut, status_code=status.HTTP_201_CREATED)
def create_credential(
    payload: CredentialCreate,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> Credential:
    validate_auth(payload.auth_type, payload.provider)

    if payload.auth_type == "password" and not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe a senha",
        )

    if not payload.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o email ou usuário",
        )

    username_nonce, username_ciphertext = encrypt(key, payload.username)

    password_nonce = None
    password_ciphertext = None
    if payload.auth_type == "password" and payload.password:
        password_nonce, password_ciphertext = encrypt(key, payload.password)

    notes_nonce = None
    notes_ciphertext = None
    if payload.notes:
        notes_nonce, notes_ciphertext = encrypt(key, payload.notes)

    credential = Credential(
        title=payload.title,
        category=payload.category,
        auth_type=payload.auth_type,
        provider=payload.provider if payload.auth_type == "social" else None,
        username_nonce=username_nonce,
        username_ciphertext=username_ciphertext,
        password_nonce=password_nonce,
        password_ciphertext=password_ciphertext,
        notes_nonce=notes_nonce,
        notes_ciphertext=notes_ciphertext,
    )

    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


@router.get("/{credential_id}", response_model=CredentialOut)
def read_credential(
    credential_id: int,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> Credential:
    return get_or_404(db, credential_id)


@router.get("/{credential_id}/reveal", response_model=CredentialSecretOut)
def reveal_credential(
    credential_id: int,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> CredentialSecretOut:
    credential = get_or_404(db, credential_id)

    username = None
    if credential.username_nonce and credential.username_ciphertext:
        username = decrypt(
            key, credential.username_nonce, credential.username_ciphertext
        )

    password = None
    if credential.password_nonce and credential.password_ciphertext:
        password = decrypt(
            key, credential.password_nonce, credential.password_ciphertext
        )

    notes = None
    if credential.notes_nonce and credential.notes_ciphertext:
        notes = decrypt(key, credential.notes_nonce, credential.notes_ciphertext)

    return CredentialSecretOut(
        id=credential.id,
        auth_type=credential.auth_type,
        provider=credential.provider,
        username=username,
        password=password,
        notes=notes,
    )


@router.patch("/{credential_id}", response_model=CredentialOut)
def update_credential(
    credential_id: int,
    payload: CredentialUpdate,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> Credential:
    credential = get_or_404(db, credential_id)
    data = payload.model_dump(exclude_unset=True)

    auth_type = data.get("auth_type", credential.auth_type)
    provider = data.get("provider", credential.provider)
    validate_auth(auth_type, provider)

    if data.get("username"):
        nonce, ciphertext = encrypt(key, data["username"])
        credential.username_nonce = nonce
        credential.username_ciphertext = ciphertext

    if data.get("password"):
        nonce, ciphertext = encrypt(key, data["password"])
        credential.password_nonce = nonce
        credential.password_ciphertext = ciphertext

    if "notes" in data:
        if data["notes"]:
            nonce, ciphertext = encrypt(key, data["notes"])
            credential.notes_nonce = nonce
            credential.notes_ciphertext = ciphertext
        else:
            credential.notes_nonce = None
            credential.notes_ciphertext = None

    for field in ("title", "category"):
        if field in data:
            setattr(credential, field, data[field])

    credential.auth_type = auth_type

    if auth_type == "social":
        credential.provider = provider
        credential.password_nonce = None
        credential.password_ciphertext = None
    else:
        credential.provider = None

    db.commit()
    db.refresh(credential)
    return credential


@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_id: int,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> None:
    credential = get_or_404(db, credential_id)
    db.delete(credential)
    db.commit()