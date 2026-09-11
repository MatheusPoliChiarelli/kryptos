"use client";

type Props = {
  title?: string;
  subtitle?: string;
};

export function AccessDenied({
  title = "Acesso negado",
  subtitle = "Retornando à senha mestra",
}: Props) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="k-grid-bg k-dim pointer-events-none absolute inset-0" />

      <span className="k-alarm-left pointer-events-none absolute inset-y-0 left-0 w-2/5" />
      <span className="k-alarm-right pointer-events-none absolute inset-y-0 right-0 w-2/5" />
      <span className="k-alarm-vignette pointer-events-none absolute inset-0" />
      <span className="k-alarm-flash pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-center gap-7 text-center">
        <div className="k-lock-in">
          <div className="k-lock-jolt">
            <div className="k-lock-red" style={{ color: "var(--accent)" }}>
              <svg viewBox="0 0 120 148" width="118" height="146" fill="none">
                <g className="k-shackle-slam">
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
        </div>

        <div className="k-fade-up" style={{ animationDelay: "1.05s" }}>
          <p className="text-base font-medium tracking-tight text-[var(--danger)]">
            {title}
          </p>
          <p className="mt-1.5 text-sm text-[var(--text-faint)]">{subtitle}</p>
        </div>
      </div>
    </main>
  );
}