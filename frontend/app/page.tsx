"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { BiometricGate } from "@/components/BiometricGate";
import { LockScreen } from "@/components/LockScreen";
import { VaultReveal } from "@/components/VaultReveal";
import { VaultView } from "@/components/VaultView";
import { useVault } from "@/lib/useVault";

const REVEAL_MS = 2600;

export default function Home() {
  const {
    loading,
    initialized,
    unlocked,
    unlock,
    initVault,
    finishBiometrics,
    lock,
  } = useVault();

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  async function handleUnlock(masterPassword: string) {
    const result = await unlock(masterPassword);
    if (result.kind === "biometrics") {
      setChallengeId(result.challengeId);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--text-faint)]" />
      </main>
    );
  }

  if (challengeId && !unlocked) {
    return (
      <BiometricGate
        challengeId={challengeId}
        onComplete={(token) => {
          finishBiometrics(token);
          setChallengeId(null);
          setRevealing(true);
          setTimeout(() => setRevealing(false), REVEAL_MS);
        }}
        onCancel={() => setChallengeId(null)}
      />
    );
  }

  if (!unlocked) {
    return (
      <LockScreen
        initialized={initialized}
        onUnlock={handleUnlock}
        onInit={initVault}
      />
    );
  }

  return (
    <>
      <VaultView onLock={() => void lock()} />
      {revealing && <VaultReveal />}
    </>
  );
}