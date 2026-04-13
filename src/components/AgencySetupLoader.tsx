import { useEffect, useRef } from "react";

export interface LoaderConfig {
  /** ms for the simulated fill animation — minimum 6 s by default */
  loadDuration?: number;
  /** ms for the dissolve-out transition */
  exitDuration?: number;
  /** Full-screen background color */
  background?: string;
  /** Color of the unfilled (ghost) text */
  ghostColor?: string;
  /** Color of the filled (revealed) text */
  brightColor?: string;
  /** Color for the progress bar and step messages */
  accentColor?: string;
  /** CSS font-size value for the main word */
  fontSize?: string;
}

interface Props {
  isComplete: boolean;
  onExitDone: () => void;
  config?: LoaderConfig;
}

const STEPS = [
  { at: 0.00, label: "Création de votre espace..." },
  { at: 0.20, label: "Configuration de l'agence..." },
  { at: 0.40, label: "Import des paramètres..." },
  { at: 0.60, label: "Connexion aux services..." },
  { at: 0.80, label: "Finalisation..." },
  { at: 0.95, label: "Presque prêt !" },
];

// Smooth symmetric ease — used for fill progress
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
// Accelerating ease — used for the dissolve-out (slow start → quick disappear)
const easeInCubic = (t: number) => t * t * t;

/** Generates a clip-path polygon that reveals from bottom to top with a sinusoidal wave edge. */
function waveClip(progress: number, now: number): string {
  const topY = (1 - progress) * 100;
  const speed = now / 600;
  const pts = 28;
  // Wave amplitude peaks at 50 % progress, vanishes at 0 % and 100 %
  const amp = 9 * Math.sin(progress * Math.PI);

  let s = "0% 101%";
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * 100;
    const y = topY + Math.sin((i / pts) * Math.PI * 2.5 + speed) * amp;
    s += `, ${x.toFixed(1)}% ${y.toFixed(1)}%`;
  }
  s += ", 100% 101%";
  return `polygon(${s})`;
}

export function AgencySetupLoader({ isComplete, onExitDone, config = {} }: Props) {
  const {
    loadDuration = 6000,
    exitDuration = 1100,
    background = "#0a0a0a",
    ghostColor = "#1e1e1e",
    brightColor = "#ffffff",
    accentColor = "hsl(72 100% 50%)",
    fontSize = "clamp(80px, 18vw, 320px)",
  } = config;

  // DOM refs — mutated directly from RAF loop (zero re-renders)
  const containerRef = useRef<HTMLDivElement>(null);
  const brightRef    = useRef<HTMLSpanElement>(null);
  const barRef       = useRef<HTMLDivElement>(null);
  const msgRef       = useRef<HTMLParagraphElement>(null);
  const rafRef       = useRef<number>(0);

  // Mutable animation state
  const phaseRef          = useRef<"load" | "exit">("load");
  const loadStartRef      = useRef<number>(0);
  const exitStartRef      = useRef<number>(0);
  const isCompleteRef     = useRef(isComplete);
  const msgIndexRef       = useRef<number>(0);
  const onExitDoneRef     = useRef(onExitDone);

  // Config values captured once at mount — used inside the RAF closure
  const loadDurationRef   = useRef(loadDuration);
  const exitDurationRef   = useRef(exitDuration);

  useEffect(() => { isCompleteRef.current  = isComplete; },  [isComplete]);
  useEffect(() => { onExitDoneRef.current  = onExitDone; },  [onExitDone]);

  useEffect(() => {
    const container = containerRef.current;
    const bright    = brightRef.current;
    const bar       = barRef.current;
    const msg       = msgRef.current;
    if (!container || !bright || !bar || !msg) return;

    msg.textContent = STEPS[0].label;

    function tick(timestamp: number) {
      // ── LOAD PHASE ─────────────────────────────────────────────────────────
      if (phaseRef.current === "load") {
        if (loadStartRef.current === 0) loadStartRef.current = timestamp;
        const elapsed  = timestamp - loadStartRef.current;
        const rawT     = Math.min(elapsed / loadDurationRef.current, 1);
        const progress = easeInOut(rawT);

        // Wave fill
        if (bright) bright.style.clipPath = waveClip(progress, timestamp);

        // Progress bar
        if (bar) bar.style.width = `${progress * 100}%`;

        // Step messages — fade between labels
        let target = 0;
        for (let i = 0; i < STEPS.length; i++) {
          if (progress >= STEPS[i].at) target = i;
        }
        if (target !== msgIndexRef.current && msg) {
          msgIndexRef.current = target;
          msg.style.opacity = "0";
          window.setTimeout(() => {
            if (msg) { msg.textContent = STEPS[target].label; msg.style.opacity = "1"; }
          }, 80);
        }

        // Transition to exit only when fill is complete AND backend has signalled done
        if (progress >= 1 && isCompleteRef.current) {
          phaseRef.current  = "exit";
          exitStartRef.current = timestamp;
        }

      // ── EXIT PHASE ─────────────────────────────────────────────────────────
      } else if (phaseRef.current === "exit") {
        const elapsed = timestamp - exitStartRef.current;
        const t  = Math.min(elapsed / exitDurationRef.current, 1);
        const ez = easeInCubic(t);

        if (container) {
          // Subtle scale-up + dissolve blur + fade — no explosive zoom, no pixelation
          container.style.transform = `scale(${1 + ez * 0.07})`;
          container.style.opacity   = String(1 - ez);
          container.style.filter    = `blur(${(ez * 14).toFixed(1)}px)`;
        }

        if (t >= 1) {
          cancelAnimationFrame(rafRef.current);
          onExitDoneRef.current();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      role="status"
      aria-label="Chargement de votre espace Claro"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transformOrigin: "center center",
        willChange: "transform, opacity, filter",
        backfaceVisibility: "hidden",
      }}
    >
      {/* Main word with wave-fill effect */}
      <div style={{ position: "relative", lineHeight: 1, userSelect: "none" }}>

        {/* Ghost layer — always visible, dark */}
        <span
          style={{
            display: "block",
            fontSize,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: ghostColor,
          }}
        >
          Claro
        </span>

        {/* Bright layer — revealed bottom-to-top via animated clip-path */}
        <span
          ref={brightRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "block",
            fontSize,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: brightColor,
            // 4-point rectangle entirely below viewport — nothing visible at start
            clipPath: "polygon(0% 101%, 100% 101%, 100% 102%, 0% 102%)",
          }}
        >
          Claro
        </span>
      </div>

      {/* Step message */}
      <p
        ref={msgRef}
        aria-live="polite"
        style={{
          marginTop: "2.5rem",
          fontSize: "0.75rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accentColor,
          fontFamily: "'Manrope', system-ui, sans-serif",
          opacity: 1,
          transition: "opacity 150ms ease",
          height: "1.25rem",
        }}
      />

      {/* 1 px progress bar */}
      <div
        style={{
          marginTop: "0.875rem",
          width: "clamp(180px, 28vw, 300px)",
          height: "1px",
          background: ghostColor,
          overflow: "hidden",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: "0%",
            background: accentColor,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
}
