"use client";

import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Props = {
  initialized: boolean;
  onUnlock: (masterPassword: string) => Promise<void>;
  onInit: (masterPassword: string) => Promise<void>;
};

export function LockScreen({ initialized, onUnlock, onInit }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!initialized) {
      if (password.length < 12) {
        setError("A senha mestra precisa ter ao menos 12 caracteres");
        return;
      }
      if (password !== confirm) {
        setError("As senhas não conferem");
        return;
      }
    }

    setBusy(true);
    try {
      if (initialized) {
        await onUnlock(password);
      } else {
        await onInit(password);
      }
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir o cofre");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]">
            <ShieldCheck size={24} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Kryptos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {initialized
              ? "Digite sua senha mestra para abrir o cofre"
              : "Crie a senha mestra que protegerá o cofre"}
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
            placeholder="Senha mestra"
            autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:border-[var(--border-strong)] focus:outline-none"
          />

          {!initialized && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
              placeholder="Confirme a senha mestra"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:border-[var(--border-strong)] focus:outline-none"
            />
          )}

          <button
            onClick={() => void handleSubmit()}
            disabled={busy || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {initialized ? "Destrancar" : "Criar cofre"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-[var(--danger)]">{error}</p>
        )}

        {!initialized && (
          <p className="mt-8 text-center text-xs leading-relaxed text-[var(--text-faint)]">
            A senha mestra não é armazenada em lugar nenhum. Se você esquecê-la,
            não há como recuperar o conteúdo do cofre
          </p>
        )}
      </div>
    </main>
  );
}