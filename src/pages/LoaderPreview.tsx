import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AgencySetupLoader } from "@/components/AgencySetupLoader";
import type { LoaderConfig } from "@/components/AgencySetupLoader";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// ── Small helpers ────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="w-48 shrink-0 text-right text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-input bg-transparent p-0"
        />
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
    </Row>
  );
}

// ── Defaults (match AgencySetupLoader defaults) ──────────────────────────────

const DEFAULTS = {
  loadDuration:  6000,
  exitDuration:  1100,
  backendDelay:  3000,
  fontSizeVw:    18,
  background:    "#0a0a0a",
  ghostColor:    "#1e1e1e",
  brightColor:   "#ffffff",
  accentColor:   "#ccff00",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function LoaderPreview() {
  const navigate = useNavigate();
  const [running,     setRunning]     = useState(false);
  const [backendDone, setBackendDone] = useState(false);

  // Timing
  const [loadDuration,  setLoadDuration]  = useState(DEFAULTS.loadDuration);
  const [exitDuration,  setExitDuration]  = useState(DEFAULTS.exitDuration);
  const [backendDelay,  setBackendDelay]  = useState(DEFAULTS.backendDelay);

  // Visual
  const [fontSizeVw, setFontSizeVw] = useState(DEFAULTS.fontSizeVw);
  const [background,  setBackground]  = useState(DEFAULTS.background);
  const [ghostColor,  setGhostColor]  = useState(DEFAULTS.ghostColor);
  const [brightColor, setBrightColor] = useState(DEFAULTS.brightColor);
  const [accentColor, setAccentColor] = useState(DEFAULTS.accentColor);

  const config: LoaderConfig = {
    loadDuration,
    exitDuration,
    background,
    ghostColor,
    brightColor,
    accentColor,
    fontSize: `clamp(60px, ${fontSizeVw}vw, 500px)`,
  };

  const start = () => {
    setBackendDone(false);
    setRunning(true);
    window.setTimeout(() => setBackendDone(true), backendDelay);
  };

  const reset = () => {
    setLoadDuration(DEFAULTS.loadDuration);
    setExitDuration(DEFAULTS.exitDuration);
    setBackendDelay(DEFAULTS.backendDelay);
    setFontSizeVw(DEFAULTS.fontSizeVw);
    setBackground(DEFAULTS.background);
    setGhostColor(DEFAULTS.ghostColor);
    setBrightColor(DEFAULTS.brightColor);
    setAccentColor(DEFAULTS.accentColor);
  };

  return (
    <>
      {running && (
        <AgencySetupLoader
          isComplete={backendDone}
          onExitDone={() => { setRunning(false); setBackendDone(false); }}
          config={config}
        />
      )}

      {!running && (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-8">

          <div className="text-center">
            <p className="text-base font-semibold font-display">AgencySetupLoader — Preview</p>
            <p className="text-sm text-muted-foreground mt-1">Ajuste les paramètres ci-dessous puis lance l'animation</p>
          </div>

          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 space-y-1">

            {/* ── Timing ── */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pb-2">Timing</p>

            <Row label={`Durée chargement: ${(loadDuration / 1000).toFixed(1)} s`}>
              <Slider value={[loadDuration]} onValueChange={([v]) => setLoadDuration(v)}
                min={2000} max={12000} step={500} />
            </Row>
            <Row label={`Délai backend simulé: ${(backendDelay / 1000).toFixed(1)} s`}>
              <Slider value={[backendDelay]} onValueChange={([v]) => setBackendDelay(v)}
                min={0} max={10000} step={500} />
            </Row>
            <Row label={`Durée sortie: ${(exitDuration / 1000).toFixed(1)} s`}>
              <Slider value={[exitDuration]} onValueChange={([v]) => setExitDuration(v)}
                min={400} max={2500} step={100} />
            </Row>

            <div className="pt-3 pb-1 border-t border-border mt-3" />

            {/* ── Typography ── */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pb-2">Typographie</p>

            <Row label={`Taille: ${fontSizeVw} vw`}>
              <Slider value={[fontSizeVw]} onValueChange={([v]) => setFontSizeVw(v)}
                min={6} max={40} step={1} />
            </Row>

            <div className="pt-3 pb-1 border-t border-border mt-3" />

            {/* ── Colors ── */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pb-2">Couleurs</p>

            <ColorRow label="Fond"           value={background}  onChange={setBackground} />
            <ColorRow label="Texte fantôme"  value={ghostColor}  onChange={setGhostColor} />
            <ColorRow label="Texte révélé"   value={brightColor} onChange={setBrightColor} />
            <ColorRow label="Accent (barre)" value={accentColor} onChange={setAccentColor} />
          </div>

          <div className="flex gap-3">
            <Button size="lg" onClick={start}>Lancer l&apos;animation</Button>
            <Button variant="outline" onClick={reset}>Réinitialiser</Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          </div>

        </div>
      )}
    </>
  );
}
