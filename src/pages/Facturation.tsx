import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Euro, CheckCircle2, Download, Send } from "lucide-react";
import { mockTickets } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Facturation() {
  const navigate = useNavigate();
  const withFacture = mockTickets.filter((t) => t.facture);
  const enAttente = mockTickets.filter((t) => t.status === "facturation" || (t.facture && !t.facture.payee));
  const payees = mockTickets.filter((t) => t.facture?.payee);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          💶 Objectif : Montrer le suivi facturation et la répartition des charges.
          <span className="text-muted-foreground font-normal"> → "Combien de temps passez-vous sur la facturation et les relances ? Quel est le délai moyen de paiement ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Facturation & clôture</h1>
        <p className="text-sm text-muted-foreground">{withFacture.length} facture(s) · {payees.length} payée(s)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">120 €</p>
            <p className="text-xs text-muted-foreground">Total facturé ce mois</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">120 €</p>
            <p className="text-xs text-muted-foreground">Payé</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">0 €</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {withFacture.map((ticket) => (
        <Card key={ticket.id} className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                <h3 className="font-semibold mt-0.5">{ticket.titre}</h3>
                <p className="text-sm text-muted-foreground">{ticket.artisan?.nom} · {ticket.bien.adresse}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{ticket.facture!.montant} €</p>
                <Badge variant="outline" className={`status-badge border-0 ${ticket.facture!.payee ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  {ticket.facture!.payee ? "Payée" : "En attente"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {!ticket.facture!.payee && (
                <>
                  <Button className="bg-success hover:bg-success/90" size="sm"><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Marquer payée</Button>
                  <Button variant="outline" size="sm"><Send className="h-3.5 w-3.5 mr-2" /> Relancer</Button>
                </>
              )}
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-2" /> Télécharger</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>Voir le dossier</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
