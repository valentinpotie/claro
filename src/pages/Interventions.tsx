import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { priorityLabels, priorityColors } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardHat, Play, CheckCircle2, Calendar, MapPin } from "lucide-react";

export default function Interventions() {
  const { tickets, startIntervention, completeIntervention, validateIntervention, getArtisan } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "intervention");
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-xl font-bold font-display">Interventions</h1><p className="text-sm text-muted-foreground">Suivi des interventions</p></div>
      {filtered.length === 0 ? <Card className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]"><CardContent className="py-12 text-center text-muted-foreground">Aucune intervention</CardContent></Card> :
      filtered.map(t => {
        const artisan = t.artisanId ? getArtisan(t.artisanId) : null;
        return (
          <Card key={t.id} className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]"><CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge>
                <Badge variant="outline" className={`status-badge border-0 ${t.interventionStatus === "termine" ? "bg-success/15 text-success" : t.interventionStatus === "en_cours" ? "bg-accent/15 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                  {t.interventionStatus === "termine" ? "Terminée" : t.interventionStatus === "en_cours" ? "En cours" : "Planifiée"}
                </Badge>
              </div>
              <p className="font-medium text-sm">{t.titre}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1"><span className="flex items-center gap-1"><HardHat className="h-3 w-3" />{artisan?.nom}</span>{t.rdv && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.rdv.date} à {t.rdv.heure}</span>}</div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 ml-4">
              {t.interventionStatus === "planifie" && <Button size="sm" onClick={() => startIntervention(t.id)}><Play className="h-3.5 w-3.5 mr-1" /> Démarrer</Button>}
              {t.interventionStatus === "en_cours" && <Button size="sm" onClick={() => completeIntervention(t.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Terminer</Button>}
              {t.interventionStatus === "termine" && !t.interventionValidee && <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => validateIntervention(t.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Valider</Button>}
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
}
