"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/api";
import type { Credential } from "@/lib/types";

type Props = {
  editing: Credential | null;
  onClose: () => void;
  onSaved: () => void;
};

export function CredentialForm({ editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editing?.title ?? "");
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
    if (!editing && (!username.trim() || !password)) {
      setError("Informe email e senha");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (editing) {
        const payload: Record<string, string | null> = {
          title: title.trim(),
          category: category.trim() || null,
        };
        if (username.trim()) payload.username = username.trim();
        if (password) payload.password = password;
        if (notes.trim()) payload.notes = notes.trim();

        await api.updateCredential(editing.id, payload);
      } else {
        await api.createCredential({
          title: title.trim(),
          username: username.trim(),
          password,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-7">
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

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (Netflix, Gmail...)"
            autoFocus
            className={inputClass}
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={
              editing ? "Novo email (deixe vazio para manter)" : "Email ou usuário"
            }
            className={inputClass}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              editing ? "Nova senha (deixe vazio para manter)" : "Senha"
            }
            className={inputClass}
          />
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