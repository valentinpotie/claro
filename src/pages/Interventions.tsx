import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HardHat, Clock, CheckCircle2, Camera, MessageSquare } from "lucide-react";
import { mockTickets, priorityLabels, priorityColors } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Interventions() {
  const navigate = useNavigate();
  const enCours = mockTickets.filter((t) => t.status === "intervention");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          👷 Objectif : Montrer le suivi en temps réel des interventions.
          <span className="text-muted-foreground font-normal"> → "Comment êtes-vous informé de l'avancement d'une intervention aujourd'hui ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Interventions en cours</h1>
        <p className="text-sm text-muted-foreground">{enCours.length} intervention(s) en cours</p>
      </div>

      {enCours.map((ticket) => (
        <Card key={ticket.id} className="border-0 shadow-sm border-l-4 border-l-accent">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-accent" />
                  <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                  <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>{priorityLabels[ticket.priorite]}</Badge>
                </div>
                <h3 className="font-semibold mt-1">{ticket.titre}</h3>
                <p className="text-sm text-muted-foreground">{ticket.bien.adresse}</p>
              </div>
              <Badge className="bg-accent text-accent-foreground">En cours</Badge>
            </div>

            <div className="bg-muted rounded-lg p-4 text-sm mb-4">
              <p className="font-medium mb-1">Artisan : {ticket.artisan?.nom}</p>
              {ticket.intervention?.commentaire && (
                <p className="text-muted-foreground italic mt-1">"{ticket.intervention.commentaire}"</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Dernière mise à jour : {new Date(ticket.dateMaj).toLocaleDateString("fr-FR")}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="bg-success hover:bg-success/90" size="sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Marquer terminée
              </Button>
              <Button variant="outline" size="sm">
                <Camera className="h-3.5 w-3.5 mr-2" /> Photos avant/après
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-3.5 w-3.5 mr-2" /> Contacter artisan
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>Voir le dossier</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
