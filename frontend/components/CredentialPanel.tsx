"use client";

import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { providerLabel } from "@/lib/types";
import type { Credential, CredentialSecret } from "@/lib/types";
import { useScramble } from "@/lib/useScramble";

const AUTO_CLOSE_MS = 60_000;

type Props = {
  credential: Credential;
  onClose: () => void;
  onDeleted: () => void;
  onEdit: () => void;
};

export function CredentialPanel({
  credential,
  onClose,
  onDeleted,
  onEdit,
}: Props) {
  const [secret, setSecret] = useState<CredentialSecret | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reveal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.revealCredential(credential.id);
      setSecret(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir");
    } finally {
      setLoading(false);
    }
  }, [credential.id]);

  useEffect(() => {
    void reveal();
  }, [reveal]);

  useEffect(() => {
    if (!secret) return;
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [secret, onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    try {
      await api.deleteCredential(credential.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  const isSocial = credential.auth_type === "social";

  return (
    <div
      className="k-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="k-scale-in relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)]"
      >
        {secret && (
          <div
            className="k-countdown absolute inset-x-0 top-0 h-px bg-[var(--accent)]"
            style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }}
          />
        )}

        <div className="flex items-start justify-between border-b border-[var(--border)] px-7 py-6">
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-medium"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              {credential.title.charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 className="text-lg font-medium tracking-tight">
                {credential.title}
              </h2>
              {credential.category && (
                <span className="mt-1 inline-block rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                  {credential.category}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-7 py-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
              <span className="k-mono text-xs text-[var(--text-faint)]">
                decifrando
              </span>
            </div>
          ) : secret ? (
            <>
              {isSocial && (
                <div className="k-fade-up flex items-center gap-2.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="text-sm text-[var(--accent)]">
                    Você entra com {providerLabel(credential.provider)}
                  </span>
                </div>
              )}

              {secret.username && (
                <Field
                  label={isSocial ? "Conta usada" : "Email ou usuário"}
                  value={secret.username}
                />
              )}

              {secret.password && <Field label="Senha" value={secret.password} mono />}

              {secret.notes && (
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-faint)]">
                    Anotações
                  </label>
                  <p className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    {secret.notes}
                  </p>
                </div>
              )}
            </>
          ) : null}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] px-7 py-5">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <Pencil size={15} />
            Editar
          </button>
          <button
            onClick={() => void handleDelete()}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              confirmDelete
                ? "bg-[var(--danger)] text-[#1a0a08]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]"
            }`}
          >
            <Trash2 size={15} />
            {confirmDelete ? "Confirmar exclusão" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const display = useScramble(value, true);

  return (
    <div className="k-fade-up">
      <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-faint)]">
        {label}
      </label>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <span
          className={`block truncate text-sm ${mono ? "k-mono tracking-wide" : ""}`}
        >
          {display}
        </span>
      </div>
    </div>
  );
}