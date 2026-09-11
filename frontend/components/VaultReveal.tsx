"use client";

import { Smoke } from "@/components/Smoke";

export function VaultReveal() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div className="k-reveal-curtain absolute inset-0 bg-[var(--bg)]" />
      <Smoke />
    </div>
  );
}