import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, Pause, RefreshCcw, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { statusLabels, TicketStatus } from "@/data/types";
import { toast } from "sonner";
import { useAdminResolvers } from "@/hooks/useAdminResolvers";

type ReminderSettingsLite = {
  agency_id: string;
  auto_reminders_enabled: boolean;
  test_reminders_override_seconds: number | null;
  escalation_reminders_count: number | null;
  escalation_delay_artisan_days: number | null;
  escalation_delay_owner_days: number | null;
  escalation_delay_tenant_days: number | null;
};

type EscalatedTicketLite = {
  id: string; reference: string | null; title: string | null; status: string | null; agency_id: string | null;
  reminders_sent_artisan: number | null; reminders_sent_owner: number | null; reminders_sent_tenant: number | null;
  reminder_paused_until: string | null;
};

type ReminderEventRow = {
  id: string;
  ticket_id: string;
  agency_id: string;
  role: "artisan" | "owner" | "tenant";
  status: "sent" | "skipped" | "failed";
  recipient_email: string | null;
  reason: string | null;
  created_at: string;
};

type DuePreview = {
  ticket_id: string; reference: string; agency_id: string; agency_name: string | null;
  role: "artisan" | "owner" | "tenant"; status: string; recipient_email: string | null;
  template_use_case: string; seconds_since_last_action: number;
  current_counter: number; max_counter: number; will_escalate: boolean;
  mode: string; skip_reason?: string;
};

/** Page admin dédiée aux relances : config par agence, tickets en escalade,
 *  historique cross-agences, preview dry-run + envoi manuel, kill switch. */
