import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, statusColors, priorityColors, priorityLabels, categoryLabels, workflowSteps, responsabiliteLabels, SEUIL_DELEGATION } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuoteComparison } from "@/components/QuoteComparison";
import { MessageThread } from "@/components/MessageThread";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import {
  ArrowLeft, Phone, Mail, MapPin, User, Home, Wrench, Calendar, Euro, CheckCircle2, Clock,
  AlertTriangle, Send, Brain, Bot, Play, XCircle, FileText, Archive
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useTickets();
  const ticket = ctx.getTicket(id || "");

  const [newQuoteArtisan, setNewQuoteArtisan] = useState("");
  const [newQuoteMontant, setNewQuoteMontant] = useState("");
  const [newQuoteDelai, setNewQuoteDelai] = useState("");
  const [newQuoteDesc, setNewQuoteDesc] = useState("");

  if (!ticket) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Ticket introuvable</p></div>;

  const currentStepIndex = workflowSteps.findIndex(s => s.key === ticket.status);
  const selectedQuote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
  const artisan = ticket.artisanId ? ctx.getArtisan(ticket.artisanId) : null;

  const handleAddQuote = () => {
    if (!newQuoteArtisan || !newQuoteMontant) return;
    ctx.addQuote(ticket.id, newQuoteArtisan, Number(newQuoteMontant), newQuoteDelai, newQuoteDesc);
    setNewQuoteArtisan(""); setNewQuoteMontant(""); setNewQuoteDelai(""); setNewQuoteDesc("");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{ticket.titre}</h1>
            <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>{priorityLabels[ticket.priorite]}</Badge>
            <Badge variant="outline" className={`status-badge ${statusColors[ticket.status]} border-0`}>{statusLabels[ticket.status]}</Badge>
            {ticket.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}
            {ticket.responsabilite && <Badge variant="outline" className="status-badge border-0 bg-primary/10 text-primary">Resp: {responsabiliteLabels[ticket.responsabilite]}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{ticket.reference} · Créé le {new Date(ticket.dateCreation).toLocaleDateString("fr-FR")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => ctx.setShowJournal(true)}>
          <Bot className="h-4 w-4 mr-1" /> Journal IA
        </Button>
      </div>

      {/* Workflow stepper */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {workflowSteps.map((step, i) => {
              const isCompleted = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${isCompleted ? "bg-success text-success-foreground" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 whitespace-nowrap ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>{step.label}</span>
                  </div>
                  {i < workflowSteps.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${isCompleted ? "bg-success" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{ticket.description}</p>
              <Badge variant="secondary" className="mt-2">{categoryLabels[ticket.categorie]}</Badge>
            </CardContent>
          </Card>

          {/* STAGE-SPECIFIC SECTIONS */}

          {/* Signale -> Qualification action */}
          {ticket.status === "signale" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-sm mb-3">Ce ticket est en attente de qualification. L'agent IA va analyser la responsabilité et orienter le dossier.</p>
                <Button onClick={() => ctx.qualifyTicket(ticket.id)}>
                  <Brain className="h-4 w-4 mr-2" /> Lancer la qualification IA
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recherche artisan -> Artisan management */}
          {ticket.status === "recherche_artisan" && (
            <>
              <Card className="border-0 shadow-sm border-l-4 border-l-accent">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Contacter des artisans</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ctx.artisans.filter(a => a.specialite.toLowerCase().includes(ticket.categorie === "electricite" ? "élect" : ticket.categorie)).map(a => (
                      <Button key={a.id} size="sm" variant="outline" onClick={() => ctx.sendArtisanContact(ticket.id, a.id)}>
                        <Send className="h-3 w-3 mr-1" /> {a.nom}
                      </Button>
                    ))}
                    {ctx.artisans.filter(a => !a.specialite.toLowerCase().includes(ticket.categorie === "electricite" ? "élect" : ticket.categorie)).map(a => (
                      <Button key={a.id} size="sm" variant="ghost" className="text-xs" onClick={() => ctx.sendArtisanContact(ticket.id, a.id)}>
                        {a.nom}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              {Object.keys(ticket.messages).length > 0 && (
                <Tabs defaultValue={Object.keys(ticket.messages)[0]}>
                  <TabsList>
                    {Object.keys(ticket.messages).map(aid => {
                      const a = ctx.getArtisan(aid);
                      return <TabsTrigger key={aid} value={aid}>{a?.nom || aid}</TabsTrigger>;
                    })}
                  </TabsList>
                  {Object.entries(ticket.messages).map(([aid, msgs]) => {
                    const a = ctx.getArtisan(aid);
                    return (
                      <TabsContent key={aid} value={aid}>
                        <MessageThread artisanNom={a?.nom || ""} messages={msgs} onSend={content => ctx.addMessage(ticket.id, aid, content, "agence")} />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}

              {/* Add quote */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ajouter un devis</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Artisan</Label>
                      <Select value={newQuoteArtisan} onValueChange={setNewQuoteArtisan}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>{ctx.artisans.map(a => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Montant (€)</Label><Input type="number" value={newQuoteMontant} onChange={e => setNewQuoteMontant(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Délai</Label><Input value={newQuoteDelai} onChange={e => setNewQuoteDelai(e.target.value)} placeholder="Ex: 3 jours" /></div>
                    <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={newQuoteDesc} onChange={e => setNewQuoteDesc(e.target.value)} placeholder="Détail prestation" /></div>
                  </div>
                  <Button size="sm" onClick={handleAddQuote} disabled={!newQuoteArtisan || !newQuoteMontant}>Ajouter le devis</Button>
                </CardContent>
              </Card>

              {/* Quote comparison */}
              <QuoteComparison quotes={ticket.quotes} onSelect={qid => ctx.selectQuoteAndAdvance(ticket.id, qid)} />
            </>
          )}

          {/* Validation proprio */}
          {ticket.status === "validation_proprio" && selectedQuote && (
            <Card className="border-0 shadow-sm border-l-4 border-l-warning">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Validation du devis</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{selectedQuote.artisanNom}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuote.description}</p>
                  <p className="text-sm font-semibold mt-1">{selectedQuote.montant} € · {selectedQuote.delai}</p>
                </div>
                {selectedQuote.montant <= SEUIL_DELEGATION ? (
                  <div>
                    <Badge className="bg-success/15 text-success border-0 mb-3">Dans le seuil de délégation ({SEUIL_DELEGATION} €) — Validation agence</Badge>
                    <Button onClick={() => ctx.validateQuote(ticket.id)} className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Valider directement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge className="bg-warning/15 text-warning border-0">Au-dessus du seuil — Validation propriétaire requise</Badge>
                    <Button onClick={() => ctx.validateQuote(ticket.id)} variant="outline" className="w-full">
                      Envoyer la demande au propriétaire
                    </Button>
                    <Separator />
                    <p className="text-xs text-muted-foreground text-center">Simulation de la réponse du propriétaire :</p>
                    <div className="flex gap-2">
                      <Button onClick={() => ctx.ownerRespond(ticket.id, true)} className="flex-1 bg-success hover:bg-success/90" size="sm">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approuver
                      </Button>
                      <Button onClick={() => ctx.ownerRespond(ticket.id, false)} variant="destructive" className="flex-1" size="sm">
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Refuser
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Planification */}
          {ticket.status === "planifie" && (
            <div className="space-y-4">
              <Tabs defaultValue="artisan">
                <TabsList>
                  <TabsTrigger value="artisan">Disponibilités artisan</TabsTrigger>
                  <TabsTrigger value="locataire">Disponibilités locataire</TabsTrigger>
                </TabsList>
                <TabsContent value="artisan">
                  <AvailabilityCalendar title={`Créneaux de ${artisan?.nom || "l'artisan"}`}
                    selectedSlots={ticket.disponibilitesArtisan}
                    onSlotsChange={slots => ctx.setDisponibilites(ticket.id, "artisan", slots)}
                    highlightSlots={ticket.disponibilitesLocataire} />
                </TabsContent>
                <TabsContent value="locataire">
                  <AvailabilityCalendar title={`Créneaux de ${ticket.locataire.nom}`}
                    selectedSlots={ticket.disponibilitesLocataire}
                    onSlotsChange={slots => ctx.setDisponibilites(ticket.id, "locataire", slots)}
                    highlightSlots={ticket.disponibilitesArtisan} />
                </TabsContent>
              </Tabs>
              <Button onClick={() => ctx.matchAndConfirm(ticket.id)} className="w-full"
                disabled={ticket.disponibilitesArtisan.length === 0 || ticket.disponibilitesLocataire.length === 0}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Trouver un créneau commun
              </Button>
            </div>
          )}

          {/* Intervention */}
          {ticket.status === "intervention" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-accent">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Intervention</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {ticket.rdv && <p className="text-sm">📅 RDV : <span className="font-medium">{ticket.rdv.date} à {ticket.rdv.heure}</span></p>}
                <p className="text-sm">Artisan : <span className="font-medium">{artisan?.nom}</span></p>
                <Badge variant="outline" className={`status-badge border-0 ${ticket.interventionStatus === "termine" ? "bg-success/15 text-success" : ticket.interventionStatus === "en_cours" ? "bg-accent/15 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                  {ticket.interventionStatus === "termine" ? "Terminée" : ticket.interventionStatus === "en_cours" ? "En cours" : "Planifiée"}
                </Badge>
                <div className="flex gap-2 mt-2">
                  {ticket.interventionStatus === "planifie" && <Button size="sm" onClick={() => ctx.startIntervention(ticket.id)}><Play className="h-3.5 w-3.5 mr-1" /> Démarrer</Button>}
                  {ticket.interventionStatus === "en_cours" && <Button size="sm" onClick={() => ctx.completeIntervention(ticket.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Terminer</Button>}
                  {ticket.interventionStatus === "termine" && !ticket.interventionValidee && (
                    <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => ctx.validateIntervention(ticket.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Validation locataire
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Facturation */}
          {ticket.status === "facturation" && ticket.facture && (
            <Card className="border-0 shadow-sm border-l-4 border-l-muted-foreground">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Facture</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Réf.</span><span className="font-mono">{ticket.facture.refFacture}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-semibold">{ticket.facture.montant} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Prestation</span><span>{ticket.facture.prestation}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Artisan</span><span>{artisan?.nom}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Responsable paiement</span>
                    <Badge variant="outline" className="border-0 bg-primary/10 text-primary text-[10px]">
                      {ticket.responsabilite === "locataire" ? ticket.locataire.nom : ticket.bien.proprietaire}
                    </Badge>
                  </div>
                </div>
                <Button onClick={() => ctx.validateFacture(ticket.id)} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Valider la facturation
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Clôture */}
          {ticket.status === "cloture" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-success">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Dossier clôturé</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Problème :</span> {ticket.description}</p>
                {artisan && <p><span className="text-muted-foreground">Artisan :</span> {artisan.nom}</p>}
                {selectedQuote && <p><span className="text-muted-foreground">Devis :</span> {selectedQuote.montant} €</p>}
                {ticket.rdv && <p><span className="text-muted-foreground">Intervention :</span> {ticket.rdv.date}</p>}
                {ticket.facture && <p><span className="text-muted-foreground">Facturé :</span> {ticket.facture.montant} € ({ticket.facture.payee ? "Payée" : "En attente"})</p>}
                {ticket.responsabilite && <p><span className="text-muted-foreground">Responsabilité :</span> {responsabiliteLabels[ticket.responsabilite]}</p>}
                {!ticket.factureValidee && (
                  <Button onClick={() => ctx.closeTicket(ticket.id)} className="mt-2">
                    <Archive className="h-4 w-4 mr-2" /> Envoyer les messages de clôture
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {ticket.notes.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Locataire</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{ticket.locataire.nom}</p>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{ticket.locataire.telephone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{ticket.locataire.email}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" /> Bien</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p>{ticket.bien.adresse}</p><p className="text-muted-foreground">{ticket.bien.lot}</p></div></div>
              <Separator />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Propriétaire</p>
              <p className="font-medium">{ticket.bien.proprietaire}</p>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{ticket.bien.telephoneProprio}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{ticket.bien.emailProprio}</div>
            </CardContent>
          </Card>
          {artisan && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Artisan</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{artisan.nom}</p>
                <p className="text-muted-foreground">{artisan.specialite}</p>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{artisan.telephone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{artisan.email}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
