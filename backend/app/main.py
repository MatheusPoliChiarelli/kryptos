from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.biometrics import warm_up
from app.routers import biometrics, credentials, vault


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        warm_up()
    except Exception as exc:
        print(f"Aviso: modelos biometricos nao carregados ({exc})")
    yield


app = FastAPI(
    title="Kryptos",
    description="Gerenciador de senhas local com criptografia de ponta a ponta",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vault.router)
app.include_router(credentials.router)
app.include_router(biometrics.router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}