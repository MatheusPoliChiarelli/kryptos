import type { PendingUnlock, UnlockResponse } from "./types";

export function isPendingUnlock(
  value: UnlockResponse | PendingUnlock
): value is PendingUnlock {
  return "challenge_id" in value;
}