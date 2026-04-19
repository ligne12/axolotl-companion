"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AxolotlSprite, type AxolotlMood } from "@/components/axolotl/axolotl-sprite";
import CircularText from "@/components/reactbits/circular-text";
import ClickSpark from "@/components/reactbits/click-spark";
import Magnet from "@/components/reactbits/magnet";
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
  lastSessionId?: string;
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
    <section className="relative isolate overflow-hidden rounded-[28px] border-2 border-border bg-card p-6 shadow-[3px_3px_0_0_var(--border)] md:p-10">
      {/* Hero-local snow layer — drifts on top of the global PixelBlast wash */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <PixelSnow
          color="#baff39"
          density={0.12}
          speed={0.45}
          brightness={0.55}
          pixelResolution={280}
          variant="square"
        />
      </div>

      <div className="relative z-10 flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12">
        {/* Axolotl wrapped in a circular ring of text (ring sits above the card) */}
        <div className="relative shrink-0">
          <ClickSpark sparkColor="#baff39" sparkCount={14} sparkRadius={26} duration={500}>
            <button
              type="button"
              onClick={() => setMood("happy")}
              aria-label="Poke the axolotl"
              className="relative z-10 rounded-2xl border-2 border-border bg-card p-3 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
            >
              <AxolotlSprite mood={mood} size={150} />
            </button>
          </ClickSpark>
          <div className="pointer-events-none absolute inset-0 -m-6 z-20 flex items-center justify-center">
            <CircularText
              text="AXOLOTL · COMPANION · LOCAL · FIRST · "
              spinDuration={28}
              onHover="speedUp"
              className="!h-[220px] !w-[220px] !text-[11px] !text-foreground font-pixel !uppercase !tracking-[0.18em]"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 max-w-xl flex-col gap-4 text-left">
          <span className="inline-flex w-fit items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
            <span className="size-2 bg-[color:var(--lime)]" />
            Hi {name}
          </span>

          <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] md:text-5xl">
            Your <span className="italic">axolotl</span> is listening.
          </h1>

          <TextType
            as="p"
            className="min-h-[3rem] max-w-md text-balance leading-snug text-muted-foreground"
            text={GREETINGS}
            typingSpeed={38}
            deletingSpeed={18}
            pauseDuration={2600}
            cursorCharacter="▍"
            cursorClassName="text-foreground"
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Magnet padding={80} magnetStrength={3}>
              <button
                type="button"
                onClick={() => createSession.mutate()}
                disabled={createSession.isPending}
                className={cn(
                  "group inline-flex items-center gap-2 border-2 border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
                  "shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
                  "hover:shadow-[4px_4px_0_0_var(--lime)]",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <MessageSquarePlus className="size-4" />
                New conversation
              </button>
            </Magnet>

            {hasSessions && lastSessionId !== undefined && (
              <Magnet padding={80} magnetStrength={4}>
                <Link
                  href={`/chat/${lastSessionId}`}
                  className={cn(
                    "inline-flex items-center gap-2 border-2 border-border bg-card px-5 py-2.5 text-sm font-semibold",
                    "shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100",
                    "hover:shadow-[4px_4px_0_0_var(--border)]",
                    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]",
                  )}
                >
                  <Sparkles className="size-4" />
                  Resume last
                </Link>
              </Magnet>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
