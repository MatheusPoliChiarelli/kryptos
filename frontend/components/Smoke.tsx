"use client";

type Puff = {
  size: number;
  left: number;
  top: number;
  x: number;
  y: number;
  opacity: number;
  delay: number;
  duration: number;
};

const PUFFS: Puff[] = [
  { size: 260, left: 50, top: 52, x: 0, y: -120, opacity: 0.55, delay: 0, duration: 2.2 },
  { size: 200, left: 34, top: 56, x: -150, y: -80, opacity: 0.45, delay: 0.1, duration: 2.4 },
  { size: 200, left: 66, top: 56, x: 150, y: -80, opacity: 0.45, delay: 0.14, duration: 2.4 },
  { size: 160, left: 42, top: 66, x: -90, y: 60, opacity: 0.38, delay: 0.22, duration: 2.6 },
  { size: 160, left: 58, top: 66, x: 90, y: 60, opacity: 0.38, delay: 0.26, duration: 2.6 },
  { size: 220, left: 50, top: 62, x: 0, y: 40, opacity: 0.4, delay: 0.3, duration: 2.8 },
  { size: 140, left: 24, top: 48, x: -200, y: -30, opacity: 0.3, delay: 0.36, duration: 2.5 },
  { size: 140, left: 76, top: 48, x: 200, y: -30, opacity: 0.3, delay: 0.4, duration: 2.5 },
];

type Props = {
  baseDelay?: number;
};

export function Smoke({ baseDelay = 0 }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PUFFS.map((puff, index) => (
        <span
          key={index}
          className="k-smoke absolute rounded-full"
          style={
            {
              width: puff.size,
              height: puff.size,
              left: `${puff.left}%`,
              top: `${puff.top}%`,
              marginLeft: -puff.size / 2,
              marginTop: -puff.size / 2,
              background:
                "radial-gradient(circle, rgba(212,162,76,0.20), rgba(168,170,180,0.12) 45%, transparent 72%)",
              "--smoke-x": `${puff.x}px`,
              "--smoke-y": `${puff.y}px`,
              "--smoke-opacity": puff.opacity,
              "--smoke-delay": `${baseDelay + puff.delay}s`,
              "--smoke-duration": `${puff.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}