from __future__ import annotations

import base64
import binascii
import threading
from functools import lru_cache
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

BASE_DIR = Path(__file__).resolve().parent.parent
HAND_MODEL_PATH = BASE_DIR / "hand_landmarker.task"

FACE_SIMILARITY_THRESHOLD = 0.55
PINCH_MAX = 0.30
PINCH_MIN_OPEN = 0.55
REQUIRED_GESTURE_FRAMES = 8

DEFAULT_GESTURE = "ok"

GESTURE_IDS = ("ok", "fist", "open_palm", "peace", "thumbs_up")

WRIST = 0
THUMB_MCP = 2
THUMB_IP = 3
THUMB_TIP = 4
INDEX_MCP = 5
INDEX_PIP = 6
INDEX_TIP = 8
MIDDLE_MCP = 9
MIDDLE_PIP = 10
MIDDLE_TIP = 12
RING_PIP = 14
RING_TIP = 16
PINKY_PIP = 18
PINKY_TIP = 20

_face_lock = threading.Lock()
_hand_lock = threading.Lock()


class BiometricError(Exception):
    pass


@lru_cache(maxsize=1)
def get_face_app():
    from insightface.app import FaceAnalysis

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(640, 640))
    return app


@lru_cache(maxsize=1)
def get_hand_landmarker():
    if not HAND_MODEL_PATH.exists():
        raise BiometricError(
            "Modelo hand_landmarker.task nao encontrado na pasta backend"
        )

    options = vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(HAND_MODEL_PATH)),
        running_mode=vision.RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=0.7,
    )
    return vision.HandLandmarker.create_from_options(options)


def decode_image(data_url: str) -> np.ndarray:
    payload = data_url.split(",", 1)[-1]

    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise BiometricError("Imagem invalida") from exc

    buffer = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)

    if image is None:
        raise BiometricError("Nao foi possivel decodificar a imagem")

    return image


def extract_embedding(image: np.ndarray) -> np.ndarray:
    with _face_lock:
        faces = get_face_app().get(image)

    if len(faces) == 0:
        raise BiometricError("Nenhum rosto detectado")

    if len(faces) > 1:
        raise BiometricError("Mais de um rosto detectado")

    return np.asarray(faces[0].normed_embedding, dtype=np.float32)


def best_similarity(candidate: np.ndarray, stored: list[list[float]]) -> float:
    if not stored:
        return -1.0

    matrix = np.asarray(stored, dtype=np.float32)
    scores = matrix @ candidate
    return float(np.max(scores))


def _hand_scale(landmarks) -> float:
    wrist = np.array([landmarks[WRIST].x, landmarks[WRIST].y])
    base = np.array([landmarks[MIDDLE_MCP].x, landmarks[MIDDLE_MCP].y])
    return float(np.linalg.norm(wrist - base))


def _normalized_distance(landmarks, a: int, b: int) -> float:
    first = np.array([landmarks[a].x, landmarks[a].y])
    second = np.array([landmarks[b].x, landmarks[b].y])
    scale = _hand_scale(landmarks)

    if scale < 1e-6:
        return 999.0

    return float(np.linalg.norm(first - second) / scale)


def _pinch_distance(landmarks) -> float:
    return _normalized_distance(landmarks, THUMB_TIP, INDEX_TIP)


def _is_extended(landmarks, tip: int, pip: int) -> bool:
    return landmarks[tip].y < landmarks[pip].y


def _thumb_up(landmarks) -> bool:
    above_ip = landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y
    above_mcp = landmarks[THUMB_TIP].y < landmarks[THUMB_MCP].y
    reach = _normalized_distance(landmarks, THUMB_TIP, INDEX_MCP)
    return above_ip and above_mcp and reach > 0.9


def _finger_states(landmarks) -> dict[str, bool]:
    return {
        "index": _is_extended(landmarks, INDEX_TIP, INDEX_PIP),
        "middle": _is_extended(landmarks, MIDDLE_TIP, MIDDLE_PIP),
        "ring": _is_extended(landmarks, RING_TIP, RING_PIP),
        "pinky": _is_extended(landmarks, PINKY_TIP, PINKY_PIP),
    }


def classify_gesture(landmarks) -> str | None:
    fingers = _finger_states(landmarks)
    pinch = _pinch_distance(landmarks)
    extended = sum(fingers.values())

    if (
        pinch < PINCH_MAX
        and not fingers["index"]
        and fingers["middle"]
        and fingers["ring"]
        and fingers["pinky"]
    ):
        return "ok"

    if extended == 4 and pinch > PINCH_MIN_OPEN:
        return "open_palm"

    if (
        fingers["index"]
        and fingers["middle"]
        and not fingers["ring"]
        and not fingers["pinky"]
    ):
        return "peace"

    if extended == 0 and _thumb_up(landmarks):
        return "thumbs_up"

    if extended == 0:
        return "fist"

    return None


def detect_gesture(image: np.ndarray) -> str | None:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    with _hand_lock:
        result = get_hand_landmarker().detect(mp_image)

    if not result.hand_landmarks:
        return None

    return classify_gesture(result.hand_landmarks[0])


def count_consecutive_gesture(images: list[np.ndarray], gesture_id: str) -> int:
    streak = 0
    best = 0

    for image in images:
        if detect_gesture(image) == gesture_id:
            streak += 1
            best = max(best, streak)
        else:
            streak = 0

    return best


def warm_up() -> None:
    get_face_app()
    get_hand_landmarker()