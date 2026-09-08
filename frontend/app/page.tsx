"use client";

import { Loader2 } from "lucide-react";

import { LockScreen } from "@/components/LockScreen";
import { useVault } from "@/lib/useVault";

export default function Home() {
  const { loading, initialized, unlocked, unlock, initVault, lock } = useVault();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--text-faint)]" />
      </main>
    );
  }

  if (!unlocked) {
    return (
      <LockScreen
        initialized={initialized}
        onUnlock={unlock}
        onInit={initVault}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-[var(--text-muted)]">Cofre destrancado</p>
        <button
          onClick={() => void lock()}
          className="mt-4 text-sm text-[var(--accent)] hover:underline"
        >
          Trancar
        </button>
      </div>
    </main>
  );
}