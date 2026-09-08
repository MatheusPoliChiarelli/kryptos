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


def get_or_404(db: Session, credential_id: int) -> Credential:
    credential = db.get(Credential, credential_id)
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credencial não encontrada",
        )
    return credential


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
    username_nonce, username_ciphertext = encrypt(key, payload.username)
    password_nonce, password_ciphertext = encrypt(key, payload.password)

    notes_nonce = None
    notes_ciphertext = None
    if payload.notes:
        notes_nonce, notes_ciphertext = encrypt(key, payload.notes)

    credential = Credential(
        title=payload.title,
        category=payload.category,
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

    username = decrypt(key, credential.username_nonce, credential.username_ciphertext)
    password = decrypt(key, credential.password_nonce, credential.password_ciphertext)

    notes = None
    if credential.notes_nonce and credential.notes_ciphertext:
        notes = decrypt(key, credential.notes_nonce, credential.notes_ciphertext)

    return CredentialSecretOut(
        id=credential.id,
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