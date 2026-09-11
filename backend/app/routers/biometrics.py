from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.biometrics import (
    DEFAULT_GESTURE,
    FACE_SIMILARITY_THRESHOLD,
    GESTURE_IDS,
    REQUIRED_GESTURE_FRAMES,
    BiometricError,
    best_similarity,
    count_consecutive_gesture,
    decode_image,
    detect_gesture,
    extract_embedding,
)
from app.crypto import decrypt, encrypt
from app.db import get_db
from app.deps import VaultKey
from app.models import BiometricProfile, GestureProfile
from app.schemas import (
    BiometricStatusOut,
    EnrollFaceIn,
    EnrollGestureIn,
    MessageOut,
    SecurityStatusOut,
    UnlockOut,
    VerifyFaceIn,
    VerifyGestureIn,
)
from app.session import vault_session

router = APIRouter(prefix="/biometrics", tags=["biometrics"])


def get_profile(db: Session) -> BiometricProfile | None:
    return db.scalars(select(BiometricProfile).limit(1)).first()


def get_gesture_profile(db: Session) -> GestureProfile | None:
    return db.scalars(select(GestureProfile).limit(1)).first()


def resolve_gesture(db: Session, key: bytes) -> str:
    profile = get_gesture_profile(db)
    if profile is None:
        return DEFAULT_GESTURE
    return decrypt(key, profile.gesture_nonce, profile.gesture_ciphertext)


@router.get("/status", response_model=BiometricStatusOut)
def read_status(db: Session = Depends(get_db)) -> BiometricStatusOut:
    profile = get_profile(db)
    return BiometricStatusOut(
        face_enrolled=profile is not None,
        sample_count=profile.sample_count if profile else 0,
    )


@router.get("/security", response_model=SecurityStatusOut)
def read_security(key: VaultKey, db: Session = Depends(get_db)) -> SecurityStatusOut:
    profile = get_profile(db)
    return SecurityStatusOut(
        face_enrolled=profile is not None,
        sample_count=profile.sample_count if profile else 0,
        gesture_enrolled=get_gesture_profile(db) is not None,
    )


@router.post("/enroll-face", response_model=MessageOut, status_code=201)
def enroll_face(
    payload: EnrollFaceIn,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> MessageOut:
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

    profile = get_profile(db)

    if profile is None:
        profile = BiometricProfile(
            embeddings_nonce=nonce,
            embeddings_ciphertext=ciphertext,
            sample_count=len(embeddings),
        )
        db.add(profile)
    else:
        profile.embeddings_nonce = nonce
        profile.embeddings_ciphertext = ciphertext
        profile.sample_count = len(embeddings)

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


@router.post("/enroll-gesture", response_model=MessageOut, status_code=201)
def enroll_gesture(
    payload: EnrollGestureIn,
    key: VaultKey,
    db: Session = Depends(get_db),
) -> MessageOut:
    if payload.gesture_id not in GESTURE_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gesto desconhecido",
        )

    try:
        images = [decode_image(frame) for frame in payload.frames]
    except BiometricError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    streak = count_consecutive_gesture(images, payload.gesture_id)

    if streak < REQUIRED_GESTURE_FRAMES:
        detected = [detect_gesture(image) for image in images]
        found = {value for value in detected if value}
        hint = (
            f" Detectamos: {', '.join(sorted(found))}."
            if found
            else " Nenhuma mao detectada."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O gesto nao ficou estavel o suficiente.{hint}",
        )

    nonce, ciphertext = encrypt(key, payload.gesture_id)
    profile = get_gesture_profile(db)

    if profile is None:
        profile = GestureProfile(
            gesture_nonce=nonce,
            gesture_ciphertext=ciphertext,
        )
        db.add(profile)
    else:
        profile.gesture_nonce = nonce
        profile.gesture_ciphertext = ciphertext

    db.commit()

    return MessageOut(message="Gesto cadastrado com sucesso")


@router.delete("/gesture", status_code=status.HTTP_204_NO_CONTENT)
def delete_gesture(key: VaultKey, db: Session = Depends(get_db)) -> None:
    profile = get_gesture_profile(db)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum gesto cadastrado",
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
def verify_gesture(
    payload: VerifyGestureIn, db: Session = Depends(get_db)
) -> UnlockOut:
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

    expected = resolve_gesture(db, challenge.key)
    streak = count_consecutive_gesture(images, expected)

    if streak < REQUIRED_GESTURE_FRAMES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verificação não reconhecida",
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