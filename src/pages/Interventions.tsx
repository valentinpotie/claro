import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { priorityLabels, priorityColors } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { HardHat, Calendar, MapPin } from "lucide-react";

export default function Interventions() {
  const { tickets, updateTicket, getArtisan } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "intervention");
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Interventions</h1><p className="text-sm text-muted-foreground">Suivi des interventions planifiées</p></div>
      {filtered.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucune intervention en cours</CardContent></Card> :
      filtered.map(t => {
        const artisan = t.artisanId ? getArtisan(t.artisanId) : null;
        return (
          <Card key={t.id} className="border-0 shadow-sm"><CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge></div>
              <p className="font-medium text-sm">{t.titre}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><HardHat className="h-3 w-3" />{artisan?.nom}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.bien.adresse}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 ml-4 items-end">
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Date prévue</label>
              <Input type="date" className="w-40 h-8 text-xs" value={t.dateInterventionPrevue || ""} onChange={e => updateTicket(t.id, { dateInterventionPrevue: e.target.value })} />
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
}
