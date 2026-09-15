"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/api";
import { PROVIDERS } from "@/lib/types";
import type { AuthType, Credential } from "@/lib/types";

type Props = {
  editing: Credential | null;
  onClose: () => void;
  onSaved: () => void;
};

export function CredentialForm({ editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [authType, setAuthType] = useState<AuthType>(
    editing?.auth_type ?? "password"
  );
  const [provider, setProvider] = useState<string | null>(
    editing?.provider ?? null
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError("Informe um título");
      return;
    }

    if (authType === "social" && !provider) {
      setError("Escolha o provedor");
      return;
    }

    if (!editing) {
      if (!username.trim()) {
        setError("Informe o email ou usuário");
        return;
      }
      if (authType === "password" && !password) {
        setError("Informe a senha");
        return;
      }
    }

    setBusy(true);
    setError(null);

    try {
      if (editing) {
        const payload: Record<string, string | null> = {
          title: title.trim(),
          category: category.trim() || null,
          auth_type: authType,
          provider: authType === "social" ? provider : null,
        };
        if (username.trim()) payload.username = username.trim();
        if (password) payload.password = password;
        if (notes.trim()) payload.notes = notes.trim();

        await api.updateCredential(editing.id, payload);
      } else {
        await api.createCredential({
          title: title.trim(),
          auth_type: authType,
          provider: authType === "social" ? provider : null,
          username: username.trim(),
          password: authType === "password" ? password : null,
          category: category.trim() || null,
          notes: notes.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:border-[var(--border-strong)] focus:outline-none";

  return (
    <div className="k-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="k-scale-in w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">
            {editing ? "Editar credencial" : "Nova credencial"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          <TabButton
            label="Login e senha"
            active={authType === "password"}
            onClick={() => {
              setAuthType("password");
              setProvider(null);
              setError(null);
            }}
          />
          <TabButton
            label="Entro com"
            active={authType === "social"}
            onClick={() => {
              setAuthType("social");
              setError(null);
            }}
          />
        </div>

        {authType === "social" && (
          <div className="mb-4 flex flex-wrap gap-2">
            {PROVIDERS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setProvider(item.id);
                  setError(null);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-all duration-200 ${
                  provider === item.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (Netflix, Figma...)"
            autoFocus
            className={inputClass}
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={
              editing
                ? authType === "social"
                  ? "Nova conta (deixe vazio para manter)"
                  : "Novo email (deixe vazio para manter)"
                : authType === "social"
                  ? "Qual conta você usa"
                  : "Email ou usuário"
            }
            className={inputClass}
          />
          {authType === "password" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                editing ? "Nova senha (deixe vazio para manter)" : "Senha"
              }
              className={inputClass}
            />
          )}
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoria (opcional)"
            className={inputClass}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações (opcional)"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

        <button
          onClick={() => void handleSave()}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}