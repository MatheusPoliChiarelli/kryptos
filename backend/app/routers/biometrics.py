from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.biometrics import (
    REQUIRED_OK_FRAMES,
    FACE_SIMILARITY_THRESHOLD,
    BiometricError,
    best_similarity,
    count_consecutive_ok,
    decode_image,
    extract_embedding,
)
from app.crypto import decrypt, encrypt
from app.db import get_db
from app.deps import VaultKey
from app.models import BiometricProfile
from app.schemas import (
    BiometricStatusOut,
    EnrollFaceIn,
    MessageOut,
    UnlockOut,
    VerifyFaceIn,
    VerifyGestureIn,
)
from app.session import vault_session

router = APIRouter(prefix="/biometrics", tags=["biometrics"])


def get_profile(db: Session) -> BiometricProfile | None:
    return db.scalars(select(BiometricProfile).limit(1)).first()


@router.get("/status", response_model=BiometricStatusOut)
def read_status(db: Session = Depends(get_db)) -> BiometricStatusOut:
    profile = get_profile(db)
    return BiometricStatusOut(
        face_enrolled=profile is not None,
        sample_count=profile.sample_count if profile else 0,
    )


@router.post("/enroll-face", response_model=MessageOut, status_code=201)
def enroll_face(
    payload: EnrollFaceIn,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> MessageOut:
    if get_profile(db) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um rosto cadastrado",
        )

    embeddings: list[list[float]] = []

    for index, data_url in enumerate(payload.images, start=1):
        try:
            image = decode_image(data_url)
            embedding = extract_embedding(image)
        except BiometricError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Captura {index}: {exc}",
            ) from exc
        embeddings.append(embedding.tolist())

    blob = json.dumps(embeddings)
    nonce, ciphertext = encrypt(key, blob)

    profile = BiometricProfile(
        embeddings_nonce=nonce,
        embeddings_ciphertext=ciphertext,
        sample_count=len(embeddings),
    )
    db.add(profile)
    db.commit()

    return MessageOut(message="Rosto cadastrado com sucesso")


@router.delete("/face", status_code=status.HTTP_204_NO_CONTENT)
def delete_face(key: VaultKey, db: Session = Depends(get_db)) -> None:
    profile = get_profile(db)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum rosto cadastrado",
        )
    db.delete(profile)
    db.commit()


@router.post("/verify-face", response_model=MessageOut)
def verify_face(payload: VerifyFaceIn, db: Session = Depends(get_db)) -> MessageOut:
    challenge = vault_session.get_challenge(payload.challenge_id)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Desafio inválido ou expirado",
        )

    profile = get_profile(db)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum rosto cadastrado",
        )

    try:
        image = decode_image(payload.image)
        candidate = extract_embedding(image)
    except BiometricError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    stored = json.loads(
        decrypt(challenge.key, profile.embeddings_nonce, profile.embeddings_ciphertext)
    )

    score = best_similarity(candidate, stored)

    if score < FACE_SIMILARITY_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Rosto não reconhecido",
        )

    vault_session.mark_face_verified(payload.challenge_id)
    return MessageOut(message="Rosto verificado")


@router.post("/verify-gesture", response_model=UnlockOut)
def verify_gesture(payload: VerifyGestureIn) -> UnlockOut:
    challenge = vault_session.get_challenge(payload.challenge_id)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Desafio inválido ou expirado",
        )

    if not challenge.face_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verifique o rosto antes do gesto",
        )

    try:
        images = [decode_image(frame) for frame in payload.frames]
    except BiometricError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    streak = count_consecutive_ok(images)

    if streak < REQUIRED_OK_FRAMES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gesto não reconhecido, mantenha o sinal de OK parado",
        )

    key = vault_session.consume_challenge(payload.challenge_id)
    if key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Desafio inválido ou expirado",
        )

    token = vault_session.unlock(key)
    _, expires_at = vault_session.status()

    return UnlockOut(token=token, expires_at=expires_at)