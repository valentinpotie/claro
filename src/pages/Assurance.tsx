import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Euro, Clock, Upload, Send, CheckCircle2 } from "lucide-react";
import { mockTickets } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Assurance() {
  const navigate = useNavigate();
  const assuranceTickets = mockTickets.filter((t) => t.assurance || t.status === "assurance");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          🛡️ Objectif : Montrer la gestion des cas assurance (déclaration, suivi, pièces).
          <span className="text-muted-foreground font-normal"> → "Quelle part de vos sinistres finissent en déclaration assurance ? Combien de temps prend le suivi administratif ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Déclarations assurance</h1>
        <p className="text-sm text-muted-foreground">{assuranceTickets.length} dossier(s) avec déclaration assurance</p>
      </div>

      {assuranceTickets.map((ticket) => (
        <Card key={ticket.id} className="border-0 shadow-sm border-l-4 border-l-destructive">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-destructive" />
                  <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                </div>
                <h3 className="font-semibold">{ticket.titre}</h3>
                <p className="text-sm text-muted-foreground">{ticket.bien.adresse}</p>
              </div>
              <Badge className="bg-destructive/10 text-destructive border-0">Sinistre déclaré</Badge>
            </div>

            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Réf. sinistre</p>
                  <p className="font-medium">{ticket.assurance?.refSinistre || "En cours"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Franchise</p>
                  <p className="font-medium">{ticket.assurance?.franchise ? `${ticket.assurance.franchise} €` : "À déterminer"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Devis travaux</p>
                  <p className="font-medium">{ticket.artisan?.devis ? `${ticket.artisan.devis} €` : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <p className="font-medium">Expertise en cours</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-2" /> Ajouter pièces</Button>
              <Button variant="outline" size="sm"><FileText className="h-3.5 w-3.5 mr-2" /> Constat amiable</Button>
              <Button variant="outline" size="sm"><Send className="h-3.5 w-3.5 mr-2" /> Relancer assureur</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>Voir le dossier</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
