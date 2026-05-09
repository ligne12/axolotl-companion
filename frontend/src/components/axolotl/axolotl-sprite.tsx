"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type AxolotlMood =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "typing"
  | "happy"
  | "confused";

/**
 * Pixel-art axolotl rendered as inline SVG. A 16x16 pixel grid is scaled up
 * with ``shape-rendering="crispEdges"`` so the pink friend keeps its crunchy
 * edges at any size. Idle animations (bob, blink, bubbles, tail wag) are
 * driven by Tailwind/CSS keyframes defined below.
 */
export function AxolotlSprite({
  mood = "idle",
  size = 192,
  className,
}: {
  mood?: AxolotlMood;
  size?: number;
  className?: string;
}) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      setBlink(true);
      t = setTimeout(() => {
        setBlink(false);
        t = setTimeout(loop, 2500 + Math.random() * 2500);
      }, 140);
    };
    t = setTimeout(loop, 1500);
    return () => clearTimeout(t);
  }, []);

  // Colors (oklch-friendly pinks and soft accents)
  const body = "#ffb3d1";
  const bodyShade = "#f08ab5";
  const gills = "#ff6aa6";
  const gillsShade = "#e04a86";
  const belly = "#ffe0ec";
  const mouth = "#c44082";
  const cheek = "#ff82ae";

  // The 2D SVG only models a coarse expression — collapse the 7 moods to the
  // two visual states it can represent. Stays a valid reduced-motion fallback.
  const isSleepy = mood === "thinking" || mood === "confused";
  const isHappy = mood === "happy" || mood === "listening";

  return (
    <div
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      aria-label="Animated axolotl mascot"
      role="img"
    >
      {/* Bubbles floating up */}
      <span className="axolotl-bubble axolotl-bubble-1" />
      <span className="axolotl-bubble axolotl-bubble-2" />
      <span className="axolotl-bubble axolotl-bubble-3" />

      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className="axolotl-bob relative z-10"
      >
        {/* Tail (wags) */}
        <g className="axolotl-tail" style={{ transformOrigin: "10px 20px" }}>
          <rect x="5" y="19" width="3" height="3" fill={bodyShade} />
          <rect x="4" y="20" width="2" height="2" fill={body} />
        </g>

        {/* Body */}
        <rect x="8" y="12" width="16" height="10" fill={body} />
        <rect x="8" y="21" width="16" height="1" fill={bodyShade} />
        <rect x="10" y="18" width="12" height="3" fill={belly} />

        {/* Head outline puff */}
        <rect x="9" y="10" width="14" height="2" fill={body} />
        <rect x="10" y="9" width="12" height="1" fill={body} />

        {/* Gills (left) */}
        <g className="axolotl-gill-left">
          <rect x="6" y="11" width="2" height="3" fill={gills} />
          <rect x="5" y="13" width="2" height="3" fill={gills} />
          <rect x="6" y="15" width="2" height="3" fill={gills} />
          <rect x="6" y="11" width="1" height="1" fill={gillsShade} />
          <rect x="5" y="15" width="1" height="1" fill={gillsShade} />
        </g>
        {/* Gills (right) */}
        <g className="axolotl-gill-right">
          <rect x="24" y="11" width="2" height="3" fill={gills} />
          <rect x="25" y="13" width="2" height="3" fill={gills} />
          <rect x="24" y="15" width="2" height="3" fill={gills} />
          <rect x="25" y="11" width="1" height="1" fill={gillsShade} />
          <rect x="26" y="15" width="1" height="1" fill={gillsShade} />
        </g>

        {/* Cheeks */}
        <rect x="11" y="15" width="2" height="1" fill={cheek} />
        <rect x="19" y="15" width="2" height="1" fill={cheek} />

        {/* Eyes */}
        {isSleepy ? (
          <>
            <rect x="12" y="13" width="2" height="1" fill="#222" />
            <rect x="18" y="13" width="2" height="1" fill="#222" />
          </>
        ) : (
          <>
            <rect
              x="12"
              y={blink ? 14 : 13}
              width="2"
              height={blink ? 1 : 2}
              fill="#222"
            />
            <rect
              x="18"
              y={blink ? 14 : 13}
              width="2"
              height={blink ? 1 : 2}
              fill="#222"
            />
            {!blink && (
              <>
                <rect x="13" y="13" width="1" height="1" fill="#fff" />
                <rect x="19" y="13" width="1" height="1" fill="#fff" />
              </>
            )}
          </>
        )}

        {/* Mouth */}
        {isHappy ? (
          <>
            <rect x="14" y="17" width="4" height="1" fill={mouth} />
            <rect x="13" y="16" width="1" height="1" fill={mouth} />
            <rect x="18" y="16" width="1" height="1" fill={mouth} />
          </>
        ) : (
          <rect x="15" y="17" width="2" height="1" fill={mouth} />
        )}

        {/* Tiny legs */}
        <rect x="11" y="22" width="2" height="2" fill={body} />
        <rect x="19" y="22" width="2" height="2" fill={body} />
        <rect x="11" y="23" width="2" height="1" fill={bodyShade} />
        <rect x="19" y="23" width="2" height="1" fill={bodyShade} />

        {/* Zzz for sleepy */}
        {isSleepy && (
          <g className="axolotl-z">
            <rect x="24" y="6" width="3" height="1" fill="#888" />
            <rect x="24" y="8" width="3" height="1" fill="#888" />
            <rect x="26" y="7" width="1" height="1" fill="#888" />
          </g>
        )}
      </svg>

      <style jsx>{`
        .axolotl-bob {
          animation: axolotl-bob 3.2s ease-in-out infinite;
        }
        :global(.axolotl-tail) {
          animation: axolotl-tail 1.8s ease-in-out infinite;
          transform-box: fill-box;
        }
        :global(.axolotl-gill-left) {
          animation: axolotl-gill 2.4s ease-in-out infinite;
          transform-origin: 7px 14px;
          transform-box: fill-box;
        }
        :global(.axolotl-gill-right) {
          animation: axolotl-gill 2.4s ease-in-out infinite reverse;
          transform-origin: 25px 14px;
          transform-box: fill-box;
        }
        :global(.axolotl-z) {
          animation: axolotl-z 2.4s ease-in-out infinite;
          transform-box: fill-box;
        }
        .axolotl-bubble {
          position: absolute;
          bottom: 10%;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.65);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
          opacity: 0;
          animation: axolotl-bubble 4.5s ease-in infinite;
        }
        .axolotl-bubble-1 {
          left: 18%;
          width: 5px;
          height: 5px;
          animation-delay: 0s;
        }
        .axolotl-bubble-2 {
          left: 72%;
          width: 8px;
          height: 8px;
          animation-delay: 1.3s;
        }
        .axolotl-bubble-3 {
          left: 42%;
          width: 4px;
          height: 4px;
          animation-delay: 2.7s;
        }
        @keyframes axolotl-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6%); }
        }
        @keyframes axolotl-tail {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes axolotl-gill {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(1px) scale(1.06); }
        }
        @keyframes axolotl-z {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes axolotl-bubble {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translateY(-160%) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
