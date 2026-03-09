import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, statusColors, workflowSteps } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2, HardHat, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { tickets } = useTickets();
  const navigate = useNavigate();
  const ouverts = tickets.filter(t => t.status !== "cloture").length;
  const urgents = tickets.filter(t => t.urgence || t.priorite === "urgente").length;
  const interventions = tickets.filter(t => t.status === "intervention").length;
  const clotures = tickets.filter(t => t.status === "cloture").length;
  const statusCounts = workflowSteps.map(s => ({ ...s, count: tickets.filter(t => t.status === s.key).length }));
  const recentTickets = [...tickets].sort((a, b) => b.dateMaj.localeCompare(a.dateMaj)).slice(0, 5);
  const routeMap: Record<string, string> = { signale: "/qualification", qualifie: "/qualification", recherche_artisan: "/artisans", validation_proprio: "/validation", planifie: "/planification", intervention: "/interventions", facturation: "/facturation", cloture: "/cloture" };
  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold">Tableau de bord</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Ouverts</p><p className="text-2xl font-bold">{ouverts}</p></div><Clock className="h-8 w-8 text-primary/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Urgents</p><p className="text-2xl font-bold text-destructive">{urgents}</p></div><AlertTriangle className="h-8 w-8 text-destructive/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Interventions</p><p className="text-2xl font-bold">{interventions}</p></div><HardHat className="h-8 w-8 text-accent/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Clôturés</p><p className="text-2xl font-bold text-success">{clotures}</p></div><CheckCircle2 className="h-8 w-8 text-success/20" /></div></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline</CardTitle></CardHeader><CardContent><div className="space-y-2">
          {statusCounts.map(s => (
            <div key={s.key} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1.5 transition-colors" onClick={() => navigate(routeMap[s.key] || "/tickets")}>
              <Badge variant="outline" className={`status-badge border-0 w-24 justify-center ${statusColors[s.key]}`}>{s.label}</Badge>
              <div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, s.count * 25)}%` }} /></div>
              <span className="text-sm font-semibold w-6 text-right">{s.count}</span>
            </div>
          ))}
        </div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">Tickets récents</CardTitle></CardHeader><CardContent><div className="space-y-2">
          {recentTickets.map(t => (
            <div key={t.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1.5 transition-colors" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{t.titre}</p><p className="text-[10px] text-muted-foreground">{t.reference} · {t.locataire.nom}</p></div>
              <Badge variant="outline" className={`status-badge border-0 text-[10px] ${statusColors[t.status]}`}>{statusLabels[t.status]}</Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div></CardContent></Card>
      </div>
    </div>
  );
}
