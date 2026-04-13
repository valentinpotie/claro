import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { categoryLabels, responsabiliteLabels } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Home, MapPin, User } from "lucide-react";

export default function Qualification() {
  const { tickets, qualifyTicket } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "signale");
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Diagnostic</h1><p className="text-sm text-muted-foreground">Analyse de responsabilité par l'agent Claro</p></div>
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun ticket en attente de diagnostic</CardContent></Card>
      ) : filtered.map(t => (
        <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{t.reference}</span>
                {t.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}
                {t.responsabilite && <Badge variant="secondary" className="text-[10px]">{responsabiliteLabels[t.responsabilite]}</Badge>}
              </div>
              <p className="font-medium text-sm">{t.titre}</p>
              <p className="text-xs text-muted-foreground mt-1">{categoryLabels[t.categorie]}</p>
              <div className="grid gap-1.5 mt-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><User className="h-3 w-3" /> Locataire : {t.locataire.nom || "Non renseigné"}</p>
                <p className="flex items-center gap-1.5"><Home className="h-3 w-3" /> Propriétaire : {t.bien.proprietaire || "Non renseigné"}</p>
                <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {t.bien.adresse || "Adresse non renseignée"}{t.bien.lot ? ` · ${t.bien.lot}` : ""}</p>
              </div>
            </div>
            <Button onClick={() => qualifyTicket(t.id)} className="shrink-0"><Brain className="h-4 w-4 mr-2" /> Diagnostiquer <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
