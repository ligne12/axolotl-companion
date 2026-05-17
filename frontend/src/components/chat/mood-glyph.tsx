"use client";

import { Brain, type LucideIcon, MessageSquareText, Search, Smile, Sparkles } from "lucide-react";

import type { AxolotlMood } from "@/components/axolotl/axolotl-3d";
import type { MessagePublic } from "@/types/api";

/**
 * Derive the dominant mood a finished assistant message represented
 * during its round. Reads only the message itself — equivalent to the
 * frozen-snapshot the plan calls for, without needing a backend
 * column or a migration.
 *
 * Priority mirrors what the live mascot displayed at peak: a round
 * that called a tool is remembered as ``searching``; one that emitted
 * a reasoning block is remembered as ``thinking``; everything else
 * lands as ``typing`` (content-only). User messages have no mood.
 */
export function deriveMessageMood(message: MessagePublic): AxolotlMood | null {
  if (message.role !== "assistant") return null;
  if (message.tool_calls && message.tool_calls.length > 0) return "searching";
  if (message.reasoning && message.reasoning.trim().length > 0) return "thinking";
  if (message.content && message.content.trim().length > 0) return "typing";
  return null;
}

const MOOD_ICONS: Record<AxolotlMood, LucideIcon> = {
  idle: Smile,
  listening: Smile,
  thinking: Brain,
  searching: Search,
  typing: MessageSquareText,
  happy: Sparkles,
  confused: Smile,
};

const MOOD_BG: Record<AxolotlMood, string> = {
  idle: "bg-card",
  listening: "bg-card",
  thinking: "bg-card",
  searching: "bg-card",
  typing: "bg-card",
  happy: "bg-[color:var(--lime)] text-[color:var(--lime-foreground)]",
  confused: "bg-destructive/15 text-destructive",
};

/**
 * 28 px square glyph beside the bubble header, rendered as a flat
 * lucide icon on a bordered tile so it doesn't compete with the
 * markdown body for attention. Tooltip surfaces the mood name for
 * curious users.
 */
export function MoodGlyph({ mood }: { mood: AxolotlMood }) {
  const Icon = MOOD_ICONS[mood];
  return (
    <span
      aria-label={`mood: ${mood}`}
      title={mood}
      className={`border-border inline-flex size-7 shrink-0 items-center justify-center rounded-md border-2 ${MOOD_BG[mood]}`}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
