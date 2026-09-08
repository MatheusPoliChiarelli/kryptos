"use client";

import { Lock, Plus, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CredentialForm } from "@/components/CredentialForm";
import { CredentialPanel } from "@/components/CredentialPanel";
import { api } from "@/lib/api";
import type { Credential } from "@/lib/types";

type Props = {
  onLock: () => void;
};

export function VaultView({ onLock }: Props) {
  const [items, setItems] = useState<Credential[]>([]);
  const [selected, setSelected] = useState<Credential | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);

  const load = useCallback(async (term: string) => {
    try {
      const data = await api.listCredentials(term || undefined);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 250);
    return () => clearTimeout(timer);
  }, [search, load]);

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    setSelected(null);
    void load(search);
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-full flex-col border-r border-[var(--border)] lg:w-[380px]">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-[var(--accent)]" />
            <span className="font-medium tracking-tight">Kryptos</span>
          </div>
          <button
            onClick={onLock}
            title="Trancar"
            className="rounded-lg p-2 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <Lock size={16} />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="relative">
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
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--text-faint)]">
              Carregando
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--text-faint)]">
              {search ? "Nada encontrado" : "Nenhuma credencial ainda"}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSelected(item)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                      selected?.id === item.id
                        ? "bg-[var(--surface)]"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                        }}
                      >
                        {item.title.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {item.title}
                        </span>
                        {item.category && (
                          <span className="block truncate text-xs text-[var(--text-faint)]">
                            {item.category}
                          </span>
                        )}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[#1a1408] transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Nova credencial
          </button>
        </div>
      </aside>

      <section className="hidden flex-1 lg:block">
        {selected ? (
          <CredentialPanel
            credential={selected}
            onClose={() => setSelected(null)}
            onDeleted={handleSaved}
            onEdit={() => {
              setEditing(selected);
              setFormOpen(true);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--text-faint)]">
              Selecione uma credencial
            </p>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-40 bg-[var(--bg)] lg:hidden">
          <CredentialPanel
            credential={selected}
            onClose={() => setSelected(null)}
            onDeleted={handleSaved}
            onEdit={() => {
              setEditing(selected);
              setFormOpen(true);
            }}
          />
        </div>
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
    </div>
  );
}