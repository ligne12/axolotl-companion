"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { cn } from "@/lib/utils";

import type { AxolotlMood } from "./axolotl-sprite";

const MODEL_URL = "/models/axolotl-chibi.glb";
const CROSSFADE_S = 0.3;

/**
 * Live 3D chibi axolotl rendered with Three.js + AnimationMixer. The GLB
 * carries seven named clips (idle, listening, thinking, searching, typing,
 * happy, confused) authored in Blender. Mood prop changes crossfade between
 * the matching clip with a 300 ms blend.
 *
 * Mood-specific pixel-art emblems (thought bubble, magnifying glass, hearts,
 * "?" mark, "!" listening dashes) overlay the canvas anchored to the head
 * area so the chat state reads at the same glance as the reference sprites.
 * Keyframes for the emblem animations live in `globals.css`.
 */
export function Axolotl3D({
  mood = "idle",
  size = 192,
  className,
}: {
  mood?: AxolotlMood;
  size?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction> | null>(null);
  const currentRef = useRef<THREE.AnimationAction | null>(null);
  // 3D emblem props baked into the GLB — toggled per-mood at runtime.
  const emblemsRef = useRef<Map<AxolotlMood, THREE.Object3D> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;

    // Camera tuned so the chibi sits in the upper-center of the canvas,
    // leaving room above the head for the mood emblems (bubble, "?", hearts).
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    camera.position.set(0, 0.8, 4.6);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2.5, 4, 3);
    scene.add(key);

    const mixerRef: { current: THREE.AnimationMixer | null } = { current: null };
    let raf = 0;
    const clock = new THREE.Clock();

    const loader = new GLTFLoader();
    let cancelled = false;
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (cancelled) return;
        scene.add(gltf.scene);
        // Lower the model slightly so head sits at vertical center of canvas
        gltf.scene.position.y = -0.2;

        const mixer = new THREE.AnimationMixer(gltf.scene);
        mixerRef.current = mixer;
        const map = new Map<string, THREE.AnimationAction>();
        for (const clip of gltf.animations) {
          const action = mixer.clipAction(clip);
          if (clip.name === "happy") {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          } else {
            action.setLoop(THREE.LoopRepeat, Infinity);
          }
          map.set(clip.name, action);
        }
        actionsRef.current = map;

        // Find emblem props in the loaded scene and store them by mood.
        // Hide all by default; the mood effect will enable the one that matches.
        const EMBLEM_NODE_BY_MOOD: Record<string, AxolotlMood> = {
          emblem_bubble: "thinking",
          emblem_loupe: "searching",
          emblem_question: "confused",
          emblem_listen: "listening",
          emblem_typing: "typing",
        };
        const emblems = new Map<AxolotlMood, THREE.Object3D>();
        gltf.scene.traverse((obj) => {
          const m = EMBLEM_NODE_BY_MOOD[obj.name];
          if (m) {
            obj.visible = false;
            emblems.set(m, obj);
          }
        });
        emblemsRef.current = emblems;

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info(
            "[axolotl-3d] loaded clips:",
            gltf.animations.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`),
            "emblems:",
            [...emblems.keys()],
          );
        }

        const initial = map.get(mood) ?? map.get("idle") ?? null;
        if (initial) {
          initial.reset().play();
          currentRef.current = initial;
        }
        const initialEmblem = emblems.get(mood);
        if (initialEmblem) initialEmblem.visible = true;
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[axolotl-3d] failed to load GLB:", err);
      },
    );

    const tick = () => {
      raf = requestAnimationFrame(tick);
      mixerRef.current?.update(clock.getDelta());
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m?.dispose();
        }
      });
      actionsRef.current = null;
      currentRef.current = null;
    };
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only setup

  // Crossfade to the new clip whenever `mood` changes, and toggle 3D emblems.
  useEffect(() => {
    const map = actionsRef.current;
    if (map) {
      const next = map.get(mood);
      if (next) {
        const current = currentRef.current;
        if (current !== next) {
          next.reset();
          next.setEffectiveWeight(1);
          next.play();
          if (current) {
            current.crossFadeTo(next, CROSSFADE_S, false);
          }
          currentRef.current = next;
        }
      }
    }
    // Show only the matching 3D prop, hide all others.
    const emblems = emblemsRef.current;
    if (emblems) {
      for (const [m, obj] of emblems) {
        obj.visible = m === mood;
      }
    }
  }, [mood]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      aria-label="Animated axolotl mascot"
      role="img"
    >
      <MoodEmblem mood={mood} size={size} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mood emblems for the 3D mascot.                                    */
/* The bubble / magnifier / "?" / listening dashes / typing dots are  */
/* baked as 3D meshes inside the GLB and toggled via Object3D.visible */
/* in the mood effect above. Only the floating hearts stay as DOM     */
/* particles since they read better as fast 2D rises than as 3D mesh. */
/* ------------------------------------------------------------------ */

function MoodEmblem({ mood, size }: { mood: AxolotlMood; size: number }) {
  const u = (n: number) => Math.round(size * n);
  if (mood !== "happy") return null;
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 5 }}>
      <Heart
        size={u(0.18)}
        style={{ top: u(0.12), left: u(0.06), animation: "mood-rise 1.4s ease-out infinite" }}
      />
      <Heart
        size={u(0.14)}
        style={{ top: u(0.04), right: u(0.18), animation: "mood-rise 1.6s ease-out 0.35s infinite" }}
      />
      <Heart
        size={u(0.16)}
        style={{ top: u(0.16), right: u(0.0), animation: "mood-rise 1.8s ease-out 0.7s infinite" }}
      />
    </div>
  );
}

function Heart({
  size,
  style,
}: {
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="absolute"
      style={style}
    >
      <g fill="#ff5d8f">
        <rect x="2" y="3" width="4" height="2" />
        <rect x="10" y="3" width="4" height="2" />
        <rect x="1" y="5" width="6" height="3" />
        <rect x="9" y="5" width="6" height="3" />
        <rect x="2" y="8" width="12" height="2" />
        <rect x="3" y="10" width="10" height="2" />
        <rect x="5" y="12" width="6" height="2" />
        <rect x="7" y="14" width="2" height="1" />
      </g>
      <rect x="3" y="5" width="2" height="2" fill="#ffd7e3" />
    </svg>
  );
}

