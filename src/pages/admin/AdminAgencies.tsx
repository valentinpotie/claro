import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Building2, Zap, FlaskConical, Users, Inbox, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { toast } from "sonner";

type AgencyRow = {
  id: string;
  name: string | null;
  code: string | null;
  email_contact: string | null;
  email_inbound: string | null;
  software: string | null;
  units_count: number | null;
  onboarding_done: boolean | null;
  demo_mode: boolean | null;
  created_at: string | null;
};

type SettingsRow = {
  agency_id: string;
  test_reminders_override_seconds: number | null;
  auto_reminders_enabled: boolean | null;
};

type Metrics = {
  ticketsTotal: number;
  ticketsActive: number;
  tickets30d: number;
  escalations: number;
  remindersSent30d: number;
  errors24h: number;
};

/** Page admin : liste toutes les agences avec stats d'activité + drawer de config
 *  pour basculer production/démo et régler les relances test (cross-agency via RLS
 *  super admin — policies 024 + 026). */
export default function AdminAgencies() {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [settings, setSettings] = useState<Record<string, SettingsRow>>({});
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    if (!USE_SUPABASE) { setLoading(false); return; }
    setLoading(true);
    const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();
    const since24h = new Date(Date.now() - 86400_000).toISOString();

    const [{ data: ag }, { data: st }, { data: tk }, { data: rm }, { data: err }] = await Promise.all([
      supabase.from("agencies").select("id, name, code, email_contact, email_inbound, software, units_count, onboarding_done, demo_mode, created_at").order("name"),
      supabase.from("agency_settings").select("agency_id, test_reminders_override_seconds, auto_reminders_enabled"),
      supabase.from("tickets").select("id, agency_id, status, created_at, requires_manual_action"),
      supabase.from("ticket_reminders").select("agency_id, status, created_at").gte("created_at", since30d),
      supabase.from("function_logs").select("agency_id").eq("level", "error").gte("created_at", since24h),
    ]);

    const agencyList = (ag ?? []) as AgencyRow[];
    const settingsMap: Record<string, SettingsRow> = {};
    for (const row of (st ?? []) as SettingsRow[]) settingsMap[row.agency_id] = row;

    // Agrège les métriques par agency_id (un seul pass O(N))
    const metricsMap: Record<string, Metrics> = {};
    const ensure = (id: string): Metrics => {
      if (!metricsMap[id]) metricsMap[id] = { ticketsTotal: 0, ticketsActive: 0, tickets30d: 0, escalations: 0, remindersSent30d: 0, errors24h: 0 };
      return metricsMap[id];
    };
    for (const a of agencyList) ensure(a.id); // init tous les buckets
    for (const t of ((tk ?? []) as Array<{ id: string; agency_id: string | null; status: string | null; created_at: string | null; requires_manual_action: boolean | null }>)) {
      if (!t.agency_id) continue;
      const m = ensure(t.agency_id);
      m.ticketsTotal++;
      if (t.status !== "cloture" && t.status !== "rejete") m.ticketsActive++;
      if (t.created_at && t.created_at >= since30d) m.tickets30d++;
      if (t.requires_manual_action) m.escalations++;
    }
    for (const r of ((rm ?? []) as Array<{ agency_id: string | null; status: string | null }>)) {
      if (!r.agency_id || r.status !== "sent") continue;
      ensure(r.agency_id).remindersSent30d++;
    }
    for (const e of ((err ?? []) as Array<{ agency_id: string | null }>)) {
      if (!e.agency_id) continue;
      ensure(e.agency_id).errors24h++;
    }

    setAgencies(agencyList);
    setSettings(settingsMap);
    setMetrics(metricsMap);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const selected = useMemo(() => agencies.find((a) => a.id === selectedId) ?? null, [agencies, selectedId]);

  const toggleDemoMode = async (agencyId: string, nextDemo: boolean) => {
    const { error } = await supabase.from("agencies").update({ demo_mode: nextDemo }).eq("id", agencyId);
    if (error) { toast.error("Bascule mode échouée", { description: error.message }); return; }
    toast.success(nextDemo ? "Agence basculée en mode démo" : "Agence basculée en production");
    setAgencies((prev) => prev.map((a) => a.id === agencyId ? { ...a, demo_mode: nextDemo } : a));
  };

  const updateTestSeconds = async (agencyId: string, seconds: number | null) => {
    const { error } = await supabase.from("agency_settings").update({ test_reminders_override_seconds: seconds }).eq("agency_id", agencyId);
    if (error) { toast.error("MAJ override échouée", { description: error.message }); return; }
    toast.success(seconds == null ? "Override désactivé" : `Override : ${seconds}s`);
    setSettings((prev) => ({ ...prev, [agencyId]: { ...(prev[agencyId] ?? { agency_id: agencyId, auto_reminders_enabled: null, test_reminders_override_seconds: null }), test_reminders_override_seconds: seconds } }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Agences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Volume, activité et réglages par agence. Cliquez sur une agence pour basculer production/démo et configurer les relances de test.
        </p>
      </div>

      {loading ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Chargement…</CardContent></Card>
      ) : agencies.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Aucune agence.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {agencies.map((a) => {
            const m = metrics[a.id] ?? { ticketsTotal: 0, ticketsActive: 0, tickets30d: 0, escalations: 0, remindersSent30d: 0, errors24h: 0 };
            const s = settings[a.id];
            const testOverride = s?.test_reminders_override_seconds ?? null;
            return (
              <Card
                key={a.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedId(a.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium truncate">{a.name ?? a.id.slice(0, 8)}</p>
                      </div>
                      {a.code && <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{a.code}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.demo_mode ? (
                        <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-0 gap-1 text-[10px]">
                          <FlaskConical className="h-3 w-3" /> Démo
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1 text-[10px]">
                          <Zap className="h-3 w-3" /> Production
                        </Badge>
                      )}
                      {testOverride != null && testOverride > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]" title="Mode test relances secondes">Test {testOverride}s</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <MetricCell icon={Inbox} label="Tickets" value={m.ticketsTotal} />
                    <MetricCell icon={Users} label="Actifs" value={m.ticketsActive} />
                    <MetricCell icon={Zap} label="Relances 30j" value={m.remindersSent30d} />
                    <MetricCell
                      icon={AlertTriangle}
                      label="Escalades"
                      value={m.escalations}
                      tone={m.escalations > 0 ? "text-amber-700" : undefined}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                    <span>{m.tickets30d} nouveau{m.tickets30d > 1 ? "x" : ""} sur 30j</span>
                    {m.errors24h > 0 && (
                      <span className="text-destructive">{m.errors24h} erreur{m.errors24h > 1 ? "s" : ""} 24h</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(v) => { if (!v) setSelectedId(null); }}>
        <SheetContent className="w-[460px] sm:max-w-[460px] overflow-y-auto">
          {selected && (() => {
            const s = settings[selected.id];
            const m = metrics[selected.id];
            const testOverride = s?.test_reminders_override_seconds ?? null;
            const isTestMode = testOverride != null && testOverride > 0;
            return (
              <div className="space-y-6">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {selected.name ?? selected.id.slice(0, 8)}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Créée le {selected.created_at ? new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                  </SheetDescription>
                </SheetHeader>

                {/* Infos agence */}
                <div className="space-y-2 text-xs">
                  {selected.code && <Row label="Code" value={<span className="font-mono">{selected.code}</span>} />}
                  {selected.software && <Row label="Logiciel" value={selected.software} />}
                  {selected.units_count != null && <Row label="Lots" value={String(selected.units_count)} />}
                  {selected.email_contact && <Row label="Contact" value={<span className="font-mono text-[11px]">{selected.email_contact}</span>} icon={Mail} />}
                  {selected.email_inbound && <Row label="Inbound" value={<span className="font-mono text-[11px] break-all">{selected.email_inbound}</span>} icon={Inbox} />}
                  <Row
                    label="Onboarding"
                    value={selected.onboarding_done
                      ? <Badge className="bg-success/15 text-success border-0 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>
                      : <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">En cours</Badge>}
                  />
                </div>

                {/* Stats */}
                {m && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Activité</p>
                    <div className="grid grid-cols-2 gap-2">
                      <SheetStat label="Tickets totaux" value={m.ticketsTotal} />
                      <SheetStat label="Actifs" value={m.ticketsActive} />
                      <SheetStat label="Nouveaux 30j" value={m.tickets30d} />
                      <SheetStat label="Escalades" value={m.escalations} tone={m.escalations > 0 ? "text-amber-700" : undefined} />
                      <SheetStat label="Relances envoyées 30j" value={m.remindersSent30d} />
                      <SheetStat label="Erreurs 24h" value={m.errors24h} tone={m.errors24h > 0 ? "text-destructive" : undefined} />
                    </div>
                  </div>
                )}

                {/* Mode prod / démo */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Mode</p>
                  <div className="flex items-center justify-between rounded-[4px] border p-3">
                    <div>
                      <p className="text-sm font-medium">Mode production</p>
                      <p className="text-[11px] text-muted-foreground">
                        {selected.demo_mode
                          ? "Démo : aucun email réel n'est envoyé."
                          : "Production : les emails sortent vraiment."}
                      </p>
                    </div>
                    <Switch
                      checked={!selected.demo_mode}
                      onCheckedChange={(checked) => void toggleDemoMode(selected.id, !checked)}
                    />
                  </div>
                </div>

                {/* Relances test secondes */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Relances de test</p>
                  <div className="rounded-[4px] border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Délai en secondes</p>
                        <p className="text-[11px] text-muted-foreground">
                          Active : override les délais configurés (jours) par la valeur en secondes — pour QA uniquement.
                        </p>
                      </div>
                      <Switch
                        checked={isTestMode}
                        onCheckedChange={(v) => void updateTestSeconds(selected.id, v ? 60 : null)}
                      />
                    </div>
                    {isTestMode && (
                      <div className="space-y-1">
                        <Label htmlFor="test-seconds" className="text-xs">Secondes</Label>
                        <Input
                          id="test-seconds"
                          type="number"
                          min={5}
                          value={testOverride ?? 60}
                          onChange={(e) => void updateTestSeconds(selected.id, parseInt(e.target.value, 10) || 60)}
                          className="h-8 text-sm w-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricCell({ icon: Icon, label, value, tone }: { icon: typeof Inbox; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[4px] bg-muted/40 px-2 py-1.5 flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className={cn("text-sm font-bold font-display tabular-nums leading-none", tone ?? "text-foreground")}>{value}</span>
    </div>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Building2 }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="flex-1 min-w-0">{value}</span>
    </div>
  );
}

function SheetStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-[4px] bg-muted/40 px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-bold font-display tabular-nums leading-none", tone ?? "text-foreground")}>{value}</span>
    </div>
  );
}
