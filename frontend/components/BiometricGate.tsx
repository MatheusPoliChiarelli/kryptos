"use client";

import { Check, Hand, Loader2, ScanFace } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SuccessSeal } from "@/components/SuccessSeal";
import { api } from "@/lib/api";
import { useCamera } from "@/lib/useCamera";

const GESTURE_FRAMES = 20;
const GESTURE_INTERVAL_MS = 120;
const FACE_SEAL_MS = 1100;
const FINAL_SEAL_MS = 1500;

type Step = "face" | "face-ok" | "gesture" | "done";

type Props = {
  challengeId: string;
  onComplete: (token: string) => void;
  onCancel: () => void;
};

export function BiometricGate({ challengeId, onComplete, onCancel }: Props) {
  const { videoRef, ready, error: cameraError, capture } = useCamera();
  const [step, setStep] = useState<Step>("face");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const running = useRef(false);
  const tokenRef = useRef<string | null>(null);

  const fail = useCallback((message: string) => {
    setError(message);
    setShakeKey((value) => value + 1);
  }, []);

  const verifyFace = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    const image = capture();
    if (!image) {
      running.current = false;
      fail("Não foi possível capturar a imagem");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await api.verifyFace(challengeId, image);
      setStep("face-ok");
      setTimeout(() => setStep("gesture"), FACE_SEAL_MS);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Erro na verificação");
    } finally {
      setBusy(false);
      running.current = false;
    }
  }, [capture, challengeId, fail]);

  const verifyGesture = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    setBusy(true);
    setCapturing(true);
    setError(null);

    const frames: string[] = [];

    try {
      for (let i = 0; i < GESTURE_FRAMES; i += 1) {
        const frame = capture();
        if (frame) frames.push(frame);
        await new Promise((resolve) => setTimeout(resolve, GESTURE_INTERVAL_MS));
      }

      setCapturing(false);

      if (frames.length === 0) {
        fail("Não foi possível capturar os frames");
        return;
      }

      const result = await api.verifyGesture(challengeId, frames);
      tokenRef.current = result.token;
      setStep("done");
      setTimeout(() => onComplete(result.token), FINAL_SEAL_MS);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Erro na verificação");
    } finally {
      setBusy(false);
      setCapturing(false);
      running.current = false;
    }
  }, [capture, challengeId, fail, onComplete]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      if (busy || !ready) return;

      event.preventDefault();

      if (step === "face") void verifyFace();
      if (step === "gesture") void verifyGesture();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, busy, ready, verifyFace, verifyGesture]);

  if (step === "done") {
    return (
      <main className="k-curtain relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="k-grid-bg pointer-events-none absolute inset-0" />
        <div className="relative">
          <SuccessSeal label="Cofre destrancado" />
        </div>
      </main>
    );
  }

  const isFaceStep = step === "face" || step === "face-ok";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="k-grid-bg pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <StepDot active={step === "face"} done={!isFaceStep || step === "face-ok"} />
            <div className="h-px w-10 bg-[var(--border-strong)]" />
            <StepDot active={step === "gesture"} done={false} />
          </div>

          <h1 className="text-xl font-medium tracking-tight">
            {isFaceStep ? "Verificação facial" : "Segunda verificação"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {isFaceStep
              ? "Posicione o rosto no centro e mantenha-se parado"
              : "Mantenha a mão firme diante da câmera"}
          </p>
        </div>

        <div
          key={shakeKey}
          className={`relative overflow-hidden rounded-2xl border bg-[var(--surface)] ${
            error
              ? "k-shake k-error-glow border-[var(--danger)]"
              : "border-[var(--border-strong)]"
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[4/3] w-full scale-x-[-1] object-cover"
          />

          {!ready && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]">
              <Loader2 size={20} className="animate-spin text-[var(--text-faint)]" />
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)] px-8 text-center">
              <p className="text-sm text-[var(--danger)]">{cameraError}</p>
            </div>
          )}

          {step === "face-ok" && (
            <div className="k-curtain absolute inset-0 flex items-center justify-center bg-[var(--bg)]/85 backdrop-blur-sm">
              <SuccessSeal label="Rosto reconhecido" compact />
            </div>
          )}

          {capturing && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/60 py-3 backdrop-blur-sm">
              <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              <span className="text-xs text-[var(--text)]">
                Capturando, mantenha a posição
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="k-fade-in mt-4 flex items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <button
            onClick={() => void (step === "face" ? verifyFace() : verifyGesture())}
            disabled={busy || !ready || step === "face-ok"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isFaceStep ? (
              <ScanFace size={16} />
            ) : (
              <Hand size={16} />
            )}
            {busy ? "Verificando" : isFaceStep ? "Verificar rosto" : "Verificar"}
          </button>

          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)] disabled:opacity-40"
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  );
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors ${
        done
          ? "border-[var(--accent)] bg-[var(--accent)] text-[#1a1408]"
          : active
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border-strong)] text-[var(--text-faint)]"
      }`}
    >
      {done ? <Check size={13} /> : null}
    </span>
  );
}