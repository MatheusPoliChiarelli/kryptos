"use client";

import { useCallback, useEffect, useState } from "react";

import { api, clearToken, getToken, setToken } from "./api";
import type { VaultStatus } from "./types";

export type VaultState = {
  loading: boolean;
  initialized: boolean;
  unlocked: boolean;
  refresh: () => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  initVault: (masterPassword: string) => Promise<void>;
  lock: () => Promise<void>;
};

export function useVault(): VaultState {
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

  const unlock = useCallback(async (masterPassword: string) => {
    const result = await api.unlock(masterPassword);
    setToken(result.token);
    setUnlocked(true);
    setInitialized(true);
  }, []);

  const initVault = useCallback(async (masterPassword: string) => {
    await api.initVault(masterPassword);
    const result = await api.unlock(masterPassword);
    setToken(result.token);
    setInitialized(true);
    setUnlocked(true);
  }, []);

  const lock = useCallback(async () => {
    try {
      await api.lock();
    } finally {
      clearToken();
      setUnlocked(false);
    }
  }, []);

  return { loading, initialized, unlocked, refresh, unlock, initVault, lock };
}