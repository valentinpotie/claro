import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Phone, Mail, MapPin, User, Home, Wrench, 
  Calendar, Euro, Shield, CheckCircle2, Clock, AlertTriangle,
  Send, FileText
} from "lucide-react";
import { mockTickets, statusLabels, statusColors, priorityColors, priorityLabels, categoryLabels, workflowSteps } from "@/data/mockData";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ticket = mockTickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Ticket introuvable</p>
      </div>
    );
  }

  const currentStepIndex = workflowSteps.findIndex((s) => s.key === ticket.status);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          📂 Objectif : Montrer le dossier complet et le workflow étape par étape.
          <span className="text-muted-foreground font-normal"> → "Est-ce que vous retrouvez toutes les infos dont vous avez besoin ? Quelles actions faites-vous le plus souvent à cette étape ?"</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{ticket.titre}</h1>
            <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>
              {priorityLabels[ticket.priorite]}
            </Badge>
            <Badge variant="outline" className={`status-badge ${statusColors[ticket.status]} border-0`}>
              {statusLabels[ticket.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{ticket.reference} · Créé le {new Date(ticket.dateCreation).toLocaleDateString("fr-FR")}</p>
        </div>
      </div>

      {/* Workflow stepper */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {workflowSteps.map((step, i) => {
              const isCompleted = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const isAssurance = ticket.status === "assurance" && step.key === "cloture";
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isCompleted ? "bg-success text-success-foreground" :
                      isCurrent ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 whitespace-nowrap ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${isCompleted ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description du sinistre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{ticket.description}</p>
              <div className="mt-3 flex gap-2">
                <Badge variant="secondary">{categoryLabels[ticket.categorie]}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Artisan */}
          {ticket.artisan && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Artisan assigné
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{ticket.artisan.nom}</p>
                  <p className="text-sm text-muted-foreground">{ticket.artisan.specialite}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {ticket.artisan.telephone}
                  </div>
                  {ticket.artisan.devis && (
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      Devis : {ticket.artisan.devis.toLocaleString("fr-FR")} €
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Intervention */}
          {ticket.intervention && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Intervention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Date prévue : <span className="font-medium">{new Date(ticket.intervention.datePrevisionnelle).toLocaleDateString("fr-FR")}</span></p>
                  {ticket.intervention.dateFin && <p>Terminée le : <span className="font-medium">{new Date(ticket.intervention.dateFin).toLocaleDateString("fr-FR")}</span></p>}
                  {ticket.intervention.commentaire && <p className="text-muted-foreground italic">{ticket.intervention.commentaire}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Facture */}
          {ticket.facture && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Facturation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Montant : <span className="font-medium">{ticket.facture.montant.toLocaleString("fr-FR")} €</span></p>
                  <p>Statut : <Badge variant="outline" className={`status-badge border-0 ${ticket.facture.payee ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {ticket.facture.payee ? "Payée" : "En attente"}
                  </Badge></p>
                  {ticket.facture.refFacture && <p className="text-muted-foreground">Réf. {ticket.facture.refFacture}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assurance */}
          {ticket.assurance && (
            <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Déclaration assurance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Statut : <Badge variant="outline" className="status-badge bg-destructive/10 text-destructive border-0">Déclarée</Badge></p>
                  {ticket.assurance.refSinistre && <p>Réf. sinistre : <span className="font-medium">{ticket.assurance.refSinistre}</span></p>}
                  {ticket.assurance.franchise && <p>Franchise : {ticket.assurance.franchise} €</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {ticket.notes.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes & historique</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ticket.notes.map((note, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <p>{note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Locataire */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Locataire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{ticket.locataire.nom}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {ticket.locataire.telephone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {ticket.locataire.email}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                <Send className="h-3.5 w-3.5 mr-2" /> Contacter
              </Button>
            </CardContent>
          </Card>

          {/* Bien */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="h-4 w-4" /> Bien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div>
                  <p>{ticket.bien.adresse}</p>
                  <p className="text-muted-foreground">{ticket.bien.lot}</p>
                </div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Propriétaire</p>
              <p className="font-medium">{ticket.bien.proprietaire}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {ticket.bien.telephoneProprio}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                <Send className="h-3.5 w-3.5 mr-2" /> Contacter propriétaire
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-primary" size="sm">
                Passer à l'étape suivante
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Ajouter une note
              </Button>
              <Button variant="outline" size="sm" className="w-full text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                Déclarer sinistre assurance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
