import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { AgencySettings } from "@/data/types";
import { Home, Wrench, User } from "lucide-react";

interface Props {
  settings: AgencySettings;
  onChange: (data: Partial<AgencySettings>) => void;
}

function delayLabel(days: number) {
  return days === 1 ? "1 jour" : `${days} jours`;
}

interface SliderRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function SliderRow({ icon, label, value, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{delayLabel(value)}</span>
      </div>
      <Slider
        min={1}
        max={14}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>1 jour</span>
        <span>14 jours</span>
      </div>
    </div>
  );
}

export function EscalationDelaySettings({ settings, onChange }: Props) {
  // Local state for immediate slider feedback
  const [owner, setOwner]     = useState(settings.escalation_delay_owner_days);
  const [artisan, setArtisan] = useState(settings.escalation_delay_artisan_days);
  const [tenant, setTenant]   = useState(settings.escalation_delay_tenant_days);

  // Keep local state in sync if parent settings change externally
  useEffect(() => { setOwner(settings.escalation_delay_owner_days); },   [settings.escalation_delay_owner_days]);
  useEffect(() => { setArtisan(settings.escalation_delay_artisan_days); }, [settings.escalation_delay_artisan_days]);
  useEffect(() => { setTenant(settings.escalation_delay_tenant_days); },  [settings.escalation_delay_tenant_days]);

  // Debounce: persist to DB 600ms after the last slider move
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = (patch: Partial<AgencySettings>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(patch), 600);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configurez les délais de relance automatique en l'absence de réponse, par type de contact.
      </p>
      <SliderRow
        icon={<Home className="h-3.5 w-3.5 text-muted-foreground" />}
        label="Propriétaire"
        value={owner}
        onChange={v => { setOwner(v); flush({ escalation_delay_owner_days: v }); }}
      />
      <SliderRow
        icon={<Wrench className="h-3.5 w-3.5 text-muted-foreground" />}
        label="Artisan"
        value={artisan}
        onChange={v => { setArtisan(v); flush({ escalation_delay_artisan_days: v }); }}
      />
      <SliderRow
        icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
        label="Locataire"
        value={tenant}
        onChange={v => { setTenant(v); flush({ escalation_delay_tenant_days: v }); }}
      />
    </div>
  );
}
