import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Send, Euro } from "lucide-react";
import { mockTickets, statusLabels } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Validation() {
  const navigate = useNavigate();
  const validationTickets = mockTickets.filter((t) => t.status === "validation_proprio");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          ✅ Objectif : Montrer la boucle de validation propriétaire (point de friction majeur).
          <span className="text-muted-foreground font-normal"> → "Combien de temps mettez-vous à obtenir un accord du propriétaire ? Quels sont les délais habituels ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Validation propriétaire</h1>
        <p className="text-sm text-muted-foreground">{validationTickets.length} devis en attente de validation</p>
      </div>

      {validationTickets.map((ticket) => (
        <Card key={ticket.id} className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                  <Badge variant="outline" className="status-badge bg-warning/15 text-warning border-0">En attente</Badge>
                </div>
                <h3 className="font-semibold">{ticket.titre}</h3>
                <p className="text-sm text-muted-foreground">{ticket.bien.adresse}</p>
              </div>
              {ticket.artisan?.devis && (
                <div className="text-right">
                  <p className="text-2xl font-bold">{ticket.artisan.devis} €</p>
                  <p className="text-xs text-muted-foreground">Devis {ticket.artisan.nom}</p>
                </div>
              )}
            </div>

            <div className="bg-muted rounded-lg p-4 mb-4 text-sm">
              <p className="font-medium mb-1">Propriétaire : {ticket.bien.proprietaire}</p>
              <p className="text-muted-foreground">Tél : {ticket.bien.telephoneProprio}</p>
              <p className="text-muted-foreground mt-2 italic">Devis envoyé le {new Date(ticket.dateMaj).toLocaleDateString("fr-FR")} · Relance automatique prévue dans 48h</p>
            </div>

            <div className="flex gap-2">
              <Button className="bg-success hover:bg-success/90" size="sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Valider (accord verbal)
              </Button>
              <Button variant="outline" size="sm">
                <Send className="h-3.5 w-3.5 mr-2" /> Relancer
              </Button>
              <Button variant="outline" size="sm" className="text-destructive">
                <XCircle className="h-3.5 w-3.5 mr-2" /> Refusé
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                Voir le dossier
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {validationTickets.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
            <p>Aucun devis en attente de validation</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
