from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class VaultMeta(Base):
    __tablename__ = "vault_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    kdf_salt: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    kdf_time_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    kdf_memory_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    kdf_parallelism: Mapped[int] = mapped_column(Integer, nullable=False)

    verifier_nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    verifier_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Credential(Base):
    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    title: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)

    username_nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    username_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    password_nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    password_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    notes_nonce: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    notes_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    @property
    def has_notes(self) -> bool:
        return self.notes_ciphertext is not None