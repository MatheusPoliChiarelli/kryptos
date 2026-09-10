"use client";

import { Check, Loader2, ScanFace, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useCamera } from "@/lib/useCamera";

const INSTRUCTIONS = [
  "Olhe de frente para a câmera",
  "Vire o rosto levemente para a esquerda",
  "Vire o rosto levemente para a direita",
];

type Props = {
  onClose: () => void;
};

export function FaceEnrollModal({ onClose }: Props) {
  const { videoRef, ready, error: cameraError, capture } = useCamera();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const status = await api.getBiometricStatus();
        setEnrolled(status.face_enrolled);
      } catch {
        setEnrolled(false);
      }
    }
    void load();
  }, []);

  function takeShot() {
    const image = capture();
    if (!image) {
      setError("Não foi possível capturar");
      return;
    }
    setError(null);
    setShots((prev) => [...prev, image]);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.enrollFace(shots);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setShots([]);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteFace();
      setEnrolled(false);
      setShots([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">
            Reconhecimento facial
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        {enrolled === null ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[var(--text-faint)]" />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <Check size={22} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Rosto cadastrado. A partir do próximo destrancamento, a
              verificação em duas etapas será exigida junto com a senha mestra
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90"
            >
              Entendi
            </button>
          </div>
        ) : enrolled ? (
          <div className="py-4">
            <div className="mb-5 flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <ScanFace
                size={16}
                className="mt-0.5 shrink-0 text-[var(--accent)]"
              />
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                Já existe um rosto cadastrado. Para trocar, remova o atual e
                cadastre novamente
              </p>
            </div>

            {error && (
              <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
            )}

            <button
              onClick={() => void remove()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 py-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--danger)] disabled:opacity-40"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              Remover cadastro
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              {shots.length < INSTRUCTIONS.length
                ? INSTRUCTIONS[shots.length]
                : "Pronto para salvar"}
            </p>

            <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[4/3] w-full scale-x-[-1] object-cover"
              />

              {!ready && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]">
                  <Loader2
                    size={20}
                    className="animate-spin text-[var(--text-faint)]"
                  />
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)] px-8 text-center">
                  <p className="text-sm text-[var(--danger)]">{cameraError}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-2">
              {INSTRUCTIONS.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-10 rounded-full transition-colors ${
                    index < shots.length
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--border-strong)]"
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="mt-4 text-center text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            <div className="mt-6 space-y-2">
              {shots.length < INSTRUCTIONS.length ? (
                <button
                  onClick={takeShot}
                  disabled={!ready}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <ScanFace size={16} />
                  Capturar {shots.length + 1} de {INSTRUCTIONS.length}
                </button>
              ) : (
                <button
                  onClick={() => void save()}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  {busy ? "Processando" : "Salvar cadastro"}
                </button>
              )}

              {shots.length > 0 && !busy && (
                <button
                  onClick={() => setShots([])}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)]"
                >
                  Recomeçar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}