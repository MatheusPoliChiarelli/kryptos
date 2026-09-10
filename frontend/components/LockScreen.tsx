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
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  function fail(message: string) {
    setError(message);
    setShakeKey((value) => value + 1);
  }

  async function handleSubmit() {
    setError(null);

    if (!initialized) {
      if (password.length < 12) {
        fail("A senha mestra precisa ter ao menos 12 caracteres");
        return;
      }
      if (password !== confirm) {
        fail("As senhas não conferem");
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
      fail(err instanceof Error ? err.message : "Erro ao abrir o cofre");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = `w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:outline-none ${
    error
      ? "border-[var(--danger)]/50 focus:border-[var(--danger)]"
      : "border-[var(--border)] focus:border-[var(--border-strong)]"
  }`;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="k-grid-bg pointer-events-none absolute inset-0" />

      <div className="k-fade-up relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-7">
            <span
              className="k-halo absolute inset-0 rounded-[26px] blur-2xl"
              style={{ background: "var(--accent)" }}
            />
            {busy && (
              <span className="k-ring absolute inset-0 rounded-[26px] border border-[var(--accent)]" />
            )}
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)]">
              <ShieldCheck size={44} className="text-[var(--accent)]" />
              <span
                className="k-scan absolute inset-x-0 h-10"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(212,162,76,0.28), transparent)",
                }}
              />
            </div>
          </div>

          <h1 className="text-3xl font-medium tracking-tight">Kryptos</h1>
          <p className="mt-2.5 text-sm text-[var(--text-muted)]">
            {initialized
              ? "Digite sua senha mestra para abrir o cofre"
              : "Crie a senha mestra que protegerá o cofre"}
          </p>
        </div>

        <div key={shakeKey} className={error ? "k-shake" : undefined}>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
              placeholder="Senha mestra"
              autoFocus
              className={inputClass}
            />

            {!initialized && (
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
                placeholder="Confirme a senha mestra"
                className={inputClass}
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
              {busy
                ? "Derivando chave"
                : initialized
                  ? "Destrancar"
                  : "Criar cofre"}
            </button>
          </div>

          {error && (
            <div className="k-fade-in mt-4 flex items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}
        </div>

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