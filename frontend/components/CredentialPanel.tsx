"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Credential, CredentialSecret } from "@/lib/types";

const AUTO_HIDE_MS = 30_000;

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hide = useCallback(() => {
    setSecret(null);
    setShowPassword(false);
  }, []);

  useEffect(() => {
    hide();
    setConfirmDelete(false);
    setError(null);
  }, [credential.id, hide]);

  useEffect(() => {
    if (!secret) return;
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [secret, hide]);

  async function reveal() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.revealCredential(credential.id);
      setSecret(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revelar");
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-[var(--border)] px-8 py-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight">
            {credential.title}
          </h2>
          {credential.category && (
            <span className="mt-2 inline-block rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
              {credential.category}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-6 px-8 py-6">
        {!secret ? (
          <div className="flex flex-col items-center py-12">
            <p className="mb-6 text-center text-sm text-[var(--text-muted)]">
              As credenciais estão cifradas e ocultas
            </p>
            <button
              onClick={() => void reveal()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Eye size={16} />
              )}
              Revelar
            </button>
          </div>
        ) : (
          <>
            <Field label="Email ou usuário" value={secret.username} />

            <Field
              label="Senha"
              value={showPassword ? secret.password : "•".repeat(14)}
              mono
              onToggle={() => setShowPassword((v) => !v)}
              revealed={showPassword}
            />

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

            <button
              onClick={hide}
              className="flex items-center gap-2 text-xs text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)]"
            >
              <EyeOff size={13} />
              Ocultar novamente
            </button>
          </>
        )}

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </div>

      <div className="flex gap-2 border-t border-[var(--border)] px-8 py-5">
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
  );
}

type FieldProps = {
  label: string;
  value: string;
  mono?: boolean;
  onToggle?: () => void;
  revealed?: boolean;
};

function Field({ label, value, mono, onToggle, revealed }: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-faint)]">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <span
          className={`flex-1 truncate text-sm ${
            mono ? "font-[var(--font-geist-mono)] tracking-wide" : ""
          }`}
        >
          {value}
        </span>
        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}