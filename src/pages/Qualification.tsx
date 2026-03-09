import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { categoryLabels, priorityLabels, priorityColors } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight } from "lucide-react";

export default function Qualification() {
  const { tickets, qualifyTicket } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "signale");
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-xl font-bold">Qualification</h1><p className="text-sm text-muted-foreground">Analyse de responsabilité par l'agent IA</p></div>
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun ticket en attente de qualification</CardContent></Card>
      ) : filtered.map(t => (
        <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{t.reference}</span>
                <Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge>
                {t.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}
              </div>
              <p className="font-medium text-sm">{t.titre}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.locataire.nom} · {categoryLabels[t.categorie]}</p>
            </div>
            <Button onClick={() => qualifyTicket(t.id)} className="shrink-0"><Brain className="h-4 w-4 mr-2" /> Qualifier <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
