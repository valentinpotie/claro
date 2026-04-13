import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Euro, ArrowRight } from "lucide-react";

export default function Validation() {
  const { tickets, validateQuote, ownerRespond } = useTickets();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "validation_proprio");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Accord propriétaire</h1>
        <p className="text-sm text-muted-foreground">
          {settings.always_ask_owner
            ? "Accord propriétaire requis pour tous les devis (règle agence)"
            : `Seuil de délégation : ${settings.delegation_threshold} €`}
        </p>
      </div>
      {filtered.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun devis en attente</CardContent></Card> :
      filtered.map(t => {
        const quote = t.quotes.find(q => q.id === t.selectedQuoteId);
        return (
          <Card key={t.id} className="border-0 shadow-sm"><CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span>{t.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}</div>
              <p className="font-medium text-sm">{t.titre}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.bien.proprietaire}</p>
              {quote && <div className="mt-2 p-2 bg-muted rounded text-xs"><span className="font-medium">{quote.artisanNom}</span> — <Euro className="h-3 w-3 inline" /> {quote.montant} € — {quote.delai}<p className="text-muted-foreground mt-0.5">{quote.description}</p></div>}
              <Badge className="mt-2 bg-warning/15 text-warning border-0 text-[10px]">
                {settings.always_ask_owner ? "Règle agence — Accord propriétaire requis" : `Au-dessus du seuil (${settings.delegation_threshold} €) — Propriétaire requis`}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 shrink-0 ml-4">
              <Button onClick={() => ownerRespond(t.id, true)} size="sm" className="bg-success hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approuver</Button>
              <Button onClick={() => ownerRespond(t.id, false)} size="sm" variant="destructive"><XCircle className="h-3.5 w-3.5 mr-1" /> Refuser</Button>
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
}