export default function AdminReminders() {
  const { agencies, agenciesById } = useAdminResolvers();
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [reminderSettings, setReminderSettings] = useState<ReminderSettingsLite[]>([]);
  const [escalatedTickets, setEscalatedTickets] = useState<EscalatedTicketLite[]>([]);
  const [recentEvents, setRecentEvents] = useState<ReminderEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DuePreview[] | null>(null);
  const [previewFetching, setPreviewFetching] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const refresh = async () => {
    if (!USE_SUPABASE) return;
    setLoading(true);
    const [{ data: rs }, { data: esc }, { data: ev }] = await Promise.all([
      supabase.from("agency_settings").select("agency_id, auto_reminders_enabled, test_reminders_override_seconds, escalation_reminders_count, escalation_delay_artisan_days, escalation_delay_owner_days, escalation_delay_tenant_days"),
      supabase.from("tickets").select("id, reference, title, status, agency_id, reminders_sent_artisan, reminders_sent_owner, reminders_sent_tenant, reminder_paused_until").eq("requires_manual_action", true).order("updated_at", { ascending: false }).limit(100),
      supabase.from("ticket_reminders").select("id, ticket_id, agency_id, role, status, recipient_email, reason, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setReminderSettings((rs ?? []) as ReminderSettingsLite[]);
    setEscalatedTickets((esc ?? []) as EscalatedTicketLite[]);
    setRecentEvents((ev ?? []) as ReminderEventRow[]);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const filteredSettings = useMemo(() => reminderSettings.filter(rs => agencyFilter === "all" || rs.agency_id === agencyFilter), [reminderSettings, agencyFilter]);
  const filteredEscalated = useMemo(() => escalatedTickets.filter(t => agencyFilter === "all" || t.agency_id === agencyFilter), [escalatedTickets, agencyFilter]);
  const filteredEvents = useMemo(() => recentEvents.filter(e => agencyFilter === "all" || e.agency_id === agencyFilter), [recentEvents, agencyFilter]);

  const callSendReminders = async (mode: "dry-run" | "auto"): Promise<{ reminders_sent: number; escalations_triggered: number; skipped: number; due: DuePreview[] }> => {
    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) throw new Error("Session non trouvée");
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ...(agencyFilter !== "all" ? { agency_id: agencyFilter } : {}), mode, triggered_by: "admin_page" }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
    return body;
  };

  const runPreview = async () => {
    setPreviewFetching(true);
    try {
      const body = await callSendReminders("dry-run");
      setPreview(body.due);
      if (body.due.length === 0) toast.success("Aucune relance due pour l'instant.");
    } catch (e) {
      toast.error("Preview échouée", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setPreviewFetching(false);
    }
  };

  const confirmSend = async () => {
    setTriggering(true);
    try {
      const body = await callSendReminders("auto");
      const { reminders_sent, escalations_triggered, skipped, due = [] } = body;
      const manualMode = due.length > 0 && reminders_sent === 0;
      if (manualMode) {
        toast.warning("Aucun envoi — agences en mode manuel", {
          description: `${due.length} due(s). Activez auto_reminders_enabled dans Settings pour que Claro envoie.`,
          duration: 10000,
        });
      } else {
        toast.success("Check exécuté", {
          description: `Envoyés : ${reminders_sent} · Escalades : ${escalations_triggered} · Skipped : ${skipped}`,
          duration: 8000,
        });
      }
      setPreview(null);
      void refresh();
    } catch (e) {
      toast.error("Échec du déclenchement", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setTriggering(false);
    }
  };

  const killSwitch = async () => {
    if (!confirm("Désactiver les relances automatiques pour TOUTES les agences ? Action réversible dans Settings.")) return;
    const { error } = await supabase.from("agency_settings").update({ auto_reminders_enabled: false }).gte("created_at", "2000-01-01");
    if (error) { toast.error("Kill switch échoué", { description: error.message }); return; }
    toast.success("Toutes les agences basculées en mode manuel");
    void refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Relances</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitoring, preview dry-run et kill switch cross-agences.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-52 h-9">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes agences</SelectItem>
              {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name ?? a.id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => void runPreview()} disabled={previewFetching} className="gap-1.5 border-amber-300/70 text-amber-800 hover:bg-amber-50">
            <Zap className={cn("h-3.5 w-3.5", previewFetching && "animate-pulse")} />
            Preview{agencyFilter !== "all" ? " (agence)" : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void killSwitch()} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5">
            <AlertCircle className="h-3.5 w-3.5" /> Kill switch
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading} className="gap-1.5">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {preview !== null && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" /> Relances dues — preview ({preview.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)} className="h-7 text-xs">Annuler</Button>
                <Button size="sm" onClick={() => void confirmSend()} disabled={triggering || preview.filter(p => p.mode === "would-send").length === 0} className="h-7 gap-1.5 text-xs">
                  <Zap className={cn("h-3 w-3", triggering && "animate-pulse")} />
                  Envoyer maintenant ({preview.filter(p => p.mode === "would-send").length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {preview.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune relance due.</p>
            ) : (
              <div className="rounded-[4px] border divide-y text-xs max-h-80 overflow-auto">
                {preview.map((p, i) => (
                  <div key={`${p.ticket_id}-${p.role}-${i}`} className="flex items-center gap-2 px-3 py-2">
                    <span className="font-mono text-muted-foreground shrink-0 w-16">{p.reference}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                    <span className="flex-1 truncate">{p.recipient_email ?? <span className="italic text-muted-foreground">pas d'email</span>}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">{p.current_counter}/{p.max_counter}</span>
                    {p.will_escalate && <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">→ escalade</Badge>}
                    {p.mode === "would-send" && <Badge className="bg-success/15 text-success border-0 text-[10px]">va partir</Badge>}
                    {p.mode === "would-skip-dedup" && <Badge className="bg-muted text-muted-foreground border-0 text-[10px]" title="Destinataire déjà relancé dans ce run">skip dedup</Badge>}
                    {p.mode === "would-skip-cooldown" && <Badge className="bg-muted text-muted-foreground border-0 text-[10px]" title={p.skip_reason ?? ""}>skip</Badge>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              "skip dedup" = même destinataire déjà relancé dans ce run · "skip" = agence en mode manuel ou cooldown 2h par (ticket, rôle).
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Config par agence</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSettings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucune configuration chargée.</p>
          ) : (
            <div className="rounded-[4px] border divide-y text-xs">
              <div className="grid grid-cols-[1fr_90px_110px_140px] gap-2 px-3 py-1.5 font-medium text-muted-foreground">
                <span>Agence</span>
                <span>Auto</span>
                <span>Test mode</span>
                <span>Délais (a/p/l) · max</span>
              </div>
              {filteredSettings.map((rs) => {
                const agency = agenciesById[rs.agency_id];
                return (
                  <div key={rs.agency_id} className="grid grid-cols-[1fr_90px_110px_140px] gap-2 px-3 py-2 items-center">
                    <span className="truncate font-medium">{agency?.name ?? rs.agency_id.slice(0, 8)}</span>
                    <Badge className={cn("text-[10px] border-0 w-fit", rs.auto_reminders_enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {rs.auto_reminders_enabled ? "ON" : "OFF"}
                    </Badge>
                    <span className={cn("text-[11px]", rs.test_reminders_override_seconds ? "text-amber-700 font-medium" : "text-muted-foreground")}>
                      {rs.test_reminders_override_seconds ? `${rs.test_reminders_override_seconds} s` : "—"}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {rs.escalation_delay_artisan_days ?? "—"}/{rs.escalation_delay_owner_days ?? "—"}/{rs.escalation_delay_tenant_days ?? "—"} j
                      <span className="opacity-60"> · max {rs.escalation_reminders_count ?? "—"}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Tickets en escalade <span className="font-normal text-muted-foreground">({filteredEscalated.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEscalated.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun ticket en escalade — plafond de relances jamais atteint.</p>
          ) : (
            <div className="rounded-[4px] border divide-y text-xs max-h-80 overflow-auto">
              {filteredEscalated.map((t) => {
                const agency = t.agency_id ? agenciesById[t.agency_id] : null;
                const total = (t.reminders_sent_artisan ?? 0) + (t.reminders_sent_owner ?? 0) + (t.reminders_sent_tenant ?? 0);
                const paused = t.reminder_paused_until && new Date(t.reminder_paused_until) > new Date();
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="font-mono text-destructive shrink-0">{t.reference ?? "—"}</span>
                    <span className="flex-1 truncate">{t.title ?? "—"}</span>
                    {agency && <span className="text-[11px] text-muted-foreground shrink-0">{agency.name ?? agency.id.slice(0, 8)}</span>}
                    {t.status && <Badge variant="secondary" className="text-[10px]">{statusLabels[t.status as TicketStatus] ?? t.status}</Badge>}
                    <span className="text-[11px] text-muted-foreground tabular-nums">{total} relance{total > 1 ? "s" : ""}</span>
                    {paused && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">Snooze</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historique récent ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun événement de relance sur les 50 dernières lignes.</p>
          ) : (
            <div className="rounded-[4px] border divide-y text-xs max-h-96 overflow-auto">
              {filteredEvents.map((ev) => {
                const agency = agenciesById[ev.agency_id];
                const StatusIcon = ev.status === "sent" ? CheckCircle2 : ev.status === "failed" ? X : Pause;
                const colorClass = ev.status === "sent" ? "text-success" : ev.status === "failed" ? "text-destructive" : "text-muted-foreground";
                return (
                  <div key={ev.id} className="flex items-center gap-2 px-3 py-1.5">
                    <StatusIcon className={cn("h-3 w-3 shrink-0", colorClass)} />
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {new Date(ev.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{ev.role}</Badge>
                    <span className={cn("capitalize", colorClass)}>{ev.status}</span>
                    {ev.recipient_email && <span className="text-muted-foreground truncate">{ev.recipient_email}</span>}
                    {ev.reason && <span className="text-muted-foreground italic truncate">{ev.reason}</span>}
                    {agency && <span className="text-[11px] text-muted-foreground shrink-0 ml-auto">{agency.name ?? agency.id.slice(0, 8)}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
