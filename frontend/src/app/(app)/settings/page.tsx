"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/types/api";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60";

const LABEL = "block text-xs font-semibold uppercase tracking-wider";

type ProfileFields = { username: string; locality: string };

export default function ProfilePage() {
  const api = useApi();
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
  });

  const [form, setForm] = useState<ProfileFields>({ username: "", locality: "" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (meQuery.data) {
      setForm({
        username: meQuery.data.username ?? "",
        locality: meQuery.data.locality ?? "",
      });
      setDirty(false);
    }
  }, [meQuery.data]);

  const save = useMutation({
    mutationFn: (body: Partial<ProfileFields>) =>
      api<UserPublic>("/auth/me", { method: "PATCH", body }),
    onSuccess: (next) => {
      qc.setQueryData<UserPublic>(["auth", "me"], next);
      setDirty(false);
      toast.success("Profile saved");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Username already taken"
          : "Could not save";
      toast.error(msg);
    },
  });

  const update = (patch: Partial<ProfileFields>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meQuery.data || !dirty) return;
    const body: Partial<ProfileFields> = {};
    if (form.username !== meQuery.data.username) body.username = form.username.trim();
    if ((form.locality ?? "") !== (meQuery.data.locality ?? "")) {
      body.locality = form.locality.trim();
    }
    if (Object.keys(body).length === 0) return;
    save.mutate(body);
  };

  return (
    <form onSubmit={onSubmit} className="relative space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold leading-tight">
          Your <span className="italic">profile</span>.
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit the name the axolotl calls you and the place it reports in the
          terminal footer.
        </p>
      </header>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="username" className={LABEL}>
            Username
          </label>
          <input
            id="username"
            className={cn(INPUT, "max-w-sm")}
            value={form.username}
            onChange={(e) => update({ username: e.target.value })}
            minLength={3}
            maxLength={50}
            pattern="[a-zA-Z0-9_\-]+"
            required
            disabled={meQuery.isPending}
          />
          <p className="text-xs text-muted-foreground">3–50 chars. letters / digits / <code>_</code> / <code>-</code>.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className={LABEL}>
            Email
          </label>
          <input
            id="email"
            className={cn(INPUT, "max-w-sm")}
            value={meQuery.data?.email ?? ""}
            disabled
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Not editable yet — will require verification.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="locality" className={LABEL}>
            Locality
          </label>
          <input
            id="locality"
            className={cn(INPUT, "max-w-sm")}
            value={form.locality}
            onChange={(e) => update({ locality: e.target.value })}
            maxLength={80}
            placeholder="Montpellier"
            disabled={meQuery.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Shown in the terminal footer as <code>● LOCAL · &lt;locality&gt;</code>.
          </p>
        </div>
      </div>

      {/* Save sits anchored to the form's leading edge, under the last input.
       * Only renders when there's something to save — no layout jitter. */}
      {dirty && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className={cn(
              "inline-flex items-center gap-2 border-2 border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
              "shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
              "hover:shadow-[4px_4px_0_0_var(--lime)]",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {save.isPending ? <Check className="size-4 animate-pulse" /> : <Save className="size-4" />}
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </form>
  );
}
