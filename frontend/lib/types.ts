export type VaultStatus = {
  initialized: boolean;
  unlocked: boolean;
  expires_at: string | null;
};

export type UnlockResponse = {
  token: string;
  expires_at: string;
};

export type Credential = {
  id: number;
  title: string;
  category: string | null;
  has_notes: boolean;
  created_at: string;
  updated_at: string;
};

export type CredentialSecret = {
  id: number;
  username: string;
  password: string;
  notes: string | null;
};

export type CredentialInput = {
  title: string;
  username: string;
  password: string;
  category?: string | null;
  notes?: string | null;
};


export type PendingUnlock = {
  status: "biometrics_required";
  challenge_id: string;
  face_enrolled: boolean;
};

export type BiometricStatus = {
  face_enrolled: boolean;
  sample_count: number;
};

export type SecurityStatus = {
  face_enrolled: boolean;
  sample_count: number;
  gesture_enrolled: boolean;
};

export type GestureOption = {
  id: string;
  label: string;
  hint: string;
};

export const GESTURE_OPTIONS: GestureOption[] = [
  { id: "ok", label: "Sinal de OK", hint: "Polegar e indicador unidos, outros três dedos estendidos" },
  { id: "fist", label: "Punho fechado", hint: "Todos os dedos recolhidos" },
  { id: "open_palm", label: "Palma aberta", hint: "Todos os dedos estendidos e separados" },
  { id: "peace", label: "Dois dedos", hint: "Indicador e médio estendidos, os outros recolhidos" },
  { id: "thumbs_up", label: "Polegar para cima", hint: "Punho fechado com o polegar apontando para cima" },
];