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

from app.models import BiometricProfile, VaultMeta
from app.schemas import (
    InitVaultIn,
    MessageOut,
    UnlockIn,
    UnlockOut,
    UnlockPendingOut,
    VaultStatusOut,
)


from app.crypto import (
    KdfParams,
    build_verifier,
    check_verifier,
    decrypt,
    derive_key,
    encrypt,
    generate_salt,
)
from app.models import BiometricProfile, Credential, GestureProfile, VaultMeta
from app.schemas import (
    ChangeMasterPasswordIn,
    InitVaultIn,
    MessageOut,
    UnlockIn,
    UnlockOut,
    UnlockPendingOut,
    VaultStatusOut,
)

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


@router.post("/unlock")
def unlock_vault(payload: UnlockIn, db: Session = Depends(get_db)):
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

    profile = db.scalars(select(BiometricProfile).limit(1)).first()

    if profile is None:
        token = vault_session.unlock(key)
        _, expires_at = vault_session.status()
        return UnlockOut(token=token, expires_at=expires_at)

    challenge_id = vault_session.create_challenge(key)
    return UnlockPendingOut(challenge_id=challenge_id, face_enrolled=True)

@router.post("/lock", response_model=MessageOut)
def lock_vault() -> MessageOut:
    vault_session.lock()
    return MessageOut(message="Cofre trancado")


@router.post("/change-password", response_model=MessageOut)
def change_master_password(
    payload: ChangeMasterPasswordIn,
    db: Session = Depends(get_db),
) -> MessageOut:
    meta = get_meta(db)
    if meta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O cofre ainda não foi inicializado",
        )

    old_params = KdfParams(
        time_cost=meta.kdf_time_cost,
        memory_cost=meta.kdf_memory_cost,
        parallelism=meta.kdf_parallelism,
    )
    old_key = derive_key(payload.current_password, meta.kdf_salt, old_params)

    if not check_verifier(old_key, meta.verifier_nonce, meta.verifier_ciphertext):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha mestra atual incorreta",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da atual",
        )

    credentials = list(db.scalars(select(Credential)).all())
    biometric = db.scalars(select(BiometricProfile).limit(1)).first()
    gesture = db.scalars(select(GestureProfile).limit(1)).first()

    try:
        plain_credentials: list[tuple[Credential, str, str, str | None]] = []
        for credential in credentials:
            username = decrypt(
                old_key, credential.username_nonce, credential.username_ciphertext
            )
            password = decrypt(
                old_key, credential.password_nonce, credential.password_ciphertext
            )
            notes = None
            if credential.notes_nonce and credential.notes_ciphertext:
                notes = decrypt(
                    old_key, credential.notes_nonce, credential.notes_ciphertext
                )
            plain_credentials.append((credential, username, password, notes))

        plain_embeddings = None
        if biometric is not None:
            plain_embeddings = decrypt(
                old_key,
                biometric.embeddings_nonce,
                biometric.embeddings_ciphertext,
            )

        plain_gesture = None
        if gesture is not None:
            plain_gesture = decrypt(
                old_key, gesture.gesture_nonce, gesture.gesture_ciphertext
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao decifrar o cofre. Nenhuma alteração foi feita",
        ) from exc

    new_params = KdfParams()
    new_salt = generate_salt()
    new_key = derive_key(payload.new_password, new_salt, new_params)

    try:
        for credential, username, password, notes in plain_credentials:
            credential.username_nonce, credential.username_ciphertext = encrypt(
                new_key, username
            )
            credential.password_nonce, credential.password_ciphertext = encrypt(
                new_key, password
            )
            if notes is not None:
                credential.notes_nonce, credential.notes_ciphertext = encrypt(
                    new_key, notes
                )

        if biometric is not None and plain_embeddings is not None:
            biometric.embeddings_nonce, biometric.embeddings_ciphertext = encrypt(
                new_key, plain_embeddings
            )

        if gesture is not None and plain_gesture is not None:
            gesture.gesture_nonce, gesture.gesture_ciphertext = encrypt(
                new_key, plain_gesture
            )

        meta.kdf_salt = new_salt
        meta.kdf_time_cost = new_params.time_cost
        meta.kdf_memory_cost = new_params.memory_cost
        meta.kdf_parallelism = new_params.parallelism
        meta.verifier_nonce, meta.verifier_ciphertext = build_verifier(new_key)

        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao recifrar o cofre. Nenhuma alteração foi feita",
        ) from exc

    vault_session.lock()

    return MessageOut(message="Senha mestra alterada. Destranque novamente")