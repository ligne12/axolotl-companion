"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AxolotlSprite, type AxolotlMood } from "@/components/axolotl/axolotl-sprite";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import type { SessionPublic } from "@/types/api";

const MOODS: AxolotlMood[] = ["idle", "happy", "curious", "sleepy"];

const GREETINGS = [
  "Ready when you are.",
  "What's on your mind today?",
  "Let's figure something out together.",
  "I've been practising my reasoning while you were away.",
  "Bubbles are up. What shall we explore?",
];

export function HomeHero({
  name,
  hasSessions,
  lastSessionId,
}: {
  name: string;
  hasSessions: boolean;
  lastSessionId?: number;
}) {
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const [mood, setMood] = useState<AxolotlMood>("idle");
  const [greeting] = useState(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!,
  );

  // Cycle moods gently in the background
  useEffect(() => {
    const id = setInterval(() => {
      setMood((m) => {
        const others = MOODS.filter((x) => x !== m);
        return others[Math.floor(Math.random() * others.length)]!;
      });
    }, 6500);
    return () => clearInterval(id);
  }, []);

  const createSession = useMutation({
    mutationFn: () =>
      api<SessionPublic>("/v1/sessions", {
        method: "POST",
        body: { title: "New conversation" },
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      router.push(`/chat/${s.id}`);
    },
    onError: () => toast.error("Could not create a session"),
  });

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-br from-pink-50 via-background to-sky-50 p-8 shadow-[4px_4px_0_theme(colors.border)] dark:from-pink-950/30 dark:via-background dark:to-sky-950/30 md:p-12">
      {/* Pixel grid decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:gap-10 md:text-left">
        <button
          type="button"
          onClick={() => setMood("happy")}
          aria-label="Poke the axolotl"
          className="shrink-0 rounded-2xl p-2 transition-transform hover:scale-105 active:scale-95"
        >
          <AxolotlSprite mood={mood} size={180} />
        </button>

        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            hi {name}
          </p>
          <h1 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
            Your axolotl companion is{" "}
            <span className="inline-block bg-primary/15 px-2 py-0.5 text-primary">
              listening
            </span>
            .
          </h1>
          <p className="max-w-md text-balance text-muted-foreground">{greeting}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Button
              size="lg"
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
              className="border-2 border-primary-foreground/10 shadow-[3px_3px_0_theme(colors.primary/40)] transition-all hover:translate-y-[1px] hover:shadow-[2px_2px_0_theme(colors.primary/40)]"
            >
              <MessageSquarePlus className="size-4" />
              New conversation
            </Button>
            {hasSessions && lastSessionId !== undefined && (
              <Button asChild variant="outline" size="lg" className="border-2">
                <Link href={`/chat/${lastSessionId}`}>
                  <Sparkles className="size-4" />
                  Resume last
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
