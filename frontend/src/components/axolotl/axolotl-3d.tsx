"use client";

import { EffectComposer, EffectPass, PixelationEffect, RenderPass } from "postprocessing";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { cn } from "@/lib/utils";

/**
 * Mood state exposed by the chat-status store and consumed by every
 * mascot consumer. Kept here (rather than in a separate ``types`` file)
 * because the 3D renderer is the only canonical renderer of the mascot
 * — there is no longer an SVG fallback to share the type with.
 */
export type AxolotlMood =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "typing"
  | "happy"
  | "confused";

const MODEL_URL = "/models/axolotl-chibi.glb";
const CROSSFADE_S = 0.3;
// PixelationEffect granularity — each "pixel" is N×N actual pixels. 3-4 gives
// a subtle blocky look without destroying readability of the chibi features.
const PIXEL_GRANULARITY = 1.5;

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;

    // Camera tuned so the chibi sits in the upper-center of the canvas,
    // leaving room above the head for the mood emblems (bubble, "?", hearts).
    const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 50);
    camera.position.set(0, 0.8, 4.6);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone-map HDR values down to displayable range. Without this, the
    // HalfFloat framebuffer below sends values > 1.0 straight to the canvas
    // as pure white = the whole body looks overexposed.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Postprocessing — slight global pixelation to break the smooth cell-shading
    // edges, anchoring the 3D mascot in the same pixel-neubru aesthetic as
    // the rest of the UI. HalfFloat buffer preserves color accuracy through
    // the effect chain (8-bit would clip and wash out the body texture).
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });
    composer.setSize(size, size);
    composer.addPass(new RenderPass(scene, camera));
    const pixelEffect = new PixelationEffect(PIXEL_GRANULARITY);
    composer.addPass(new EffectPass(camera, pixelEffect));

    // Standard lighting — the tone mapping above handles HDR compression so
    // we don't have to dim the lights to compensate for the composer.
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
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

        // Hide the in-GLB emblem props (bubble / loupe / question / listen /
        // typing dots) — the chibi reads its mood through the body
        // animation alone, no extra overlay glyphs.
        const EMBLEM_NODES = new Set([
          "emblem_bubble",
          "emblem_loupe",
          "emblem_question",
          "emblem_listen",
          "emblem_typing",
        ]);
        // Collect skinned meshes that need outlining + the broken finB3 shell
        // so we can hide it and replace with a clean normal-offset outline.
        const skinnedToOutline: THREE.SkinnedMesh[] = [];
        gltf.scene.traverse((obj) => {
          if (EMBLEM_NODES.has(obj.name)) {
            obj.visible = false;
          }
          // finB3 = old inverted-hull outline mesh. Its uniform-scale shell
          // fractures at the limbs under skinning. Hide it and replace with
          // a shader-driven outline (see below).
          if (obj.name === "finB3") {
            obj.visible = false;
          }
          if (obj.name === "finB2" && obj instanceof THREE.SkinnedMesh) {
            skinnedToOutline.push(obj);
          }
        });

        // Build a clean inverted-hull outline as a sibling SkinnedMesh that
        // shares the same skeleton. Offset along the *skinned* normal in the
        // vertex shader → no pinching at limbs, no z-fighting.
        for (const src of skinnedToOutline) {
          const outlineMat = new THREE.ShaderMaterial({
            uniforms: {
              outlineColor: { value: new THREE.Color(0x631416) },
              outlineThickness: { value: 0.018 },
            },
            vertexShader: /* glsl */ `
              #include <common>
              #include <skinning_pars_vertex>
              uniform float outlineThickness;
              void main() {
                #include <skinbase_vertex>
                vec3 transformed = vec3(position);
                vec4 skinnedNormal = vec4(0.0);
                #ifdef USE_SKINNING
                  vec4 skinVertex = bindMatrix * vec4(transformed, 1.0);
                  vec4 skinned = vec4(0.0);
                  skinned += boneMatX * skinVertex * skinWeight.x;
                  skinned += boneMatY * skinVertex * skinWeight.y;
                  skinned += boneMatZ * skinVertex * skinWeight.z;
                  skinned += boneMatW * skinVertex * skinWeight.w;
                  transformed = (bindMatrixInverse * skinned).xyz;
                  vec4 nrm = bindMatrix * vec4(normal, 0.0);
                  skinnedNormal += boneMatX * nrm * skinWeight.x;
                  skinnedNormal += boneMatY * nrm * skinWeight.y;
                  skinnedNormal += boneMatZ * nrm * skinWeight.z;
                  skinnedNormal += boneMatW * nrm * skinWeight.w;
                  skinnedNormal = bindMatrixInverse * skinnedNormal;
                #else
                  skinnedNormal = vec4(normal, 0.0);
                #endif
                vec3 outlineDir = normalize(skinnedNormal.xyz);
                transformed += outlineDir * outlineThickness;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
              }
            `,
            fragmentShader: /* glsl */ `
              uniform vec3 outlineColor;
              void main() { gl_FragColor = vec4(outlineColor, 1.0); }
            `,
            side: THREE.BackSide,
          });
          const outlineMesh = new THREE.SkinnedMesh(src.geometry, outlineMat);
          outlineMesh.bind(src.skeleton, src.bindMatrix);
          outlineMesh.name = `${src.name}_outline`;
          // Sit at the same place as the body; the shader offsets each vert
          // along its skinned normal.
          src.parent?.add(outlineMesh);
        }

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info(
            "[axolotl-3d] loaded clips:",
            gltf.animations.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`),
          );
        }

        const initial = map.get(mood) ?? map.get("idle") ?? null;
        if (initial) {
          initial.reset().play();
          currentRef.current = initial;
        }
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
      composer.render();
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      composer.dispose();
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
    if (!map) return;
    const next = map.get(mood);
    if (!next) return;
    const current = currentRef.current;
    if (current === next) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.play();
    if (current) {
      current.crossFadeTo(next, CROSSFADE_S, false);
    }
    currentRef.current = next;
  }, [mood]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      aria-label="Animated axolotl mascot"
      role="img"
    />
  );
}
