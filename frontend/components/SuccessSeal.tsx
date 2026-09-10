"use client";

type Props = {
  label: string;
  compact?: boolean;
};

export function SuccessSeal({ label, compact }: Props) {
  const size = compact ? 64 : 92;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <span
          className="k-burst absolute inset-0 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <svg viewBox="0 0 60 60" width={size} height={size} fill="none">
          <circle
            className="k-circle-draw"
            cx="30"
            cy="30"
            r="27"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
          />
          <path
            className="k-check-draw"
            d="M19 30.5 L26.5 38 L41 23"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="k-fade-up text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}