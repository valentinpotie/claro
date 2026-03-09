import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { mockTickets, categoryLabels, priorityLabels, priorityColors } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Qualification() {
  const navigate = useNavigate();
  const toQualify = mockTickets.filter((t) => t.status === "signale" || t.status === "qualifie");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          🤖 Objectif : Montrer l'automatisation de la qualification (IA + règles métier).
          <span className="text-muted-foreground font-normal"> → "Si l'outil qualifiait automatiquement 80% des signalements, combien de temps gagneriez-vous par semaine ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Qualification intelligente</h1>
        <p className="text-sm text-muted-foreground">{toQualify.length} dossier(s) à qualifier ou en cours de qualification</p>
      </div>

      {toQualify.map((ticket) => (
        <Card key={ticket.id} className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                <h3 className="font-semibold mt-0.5">{ticket.titre}</h3>
                <p className="text-sm text-muted-foreground">{ticket.locataire.nom} · {ticket.bien.adresse}</p>
              </div>
              <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>
                {priorityLabels[ticket.priorite]}
              </Badge>
            </div>
            <p className="text-sm mb-4">{ticket.description}</p>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium">Suggestion IA</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Catégorie détectée</p>
                  <p className="font-medium">{categoryLabels[ticket.categorie]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Priorité suggérée</p>
                  <p className="font-medium">{priorityLabels[ticket.priorite]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Risque assurance</p>
                  <p className="font-medium">{ticket.categorie === "humidite" || ticket.categorie === "plomberie" ? "⚠️ Oui - dégât des eaux" : "Non"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Artisans disponibles</p>
                  <p className="font-medium">3 dans le secteur</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="bg-primary" size="sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Valider la qualification
              </Button>
              <Button variant="outline" size="sm">
                Modifier
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                Voir le dossier <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
