"use client";

import { useEffect, useState } from "react";

const CHARS = "ABCDEF0123456789#$%&@*<>/\\";

export function useScramble(text: string, active: boolean, speed = 26) {
  const [output, setOutput] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) {
      setOutput(text);
      return;
    }

    let frame = 0;
    const total = text.length * 2;

    const timer = setInterval(() => {
      frame += 1;
      const revealed = Math.floor(frame / 2);

      const next = text
        .split("")
        .map((char, index) => {
          if (index < revealed) return char;
          if (char === " ") return " ";
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");

      setOutput(next);

      if (frame >= total) {
        clearInterval(timer);
        setOutput(text);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, active, speed]);

  return output;
}