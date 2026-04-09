import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { priorityLabels, priorityColors } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HardHat, Calendar } from "lucide-react";

export default function ConfirmationPassage() {
  const { tickets, confirmPassage, getArtisan } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "confirmation_passage");
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Confirmation passage</h1><p className="text-sm text-muted-foreground">Confirmez si l'artisan est bien intervenu</p></div>
      {filtered.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun passage à confirmer</CardContent></Card> :
      filtered.map(t => {
        const artisan = t.artisanId ? getArtisan(t.artisanId) : null;
        return (
          <Card key={t.id} className="border-0 shadow-sm"><CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge></div>
              <p className="font-medium text-sm">{t.titre}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><HardHat className="h-3 w-3" />{artisan?.nom}</span>
                {t.dateInterventionPrevue && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Prévu le {t.dateInterventionPrevue}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <Button size="sm" className="bg-success hover:bg-emerald-700" onClick={() => confirmPassage(t.id, true)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Oui</Button>
              <Button size="sm" variant="destructive" onClick={() => confirmPassage(t.id, false)}><XCircle className="h-3.5 w-3.5 mr-1" /> Non</Button>
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
}
