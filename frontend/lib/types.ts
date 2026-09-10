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

