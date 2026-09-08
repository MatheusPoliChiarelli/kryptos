from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.session import vault_session


def require_key(
    x_vault_token: Annotated[str | None, Header()] = None,
) -> bytes:
    key = vault_session.resolve(x_vault_token)
    if key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cofre trancado ou sessão expirada",
        )
    return key


VaultKey = Annotated[bytes, Depends(require_key)]