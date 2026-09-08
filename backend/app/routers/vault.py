from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crypto import (
    KdfParams,
    build_verifier,
    check_verifier,
    derive_key,
    generate_salt,
)
from app.db import get_db
from app.models import VaultMeta
from app.schemas import (
    InitVaultIn,
    MessageOut,
    UnlockIn,
    UnlockOut,
    VaultStatusOut,
)
from app.session import vault_session

router = APIRouter(prefix="/vault", tags=["vault"])


def get_meta(db: Session) -> VaultMeta | None:
    return db.scalars(select(VaultMeta).limit(1)).first()


@router.get("/status", response_model=VaultStatusOut)
def read_status(db: Session = Depends(get_db)) -> VaultStatusOut:
    meta = get_meta(db)
    unlocked, expires_at = vault_session.status()
    return VaultStatusOut(
        initialized=meta is not None,
        unlocked=unlocked,
        expires_at=expires_at,
    )


@router.post("/init", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def init_vault(payload: InitVaultIn, db: Session = Depends(get_db)) -> MessageOut:
    if get_meta(db) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O cofre já foi inicializado",
        )

    params = KdfParams()
    salt = generate_salt()
    key = derive_key(payload.master_password, salt, params)
    verifier_nonce, verifier_ciphertext = build_verifier(key)

    meta = VaultMeta(
        kdf_salt=salt,
        kdf_time_cost=params.time_cost,
        kdf_memory_cost=params.memory_cost,
        kdf_parallelism=params.parallelism,
        verifier_nonce=verifier_nonce,
        verifier_ciphertext=verifier_ciphertext,
    )
    db.add(meta)
    db.commit()

    return MessageOut(message="Cofre criado com sucesso")


@router.post("/unlock", response_model=UnlockOut)
def unlock_vault(payload: UnlockIn, db: Session = Depends(get_db)) -> UnlockOut:
    meta = get_meta(db)
    if meta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O cofre ainda não foi inicializado",
        )

    params = KdfParams(
        time_cost=meta.kdf_time_cost,
        memory_cost=meta.kdf_memory_cost,
        parallelism=meta.kdf_parallelism,
    )
    key = derive_key(payload.master_password, meta.kdf_salt, params)

    if not check_verifier(key, meta.verifier_nonce, meta.verifier_ciphertext):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha mestra incorreta",
        )

    token = vault_session.unlock(key)
    _, expires_at = vault_session.status()

    return UnlockOut(token=token, expires_at=expires_at)


@router.post("/lock", response_model=MessageOut)
def lock_vault() -> MessageOut:
    vault_session.lock()
    return MessageOut(message="Cofre trancado")