"use client";

import {
  Check,
  ChevronRight,
  Hand,
  KeyRound,
  Loader2,
  ScanFace,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { GESTURE_OPTIONS } from "@/lib/types";
import type { SecurityStatus } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";

const FACE_SHOTS = [
  "Olhe de frente para a câmera",
  "Vire o rosto levemente para a esquerda",
  "Vire o rosto levemente para a direita",
];

const GESTURE_FRAMES = 20;
const GESTURE_INTERVAL_MS = 120;

type View = "menu" | "password" | "face" | "gesture";

type Props = {
  onClose: () => void;
  onPasswordChanged: () => void;
};

export function SecurityModal({ onClose, onPasswordChanged }: Props) {
  const [view, setView] = useState<View>("menu");
  const [status, setStatus] = useState<SecurityStatus | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.getSecurityStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <div className="k-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm">
      <div className="k-scale-in w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">
            {view === "menu" && "Segurança"}
            {view === "password" && "Trocar senha mestra"}
            {view === "face" && "Reconhecimento facial"}
            {view === "gesture" && "Gesto de acesso"}
          </h2>
          <button
            onClick={view === "menu" ? onClose : () => setView("menu")}
            className="rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        {view === "menu" && (
          <Menu status={status} onSelect={setView} />
        )}

        {view === "password" && (
          <PasswordForm onChanged={onPasswordChanged} />
        )}

        {view === "face" && (
          <FaceEnroll
            enrolled={status?.face_enrolled ?? false}
            onDone={() => {
              void loadStatus();
              setView("menu");
            }}
          />
        )}

        {view === "gesture" && (
          <GestureEnroll
            enrolled={status?.gesture_enrolled ?? false}
            onDone={() => {
              void loadStatus();
              setView("menu");
            }}
          />
        )}
      </div>
    </div>
  );
}

function Menu({
  status,
  onSelect,
}: {
  status: SecurityStatus | null;
  onSelect: (view: View) => void;
}) {
  return (
    <div className="space-y-2">
      <Row
        icon={<KeyRound size={17} />}
        title="Senha mestra"
        subtitle="Recifra todo o cofre com uma chave nova"
        onClick={() => onSelect("password")}
      />
      <Row
        icon={<ScanFace size={17} />}
        title="Reconhecimento facial"
        subtitle={
          status?.face_enrolled
            ? `${status.sample_count} capturas cadastradas`
            : "Nenhum rosto cadastrado"
        }
        done={status?.face_enrolled}
        onClick={() => onSelect("face")}
      />
      <Row
        icon={<Hand size={17} />}
        title="Gesto de acesso"
        subtitle={
          status?.gesture_enrolled
            ? "Gesto personalizado ativo"
            : "Usando o gesto padrão"
        }
        done={status?.gesture_enrolled}
        onClick={() => onSelect("gesture")}
      />
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  done,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  done?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
    >
      <span className="text-[var(--accent)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {done && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <Check size={10} className="text-[var(--accent)]" />
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--text-faint)]">
          {subtitle}
        </span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-[var(--text-faint)]" />
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:border-[var(--border-strong)] focus:outline-none";

function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (next.length < 12) {
      setError("A nova senha precisa ter ao menos 12 caracteres");
      return;
    }
    if (next !== confirm) {
      setError("As senhas não conferem");
      return;
    }

    setBusy(true);
    try {
      await api.changeMasterPassword(current, next);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao trocar a senha");
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">
        Todo o cofre será recifrado com a nova chave. Não feche o aplicativo
        durante o processo
      </p>

      <div className="space-y-3">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Senha mestra atual"
          autoFocus
          className={inputClass}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Nova senha mestra"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
          placeholder="Confirme a nova senha"
          className={inputClass}
        />
      </div>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      <button
        onClick={() => void handleSubmit()}
        disabled={busy || !current || !next}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {busy ? "Recifrando o cofre" : "Trocar senha"}
      </button>
    </>
  );
}

function FaceEnroll({
  enrolled,
  onDone,
}: {
  enrolled: boolean;
  onDone: () => void;
}) {
  const { attach, ready, error: cameraError, capture } = useCamera();
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setShots([]);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteFace();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {shots.length < FACE_SHOTS.length
          ? FACE_SHOTS[shots.length]
          : "Pronto para salvar"}
      </p>

      <CameraBox attach={attach} ready={ready} cameraError={cameraError} />

      <div className="mt-4 flex justify-center gap-2">
        {FACE_SHOTS.map((_, index) => (
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
        <p className="mt-4 text-center text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="mt-6 space-y-2">
        {shots.length < FACE_SHOTS.length ? (
          <button
            onClick={takeShot}
            disabled={!ready || busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <ScanFace size={16} />
            Capturar {shots.length + 1} de {FACE_SHOTS.length}
          </button>
        ) : (
          <button
            onClick={() => void save()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? "Processando" : enrolled ? "Substituir cadastro" : "Salvar"}
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

        {enrolled && shots.length === 0 && !busy && (
          <button
            onClick={() => void remove()}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm text-[var(--text-faint)] transition-colors hover:text-[var(--danger)]"
          >
            <Trash2 size={14} />
            Remover cadastro
          </button>
        )}
      </div>
    </>
  );
}

function GestureEnroll({
  enrolled,
  onDone,
}: {
  enrolled: boolean;
  onDone: () => void;
}) {
  const { attach, ready, error: cameraError, capture } = useCamera();
  const [gestureId, setGestureId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function record() {
    if (!gestureId) return;

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
      await api.enrollGesture(gestureId, frames);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setBusy(false);
      setCapturing(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteGesture();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
      setBusy(false);
    }
  }

  const selected = GESTURE_OPTIONS.find((option) => option.id === gestureId);

  if (!gestureId) {
    return (
      <>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Escolha o gesto que destranca o cofre
        </p>

        <div className="space-y-2">
          {GESTURE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setGestureId(option.id)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--text-faint)]">
                {option.hint}
              </span>
            </button>
          ))}
        </div>

        {enrolled && (
          <button
            onClick={() => void remove()}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm text-[var(--text-faint)] transition-colors hover:text-[var(--danger)] disabled:opacity-40"
          >
            <Trash2 size={14} />
            Voltar ao gesto padrão
          </button>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className="mb-1 text-sm font-medium">{selected?.label}</p>
      <p className="mb-4 text-xs text-[var(--text-faint)]">{selected?.hint}</p>

      <div className="relative">
        <CameraBox attach={attach} ready={ready} cameraError={cameraError} />

        {capturing && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/60 py-3 backdrop-blur-sm">
            <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
            <span className="text-xs text-[var(--text)]">
              Mantenha o gesto firme
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="mt-6 space-y-2">
        <button
          onClick={() => void record()}
          disabled={busy || !ready}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Hand size={16} />
          )}
          {busy ? "Gravando" : "Gravar gesto"}
        </button>

        <button
          onClick={() => {
            setGestureId(null);
            setError(null);
          }}
          disabled={busy}
          className="w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)] disabled:opacity-40"
        >
          Escolher outro gesto
        </button>
      </div>
    </>
  );
}

function CameraBox({
  attach,
  ready,
  cameraError,
}: {
  attach: (node: HTMLVideoElement | null) => void;
  ready: boolean;
  cameraError: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <video
        ref={attach}
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
    </div>
  );
}