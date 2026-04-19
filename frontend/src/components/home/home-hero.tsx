"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AxolotlSprite, type AxolotlMood } from "@/components/axolotl/axolotl-sprite";
import ClickSpark from "@/components/reactbits/click-spark";
import PixelSnow from "@/components/reactbits/pixel-snow";
import TextType from "@/components/reactbits/text-type";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { SessionPublic } from "@/types/api";

const MOODS: AxolotlMood[] = ["idle", "happy", "curious", "sleepy"];

const GREETINGS = [
  "Ready when you are.",
  "What's on your mind today?",
  "Let's figure something out together.",
  "Bubbles are up. What shall we explore?",
  "I've been practising my reasoning while you were away.",
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
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border-2 border-border bg-[color:var(--pastel-pink)] p-6",
        "shadow-[4px_4px_0_0_var(--border)] md:p-10",
      )}
    >
      {/* Subtle pixel snow — lime flakes on the warm pastel wash. */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <PixelSnow
          color="#baff39"
          density={0.18}
          speed={0.6}
          brightness={0.7}
          pixelResolution={260}
          variant="square"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-10 md:text-left">
        {/* Axolotl: clicking triggers a spark burst and swaps mood to happy */}
        <div className="shrink-0">
          <ClickSpark sparkColor="#baff39" sparkCount={12} sparkRadius={22} duration={500}>
            <button
              type="button"
              onClick={() => setMood("happy")}
              aria-label="Poke the axolotl"
              className="rounded-2xl border-2 border-border bg-card p-3 shadow-[3px_3px_0_0_var(--border)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
            >
              <AxolotlSprite mood={mood} size={170} />
            </button>
          </ClickSpark>
        </div>

        <div className="flex max-w-xl flex-col gap-3">
          <span className="inline-flex w-fit self-center items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] md:self-start">
            <span className="size-1.5 rounded-full bg-[color:var(--lime)]" />
            Hi {name}
          </span>

          <h1 className="font-display text-balance text-4xl font-bold leading-[1.05] md:text-5xl">
            Your axolotl is{" "}
            <span className="relative inline-block italic">
              <span className="relative z-10">listening</span>
              <span
                aria-hidden
                className="absolute inset-x-1 bottom-1 -z-0 h-3 bg-[color:var(--lime)]"
              />
            </span>
            .
          </h1>

          <TextType
            as="p"
            className="min-h-[1.5rem] max-w-md text-balance text-muted-foreground"
            text={GREETINGS}
            typingSpeed={38}
            deletingSpeed={18}
            pauseDuration={2600}
            cursorCharacter="▍"
            cursorClassName="text-[color:var(--lime-foreground)]"
          />

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <button
              type="button"
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
              className={cn(
                "group inline-flex items-center gap-2 border-2 border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
                "shadow-[4px_4px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
                "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0_0_var(--lime)]",
                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <MessageSquarePlus className="size-4" />
              New conversation
            </button>

            {hasSessions && lastSessionId !== undefined && (
              <Link
                href={`/chat/${lastSessionId}`}
                className={cn(
                  "inline-flex items-center gap-2 border-2 border-border bg-card px-5 py-2.5 text-sm font-semibold",
                  "shadow-[4px_4px_0_0_var(--border)] transition-[transform,box-shadow] duration-100",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0_0_var(--border)]",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]",
                )}
              >
                <Sparkles className="size-4" />
                Resume last
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
