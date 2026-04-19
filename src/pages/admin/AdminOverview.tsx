import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Building2, ChevronRight, Terminal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { useAdminResolvers } from "@/hooks/useAdminResolvers";

type Counts = {
  agencies: number;
  activeTickets: number;
  reminders24h: { sent: number; skipped: number; failed: number };
  escalations: number;
  errors24h: number;
};

/** Tableau de bord admin : agrège les chiffres clés cross-agences et renvoie
 *  vers les sous-pages (Relances, Logs). Volontairement en lecture seule — aucune
 *  action destructive ici. */
export default function AdminOverview() {
  const { agencies, loading: resolversLoading } = useAdminResolvers();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!USE_SUPABASE) return;
    void (async () => {
      const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [active, escalated, reminders, errors] = await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).not("status", "in", "(cloture,rejete)"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("requires_manual_action", true),
        supabase.from("ticket_reminders").select("status").gte("created_at", since24h),
        supabase.from("function_logs").select("id", { count: "exact", head: true }).eq("level", "error").gte("created_at", since24h),
      ]);
      const remindersRows = (reminders.data ?? []) as { status: string }[];
      setCounts({
        agencies: agencies.length,
        activeTickets: active.count ?? 0,
        reminders24h: {
          sent: remindersRows.filter(r => r.status === "sent").length,
          skipped: remindersRows.filter(r => r.status === "skipped").length,
          failed: remindersRows.filter(r => r.status === "failed").length,
        },
        escalations: escalated.count ?? 0,
        errors24h: errors.count ?? 0,
      });
    })();
  }, [agencies.length]);

  const kpis = [
    { label: "Agences", value: counts?.agencies ?? "—", icon: Building2, tone: "text-foreground" },
    { label: "Tickets actifs", value: counts?.activeTickets ?? "—", icon: null, tone: "text-foreground" },
    {
      label: "Relances 24 h",
      value: counts ? `${counts.reminders24h.sent}` : "—",
      icon: Zap,
      tone: "text-foreground",
      sub: counts ? `${counts.reminders24h.skipped} skip · ${counts.reminders24h.failed} fail` : null,
    },
    { label: "Escalades en cours", value: counts?.escalations ?? "—", icon: AlertTriangle, tone: (counts?.escalations ?? 0) > 0 ? "text-amber-700" : "text-muted-foreground" },
    { label: "Erreurs 24 h", value: counts?.errors24h ?? "—", icon: AlertCircle, tone: (counts?.errors24h ?? 0) > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  const shortcuts = [
    { title: "Relances", desc: "Config par agence, tickets en escalade, preview + kill switch", to: "/admin/reminders", icon: Zap },
    { title: "Logs", desc: "Observabilité edge functions : filtres par agence, ticket, niveau", to: "/admin/logs", icon: Terminal },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tableau de bord admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue consolidée cross-agences — lecture seule.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon, tone, sub }) => (
          <div key={label} className="bg-card rounded-[4px] px-4 py-3 flex flex-col gap-1" style={{ boxShadow: "0 20px 60px -10px hsl(180 5% 11% / 0.06)" }}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              {Icon && <Icon className="h-3 w-3" />}
              <span>{label}</span>
            </div>
            <span className={cn("text-2xl font-bold font-display leading-none tabular-nums", tone)}>
              {resolversLoading && !counts ? "…" : value}
            </span>
            {sub && <span className="text-[10px] text-muted-foreground tabular-nums">{sub}</span>}
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Sections</p>
        <div className="grid gap-3 md:grid-cols-2">
          {shortcuts.map(({ title, desc, to, icon: Icon }) => (
            <Link key={to} to={to} className="group">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-[4px] bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {counts && counts.escalations > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {counts.escalations} ticket{counts.escalations > 1 ? "s" : ""} en escalade
              </p>
              <p className="text-xs text-muted-foreground">Plafond de relances atteint — intervention manuelle requise.</p>
            </div>
            <Link to="/admin/reminders">
              <Badge className="bg-primary text-primary-foreground border-0 text-[11px] cursor-pointer hover:bg-primary/90">
                Voir détail
              </Badge>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
