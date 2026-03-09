import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Phone, Wrench, CheckCircle2 } from "lucide-react";
import { mockTickets, priorityLabels, priorityColors } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Planification() {
  const navigate = useNavigate();
  const planifies = mockTickets.filter((t) => t.status === "planifie");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          📅 Objectif : Montrer la coordination artisan/locataire et la planification.
          <span className="text-muted-foreground font-normal"> → "Comment coordonnez-vous les RDV entre artisans et locataires aujourd'hui ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Planification</h1>
        <p className="text-sm text-muted-foreground">{planifies.length} intervention(s) planifiée(s)</p>
      </div>

      {planifies.map((ticket) => (
        <Card key={ticket.id} className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                <h3 className="font-semibold mt-0.5">{ticket.titre}</h3>
              </div>
              <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>{priorityLabels[ticket.priorite]}</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted rounded-lg p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date prévue</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">{ticket.intervention?.datePrevisionnelle && new Date(ticket.intervention.datePrevisionnelle).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Artisan</p>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-accent" />
                  <span className="font-medium">{ticket.artisan?.nom}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Lieu</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.bien.adresse}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="bg-primary" size="sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Confirmer le RDV
              </Button>
              <Button variant="outline" size="sm">Reprogrammer</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>Voir le dossier</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
