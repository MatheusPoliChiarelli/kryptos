"use client";

import { Lock, Plus, ScanFace, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CredentialForm } from "@/components/CredentialForm";
import { CredentialPanel } from "@/components/CredentialPanel";
import { FaceEnrollModal } from "@/components/FaceEnrollModal";
import { api } from "@/lib/api";
import type { Credential } from "@/lib/types";

const ALL = "__all__";

type Props = {
  onLock: () => void;
};

export function VaultView({ onLock }: Props) {
  const [items, setItems] = useState<Credential[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [selected, setSelected] = useState<Credential | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);

  const load = useCallback(async (term: string, category: string) => {
    try {
      const data = await api.listCredentials({
        search: term || undefined,
        category: category === ALL ? undefined : category,
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api.listCategories());
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => void load(search, activeCategory), 250);
    return () => clearTimeout(timer);
  }, [search, activeCategory, load]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if (typing || selected || formOpen || faceOpen) return;

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setEditing(null);
        setFormOpen(true);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, formOpen, faceOpen]);

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    setSelected(null);
    void load(search, activeCategory);
    void loadCategories();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={26} className="text-[var(--accent)]" />
            <span className="text-lg font-medium tracking-tight">Kryptos</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar"
                className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-10 pr-4 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:border-[var(--border-strong)] focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              title="Nova credencial (+)"
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nova</span>
            </button>

            <button
              onClick={() => setFaceOpen(true)}
              title="Reconhecimento facial"
              className="rounded-lg p-2 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <ScanFace size={16} />
            </button>
            <button
              onClick={onLock}
              title="Trancar"
              className="rounded-lg p-2 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <Lock size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-7">
        <div className="relative mb-6 sm:hidden">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm placeholder:text-[var(--text-faint)] transition-colors focus:border-[var(--border-strong)] focus:outline-none"
          />
        </div>

        <div className="mb-7 flex flex-wrap gap-2">
          <Badge
            label="Todas"
            active={activeCategory === ALL}
            onClick={() => setActiveCategory(ALL)}
          />
          {categories.map((category) => (
            <Badge
              key={category}
              label={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            />
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="k-sweep relative h-[76px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="k-fade-in flex flex-col items-center py-24 text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]">
              <ShieldCheck size={20} className="text-[var(--text-faint)]" />
            </div>
            <p className="text-sm text-[var(--text-faint)]">
              {search || activeCategory !== ALL
                ? "Nada encontrado"
                : "Nenhuma credencial ainda"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                className="k-fade-up group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-medium transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  {item.title.charAt(0).toUpperCase()}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  {item.category && (
                    <span className="mt-0.5 block truncate text-xs text-[var(--text-faint)]">
                      {item.category}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <CredentialPanel
          credential={selected}
          onClose={() => setSelected(null)}
          onDeleted={handleSaved}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
            setFormOpen(true);
          }}
        />
      )}

      {formOpen && (
        <CredentialForm
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {faceOpen && <FaceEnrollModal onClose={() => setFaceOpen(false)} />}
    </div>
  );
}

function Badge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs transition-all duration-200 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}