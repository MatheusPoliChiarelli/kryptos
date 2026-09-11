import type {
  BiometricStatus,
  Credential,
  CredentialInput,
  CredentialSecret,
  PendingUnlock,
  SecurityStatus,
  UnlockResponse,
  VaultStatus,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "kryptos_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) {
    headers.set("X-Vault-Token", token);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor");
  }

  if (response.status === 401) {
    clearToken();
    throw new ApiError(401, "Cofre trancado ou sessão expirada");
  }

  if (!response.ok) {
    let detail = "Ocorreu um erro inesperado";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getStatus: () => request<VaultStatus>("/vault/status"),

  initVault: (masterPassword: string) =>
    request<{ message: string }>("/vault/init", {
      method: "POST",
      body: JSON.stringify({ master_password: masterPassword }),
    }),

  unlock: (masterPassword: string) =>
    request<UnlockResponse | PendingUnlock>("/vault/unlock", {
      method: "POST",
      body: JSON.stringify({ master_password: masterPassword }),
    }),

  lock: () => request<{ message: string }>("/vault/lock", { method: "POST" }),

  changeMasterPassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/vault/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),

  getBiometricStatus: () => request<BiometricStatus>("/biometrics/status"),

  getSecurityStatus: () => request<SecurityStatus>("/biometrics/security"),

  enrollFace: (images: string[]) =>
    request<{ message: string }>("/biometrics/enroll-face", {
      method: "POST",
      body: JSON.stringify({ images }),
    }),

  deleteFace: () => request<void>("/biometrics/face", { method: "DELETE" }),

  enrollGesture: (gestureId: string, frames: string[]) =>
    request<{ message: string }>("/biometrics/enroll-gesture", {
      method: "POST",
      body: JSON.stringify({ gesture_id: gestureId, frames }),
    }),

  deleteGesture: () => request<void>("/biometrics/gesture", { method: "DELETE" }),

  verifyFace: (challengeId: string, image: string) =>
    request<{ message: string }>("/biometrics/verify-face", {
      method: "POST",
      body: JSON.stringify({ challenge_id: challengeId, image }),
    }),

  verifyGesture: (challengeId: string, frames: string[]) =>
    request<UnlockResponse>("/biometrics/verify-gesture", {
      method: "POST",
      body: JSON.stringify({ challenge_id: challengeId, frames }),
    }),

  listCredentials: (params?: { search?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Credential[]>(`/credentials${suffix}`);
  },

  listCategories: () => request<string[]>("/credentials/categories"),

  createCredential: (data: CredentialInput) =>
    request<Credential>("/credentials", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCredential: (id: number, data: Partial<CredentialInput>) =>
    request<Credential>(`/credentials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  revealCredential: (id: number) =>
    request<CredentialSecret>(`/credentials/${id}/reveal`),

  deleteCredential: (id: number) =>
    request<void>(`/credentials/${id}`, { method: "DELETE" }),
};