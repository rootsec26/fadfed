"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * Procedural "breathing" scene — zero external assets.
 * One soft organic blob breathes on a ~7s cycle; matte pebbles drift
 * around it. All colors come from the site palette (see COLORS below).
 */

/* ── Tweak these ─────────────────────────────────────────────── */
const BREATH_PERIOD = 7; // seconds per full inhale+exhale cycle
const BREATH_DEPTH = 0.1; // scale swing (0.1 = ±10%)
const PARALLAX = 0.06; // radians of camera-rig tilt at screen edge
const DISTORT = 0.34; // surface wobble amount
const DISTORT_SPEED = 1.3;

const COLORS = {
  center: "#7fb8a8", // soft mint-green blob
  pebbleA: "#a8c3b5", // sage
  pebbleB: "#d98b6a", // warm peach accent (one pebble only)
  pebbleC: "#c2deda", // brand-200 mist
  pebbleD: "#e8d9c8", // soft sand
};
/* ────────────────────────────────────────────────────────────── */

type BreathPhase = "inhale" | "exhale";

function Blob({ onPhase }: { onPhase?: (p: BreathPhase) => void }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const lastPhase = useRef<BreathPhase>("inhale");

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const wave = Math.sin((t / BREATH_PERIOD) * Math.PI * 2);
    mesh.current.scale.setScalar(1 + wave * BREATH_DEPTH);
    const phase: BreathPhase = wave > 0 ? "inhale" : "exhale";
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      onPhase?.(phase);
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1.15, 48, 48]} />
      <MeshDistortMaterial
        color={COLORS.center}
        distort={DISTORT}
        speed={DISTORT_SPEED}
        roughness={0.55}
        metalness={0.04}
      />
    </mesh>
  );
}

const PEBBLES: { pos: [number, number, number]; r: number; color: string; floatSpeed: number; floatDist: number }[] = [
  { pos: [-2.6, 0.9, -0.8], r: 0.32, color: COLORS.pebbleA, floatSpeed: 0.9, floatDist: 0.35 },
  { pos: [2.7, -0.4, -1.2], r: 0.42, color: COLORS.pebbleB, floatSpeed: 0.7, floatDist: 0.45 },
  { pos: [-2.2, -1.3, -1.6], r: 0.22, color: COLORS.pebbleC, floatSpeed: 1.1, floatDist: 0.3 },
  { pos: [2.3, 1.2, -1.8], r: 0.26, color: COLORS.pebbleD, floatSpeed: 0.8, floatDist: 0.4 },
  { pos: [0.4, -1.9, -2.4], r: 0.18, color: COLORS.pebbleA, floatSpeed: 1.2, floatDist: 0.28 },
  { pos: [-1.4, 1.8, -2.0], r: 0.2, color: COLORS.pebbleC, floatSpeed: 1.0, floatDist: 0.32 },
];

function Pebbles() {
  return (
    <>
      {PEBBLES.map((p, i) => (
        <Float key={i} speed={p.floatSpeed} rotationIntensity={0.4} floatIntensity={p.floatDist} floatingRange={[-0.2, 0.2]}>
          <mesh position={p.pos}>
            <sphereGeometry args={[p.r, 24, 24]} />
            <meshStandardMaterial color={p.color} roughness={0.6} metalness={0.03} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

/** Gentle pointer parallax on the whole rig — desktop fine pointers only. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target.current.x * PARALLAX, 2.5, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -target.current.y * PARALLAX, 2.5, dt);
  });

  return <group ref={ref}>{children}</group>;
}

export function BreathingScene({ onPhase }: { onPhase?: (p: BreathPhase) => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      {/* Soft warm lighting — no external HDR/environment downloads */}
      <ambientLight intensity={0.85} color="#fff4e4" />
      <hemisphereLight args={["#eaf4ef", "#f3e7d8", 0.55]} />
      <directionalLight position={[4, 6, 5]} intensity={1.15} color="#ffe9cf" />
      <directionalLight position={[-5, -2, 3]} intensity={0.3} color="#cfe4da" />
      <pointLight position={[0, -3, 4]} intensity={12} color="#d98b6a" distance={12} decay={2} />

      <Rig>
        <Blob onPhase={onPhase} />
        <Pebbles />
      </Rig>
    </Canvas>
  );
}
