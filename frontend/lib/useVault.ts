"use client";

import { useCallback, useEffect, useState } from "react";

import { api, clearToken, getToken, setToken } from "./api";
import { isPendingUnlock } from "./guards";
import type { VaultStatus } from "./types";


export type UnlockResult =
  | { kind: "unlocked" }
  | { kind: "biometrics"; challengeId: string };

export function useVault() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const status: VaultStatus = await api.getStatus();
      setInitialized(status.initialized);
      setUnlocked(status.unlocked && getToken() !== null);
    } catch {
      setInitialized(false);
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlock = useCallback(
    async (masterPassword: string): Promise<UnlockResult> => {
      const result = await api.unlock(masterPassword);

      if (isPendingUnlock(result)) {
        return { kind: "biometrics", challengeId: result.challenge_id };
      }

      setToken(result.token);
      setUnlocked(true);
      setInitialized(true);
      return { kind: "unlocked" };
    },
    []
  );

  const finishBiometrics = useCallback((token: string) => {
    setToken(token);
    setUnlocked(true);
    setInitialized(true);
  }, []);

  const initVault = useCallback(async (masterPassword: string) => {
    await api.initVault(masterPassword);
    const result = await api.unlock(masterPassword);
    if (!isPendingUnlock(result)) {
      setToken(result.token);
      setInitialized(true);
      setUnlocked(true);
    }
  }, []);

  const lock = useCallback(async () => {
    try {
      await api.lock();
    } finally {
      clearToken();
      setUnlocked(false);
    }
  }, []);

  return {
    loading,
    initialized,
    unlocked,
    refresh,
    unlock,
    initVault,
    finishBiometrics,
    lock,
  };
}