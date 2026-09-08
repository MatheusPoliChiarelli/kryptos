"use client";

import { Loader2 } from "lucide-react";

import { LockScreen } from "@/components/LockScreen";
import { VaultView } from "@/components/VaultView";
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

  return <VaultView onLock={() => void lock()} />;
}