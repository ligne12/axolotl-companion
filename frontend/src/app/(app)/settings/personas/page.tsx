"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Markdown } from "@/components/ui/markdown";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type {
  PersonaCreate,
  PersonaPublic,
  PersonaUpdate,
  UserPublic,
} from "@/types/api";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60";

const LABEL = "block text-xs font-semibold uppercase tracking-wider";

const PRIMARY =
  "inline-flex items-center gap-2 border-2 border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)] disabled:cursor-not-allowed disabled:opacity-60";

type Draft = { id: number | null; name: string; system_prompt: string };

export default function PersonasPage() {
  const api = useApi();
  const qc = useQueryClient();

  const personas = useQuery({
    queryKey: ["personas"],
    queryFn: () => api<PersonaPublic[]>("/v1/personas"),
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
  });

  const [editor, setEditor] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PersonaPublic | null>(null);

  const createMut = useMutation({
    mutationFn: (body: PersonaCreate) =>
      api<PersonaPublic>("/v1/personas", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas"] });
      setEditor(null);
      toast.success("Persona created");
    },
    onError: () => toast.error("Could not create persona"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: PersonaUpdate }) =>
      api<PersonaPublic>(`/v1/personas/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas"] });
      setEditor(null);
      toast.success("Persona saved");
    },
    onError: () => toast.error("Could not save"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      api<void>(`/v1/personas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Persona deleted");
    },
    onError: () => toast.error("Could not delete"),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: number | null) =>
      api<UserPublic>("/auth/me", {
        method: "PATCH",
        body: { default_persona_id: id },
      }),
    onSuccess: (next) => {
      qc.setQueryData<UserPublic>(["auth", "me"], next);
      toast.success(
        next.default_persona_id === null
          ? "Default cleared"
          : "Default persona updated",
      );
    },
    onError: () => toast.error("Could not update default"),
  });

  const startCreate = () => setEditor({ id: null, name: "", system_prompt: "" });
  const startEdit = (p: PersonaPublic) =>
    setEditor({ id: p.id, name: p.name, system_prompt: p.system_prompt });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const name = editor.name.trim();
    const system_prompt = editor.system_prompt.trim();
    if (!name || !system_prompt) return;
    if (editor.id === null) {
      createMut.mutate({ name, system_prompt, params: {} });
    } else {
      updateMut.mutate({ id: editor.id, body: { name, system_prompt } });
    }
  };

  const list = personas.data ?? [];
  const defaultId = meQuery.data?.default_persona_id ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold leading-tight">
            Your <span className="italic">personas</span>.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Named system prompts the axolotl can take on — attach one when
            starting a conversation, or edit the wording here.
          </p>
        </div>
        <button className={PRIMARY} onClick={startCreate} type="button">
          <Plus className="size-4" />
          New persona
        </button>
      </header>

      {personas.isPending && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!personas.isPending && list.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No personas yet — create one to shape how the axolotl responds.
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((p) => {
          const isDefault = defaultId === p.id;
          return (
            <li
              key={p.id}
              className={cn(
                "group relative flex h-full flex-col gap-2 rounded-xl border-2 border-border bg-card p-4 transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px]",
                isDefault
                  ? "shadow-[3px_3px_0_0_var(--lime)] hover:shadow-[5px_5px_0_0_var(--lime)]"
                  : "shadow-[3px_3px_0_0_var(--border)] hover:shadow-[5px_5px_0_0_var(--lime)]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold">{p.name}</h2>
                {isDefault && (
                  <span
                    className="inline-flex items-center gap-1 border-2 border-border bg-[color:var(--lime)] px-1.5 py-0.5 font-pixel text-[10px] uppercase tracking-widest text-[color:var(--lime-foreground)]"
                    title="Default for new sessions"
                  >
                    <Pin className="size-3" />
                    default
                  </span>
                )}
                {p.is_builtin && (
                  <span
                    className="inline-flex items-center gap-1 border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[10px] uppercase tracking-widest text-muted-foreground"
                    title="Built-in persona — read only"
                  >
                    <Lock className="size-3" />
                    built-in
                  </span>
                )}
              </div>
              <Markdown
                text={p.system_prompt}
                className="line-clamp-3 overflow-hidden text-xs text-muted-foreground [&_*]:!m-0 [&_*+*]:!mt-0 [&>*]:inline"
              />

              <div className="mt-auto flex justify-end gap-1 pt-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={isDefault ? "Clear default" : "Set as default"}
                  title={isDefault ? "Clear default" : "Set as default"}
                  onClick={() => setDefaultMut.mutate(isDefault ? null : p.id)}
                  disabled={setDefaultMut.isPending}
                  className={cn(
                    "inline-flex size-11 items-center justify-center transition-[transform,colors] duration-75 active:scale-90 md:size-7",
                    isDefault
                      ? "text-[color:var(--lime-foreground)] bg-[color:var(--lime)] border-2 border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isDefault ? <PinOff className="size-4 md:size-3.5" /> : <Pin className="size-4 md:size-3.5" />}
                </button>
                {!p.is_builtin && (
                  <>
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => startEdit(p)}
                      className="inline-flex size-11 items-center justify-center text-muted-foreground transition-transform duration-75 hover:text-foreground active:scale-90 md:size-7"
                    >
                      <Pencil className="size-4 md:size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => setPendingDelete(p)}
                      className="inline-flex size-11 items-center justify-center text-muted-foreground transition-transform duration-75 hover:text-destructive active:scale-90 md:size-7"
                    >
                      <Trash2 className="size-4 md:size-3.5" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Create / edit modal */}
      <Modal
        open={editor !== null}
        onOpenChange={(o) => {
          if (!o) setEditor(null);
        }}
        title={editor?.id === null ? "New *persona*" : "Edit *persona*"}
      >
        {editor && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="persona-name" className={LABEL}>
                Name
              </label>
              <input
                id="persona-name"
                className={INPUT}
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                maxLength={100}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="persona-prompt" className={LABEL}>
                System prompt
              </label>
              <textarea
                id="persona-prompt"
                rows={7}
                className={cn(INPUT, "resize-none font-sans")}
                value={editor.system_prompt}
                onChange={(e) =>
                  setEditor({ ...editor, system_prompt: e.target.value })
                }
                maxLength={20_000}
                required
                placeholder="You are a helpful axolotl companion…"
              />
              <p className="text-xs text-muted-foreground">
                Applied as the system message when a session uses this persona.
              </p>
            </div>
            <Modal.Footer>
              <Modal.Cancel>Cancel</Modal.Cancel>
              <Modal.Confirm
                onClick={() => onSubmit({ preventDefault() {} } as React.FormEvent)}
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editor.id === null ? "Create" : "Save"}
              </Modal.Confirm>
            </Modal.Footer>
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Delete *persona*?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Sessions already using it keep their stored prompt; new sessions can no longer select it.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) {
            deleteMut.mutate(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
