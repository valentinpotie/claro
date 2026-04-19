import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Clock, Pause, Play, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import type { Ticket } from "@/data/types";

type ReminderRow = {
  id: string;
  role: "artisan" | "owner" | "tenant";
  status: "sent" | "skipped" | "failed";
  recipient_email: string | null;
  reason: string | null;
  template_use_case: string | null;
  counter_after: number | null;
  triggered_by: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<ReminderRow["role"], string> = {
  artisan: "Artisan",
  owner: "Propriétaire",
  tenant: "Locataire",
};

/** Panneau d'observabilité des relances d'un ticket — historique chronologique, ETA
 *  prochaine relance, statut de l'escalade, bouton snooze 48h. */
export function TicketReminders({ ticket }: { ticket: Ticket }) {
  const { settings } = useSettings();
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ticket_reminders")
      .select("id, role, status, recipient_email, reason, template_use_case, counter_after, triggered_by, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setRows((data ?? []) as ReminderRow[]);
    setLoading(false);
  };

  useEffect(() => { void fetchRows(); }, [ticket.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const role: ReminderRow["role"] | null =
    ticket.status === "contact_artisan" ? "artisan" :
    ticket.status === "validation_proprio" ? "owner" :
    ticket.status === "confirmation_passage" ? "tenant" : null;

  // Prochaine ETA = last_action_at + délai du rôle actuel (en secondes, tolère test override)
  const nextEta = (() => {
    if (!role || !ticket.lastActionAt) return null;
    const testSec = settings.test_reminders_override_seconds ?? 0;
    const delayDays = role === "artisan" ? settings.escalation_delay_artisan_days
                   : role === "owner"   ? settings.escalation_delay_owner_days
                                        : settings.escalation_delay_tenant_days;
    const delaySec = testSec > 0 ? testSec : delayDays * 86400;
    const nextMs = new Date(ticket.lastActionAt).getTime() + delaySec * 1000;
    return { nextMs, delaySec, testOverride: testSec > 0 };
  })();

  const nextEtaLabel = (() => {
    if (!nextEta) return null;
    const remainingMs = nextEta.nextMs - Date.now();
    if (remainingMs <= 0) return { label: "Dû maintenant", overdue: true };
    if (remainingMs < 60_000) return { label: `dans ${Math.ceil(remainingMs / 1000)} s`, overdue: false };
    if (remainingMs < 3600_000) return { label: `dans ${Math.ceil(remainingMs / 60_000)} min`, overdue: false };
    if (remainingMs < 86400_000) return { label: `dans ${Math.ceil(remainingMs / 3600_000)} h`, overdue: false };
    return { label: `dans ${Math.ceil(remainingMs / 86400_000)} j`, overdue: false };
  })();

  const maxCounter = settings.escalation_reminders_count;
  const currentCounter = role === "artisan" ? (ticket.reminders_sent_artisan ?? 0)
                        : role === "owner"   ? (ticket.reminders_sent_owner ?? 0)
                        : role === "tenant"  ? (ticket.reminders_sent_tenant ?? 0)
                                             : 0;
  const pausedUntil = ticket.reminder_paused_until ? new Date(ticket.reminder_paused_until) : null;
  const isPaused = !!pausedUntil && pausedUntil > new Date();

  const snooze = async (hours: number) => {
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    const { error } = await supabase.from("tickets").update({ reminder_paused_until: until }).eq("id", ticket.id);
    if (error) { toast.error("Snooze échoué", { description: error.message }); return; }
    toast.success(`Relances en pause ${hours}h`);
    await fetchRows();
  };

  const unpause = async () => {
    const { error } = await supabase.from("tickets").update({ reminder_paused_until: null }).eq("id", ticket.id);
    if (error) { toast.error("Erreur", { description: error.message }); return; }
    toast.success("Relances réactivées");
    await fetchRows();
  };

  const clearEscalation = async () => {
    const { error } = await supabase.from("tickets").update({ requires_manual_action: false }).eq("id", ticket.id);
    if (error) { toast.error("Erreur", { description: error.message }); return; }
    toast.success("Escalade levée — relances reprendront au prochain check");
  };

  if (!role && rows.length === 0) return null;  // aucun rôle relevant, pas d'historique → masqué

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" /> Relances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* État actuel */}
        {role && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Rôle concerné :</span>
              <Badge variant="secondary" className="text-[10px]">{ROLE_LABEL[role]}</Badge>
              <span className="text-muted-foreground">·</span>
              <span className="tabular-nums">{currentCounter}/{maxCounter} relance{maxCounter > 1 ? "s" : ""}</span>
              {ticket.requires_manual_action && (
                <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" /> Plafond atteint — action manuelle
                </Badge>
              )}
            </div>
            {isPaused && pausedUntil && (
              <div className="flex items-center gap-2">
                <Pause className="h-3 w-3 text-amber-600" />
                <span className="text-amber-700">En pause jusqu'au {pausedUntil.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            {nextEtaLabel && !isPaused && !ticket.requires_manual_action && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className={nextEtaLabel.overdue ? "text-amber-700 font-medium" : "text-muted-foreground"}>
                  Prochaine relance : {nextEtaLabel.label}
                  {nextEta.testOverride && <span className="ml-1 text-[10px]">(test {nextEta.delaySec}s)</span>}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isPaused ? (
            <Button size="sm" variant="outline" onClick={unpause} className="h-7 gap-1.5 text-xs">
              <Play className="h-3 w-3" /> Lever la pause
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => snooze(48)} className="h-7 gap-1.5 text-xs">
              <Pause className="h-3 w-3" /> Reporter 48h
            </Button>
          )}
          {ticket.requires_manual_action && (
            <Button size="sm" variant="outline" onClick={clearEscalation} className="h-7 gap-1.5 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Lever l'escalade
            </Button>
          )}
        </div>

        {/* Historique */}
        <div className="space-y-1 pt-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Historique</p>
          {loading && <p className="text-muted-foreground italic">Chargement…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-muted-foreground italic">Aucun événement enregistré pour ce ticket.</p>
          )}
          {rows.length > 0 && (
            <div className="rounded-[4px] border divide-y max-h-48 overflow-auto">
              {rows.map((r) => {
                const StatusIcon = r.status === "sent" ? CheckCircle2 : r.status === "failed" ? X : Pause;
                const colorClass = r.status === "sent" ? "text-success"
                                  : r.status === "failed" ? "text-destructive"
                                                          : "text-muted-foreground";
                return (
                  <div key={r.id} className="flex items-center gap-2 px-2 py-1.5">
                    <StatusIcon className={`h-3 w-3 shrink-0 ${colorClass}`} />
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{ROLE_LABEL[r.role]}</Badge>
                    <span className={`${colorClass} capitalize`}>{r.status}</span>
                    {r.reason && <span className="text-muted-foreground truncate italic">{r.reason}</span>}
                    {r.recipient_email && <span className="text-muted-foreground truncate ml-auto">{r.recipient_email}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
