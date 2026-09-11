"use client";

import { Smoke } from "@/components/Smoke";

type Props = {
  label?: string;
};

export function AccessGranted({ label = "Cofre destrancado" }: Props) {
  return (
    <main className="k-curtain relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="k-grid-bg pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-center gap-7 text-center">
        <div className="relative">
          <span
            className="k-unlock-flash absolute inset-0 rounded-full blur-2xl"
            style={{ background: "var(--accent)" }}
          />

          <div
            className="k-lock-in relative"
            style={{ color: "var(--accent)" }}
          >
            <svg viewBox="0 0 120 148" width="118" height="146" fill="none">
              <g className="k-shackle-lift">
                <path
                  d="M38 69 V50 a22 22 0 0 1 44 0 V69"
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeLinecap="butt"
                />
              </g>
              <rect
                x="22"
                y="74"
                width="76"
                height="58"
                rx="14"
                fill="var(--bg)"
                stroke="currentColor"
                strokeWidth="9"
              />
              <circle cx="60" cy="96" r="7" fill="currentColor" />
              <rect
                x="56.5"
                y="99"
                width="7"
                height="16"
                rx="3.5"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <p className="k-fade-up text-sm text-[var(--text-muted)]" style={{ animationDelay: "1s" }}>
          {label}
        </p>
      </div>

      <Smoke baseDelay={0.95} />
    </main>
  );
}