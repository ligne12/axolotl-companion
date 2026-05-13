import { cn } from "@/lib/utils";

/**
 * Brand mark — inline copy of ``public/icon.svg``.
 *
 * Inlined rather than ``<img src="/icon.svg">`` so the logo renders on
 * first paint (no extra network round-trip, immune to a stale service
 * worker) and is paintable through CSS at any size via ``className``.
 *
 * Matches the maskable PWA icon: a cream-paper tile with the L-shape
 * offset shadow, a lime accent square and the five-petal lotus mark.
 */
export function LotusLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 192 192"
      role="img"
      aria-label="Axolotl Companion"
      className={cn("size-6 shrink-0", className)}
    >
      <title>Axolotl Companion</title>
      <rect width="192" height="192" rx="32" fill="#f6f2e6" />
      <rect
        x="8"
        y="8"
        width="176"
        height="176"
        rx="24"
        fill="none"
        stroke="#1a1610"
        strokeWidth="6"
      />
      <rect x="58" y="58" width="88" height="88" rx="10" fill="#1a1610" />
      <rect
        x="52"
        y="52"
        width="88"
        height="88"
        rx="10"
        fill="#baff39"
        stroke="#1a1610"
        strokeWidth="6"
      />
      <g transform="translate(96 96)" stroke="#1a1610" strokeWidth="4" strokeLinejoin="round">
        <g fill="#e87b9a">
          <ellipse cx="0" cy="-19" rx="9" ry="17" />
          <ellipse cx="0" cy="-19" rx="9" ry="17" transform="rotate(72)" />
          <ellipse cx="0" cy="-19" rx="9" ry="17" transform="rotate(144)" />
          <ellipse cx="0" cy="-19" rx="9" ry="17" transform="rotate(216)" />
          <ellipse cx="0" cy="-19" rx="9" ry="17" transform="rotate(288)" />
        </g>
        <circle cx="0" cy="0" r="8" fill="#f5d56a" />
      </g>
    </svg>
  );
}
