import { useParams, useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { statusLabels, statusColors, priorityColors, priorityLabels, categoryLabels, workflowSteps, syndicWorkflowSteps, responsabiliteLabels } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { MessageThread } from "@/components/MessageThread";
import {
  ArrowLeft, Phone, Mail, MapPin, User, Home, Wrench, Calendar, Euro, CheckCircle2, Clock,
  AlertTriangle, Send, Brain, Bot, XCircle, FileText, Archive, Shield, Building2, RefreshCw, Gavel
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useTickets();
  const { settings, needsOwnerApproval } = useSettings();
  const ticket = ctx.getTicket(id || "");

  if (!ticket) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Ticket introuvable</p></div>;

  const isSyndic = ticket.responsabilite === "syndic";
  const displaySteps = isSyndic
    ? syndicWorkflowSteps.filter(s => s.key !== "qualifie")
    : workflowSteps.filter(s => s.key !== "qualifie");
  const currentStepIndex = displaySteps.findIndex(s => s.key === ticket.status);
  const selectedQuote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
  const artisan = ticket.artisanId ? ctx.getArtisan(ticket.artisanId) : null;
  const syndicStepColor = "bg-orange-500 text-white";
  const syndicCompletedColor = "bg-orange-400 text-white";

  return (
    <div className="space-y-6 max-w-6xl">
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
      <Card className={`border-0 shadow-sm ${isSyndic ? "ring-1 ring-orange-200" : ""}`}>
        <CardContent className="p-4">
          {isSyndic && (
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-orange-700">
              <Building2 className="h-3.5 w-3.5" /> Parcours Syndic
            </div>
          )}
          <div className="overflow-x-auto">
            {/* Circles + connectors row */}
            <div className="flex items-center">
              {displaySteps.map((step, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.key} className="flex items-center flex-1 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isCompleted
                        ? (isSyndic ? syndicCompletedColor : "bg-success text-success-foreground")
                        : isCurrent
                          ? (isSyndic ? syndicStepColor : "bg-primary text-primary-foreground")
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < displaySteps.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${isCompleted ? (isSyndic ? "bg-orange-300" : "bg-success") : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
            {/* Labels row */}
            <div className="flex mt-1.5">
              {displaySteps.map((step, i) => {
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.key} className="flex-1 min-w-0">
                    <p className={`text-[10px] text-center truncate ${isCurrent ? (isSyndic ? "font-semibold text-orange-700" : "font-semibold text-primary") : "text-muted-foreground"}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description + Mail source */}
          <Card className="border-0 shadow-sm">
            <Tabs defaultValue="description">
              <CardHeader className="pb-2">
                <TabsList className="h-8">
                  <TabsTrigger value="description" className="text-xs">Description</TabsTrigger>
                  {ticket.mailSource && <TabsTrigger value="mail" className="text-xs">Mail source</TabsTrigger>}
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="description" className="mt-0">
                  <p className="text-sm">{ticket.description}</p>
                  <Badge variant="secondary" className="mt-2">{categoryLabels[ticket.categorie]}</Badge>
                </TabsContent>
                {ticket.mailSource && (
                  <TabsContent value="mail" className="mt-0">
                    <div className="border-l-4 border-muted-foreground/20 pl-4 space-y-2 text-sm">
                      <div className="space-y-1 text-xs">
                        <p><span className="text-muted-foreground font-medium">De :</span> {ticket.mailSource.from}</p>
                        <p><span className="text-muted-foreground font-medium">À :</span> {ticket.mailSource.to}</p>
                        <p><span className="text-muted-foreground font-medium">Objet :</span> <span className="font-medium">{ticket.mailSource.subject}</span></p>
                        <p><span className="text-muted-foreground font-medium">Reçu le :</span> {new Date(ticket.mailSource.receivedAt).toLocaleString("fr-FR")}</p>
                      </div>
                      <Separator />
                      <div className="whitespace-pre-line text-sm leading-relaxed">{ticket.mailSource.body}</div>
                    </div>
                  </TabsContent>
                )}
              </CardContent>
            </Tabs>
          </Card>

          {/* Signalement -> Diagnostic */}
          {ticket.status === "signale" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-sm mb-3">Ce ticket est en attente de diagnostic. L'agent IA va analyser la responsabilité et orienter le dossier.</p>
                <Button onClick={() => ctx.qualifyTicket(ticket.id)}>
                  <Brain className="h-4 w-4 mr-2" /> Lancer le diagnostic IA
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contact artisan */}
          {ticket.status === "contact_artisan" && (
            <>
              <Card className="border-0 shadow-sm border-l-4 border-l-accent">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Contacter un artisan pour diagnostic sur place</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">L'artisan se déplacera pour constater le problème et établir un devis sur place.</p>
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

              {/* Simulate receiving quote */}
              {ticket.artisanId && (
                <Card className="border-0 shadow-sm border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-sm mb-3">L'artisan a effectué son diagnostic sur place ?</p>
                    <Button onClick={() => ctx.receiveQuote(ticket.id)}>
                      <FileText className="h-4 w-4 mr-2" /> Simuler la réception du devis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Réception devis */}
          {ticket.status === "reception_devis" && selectedQuote && (() => {
            const willAutoValidate = !needsOwnerApproval(selectedQuote.montant);
            return (
              <Card className="border-0 shadow-sm border-l-4 border-l-primary">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Devis reçu</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">{selectedQuote.artisanNom}</p>
                    <p className="text-xs text-muted-foreground">{selectedQuote.description}</p>
                    <p className="text-sm font-semibold mt-1">{selectedQuote.montant} € · {selectedQuote.delai}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Devis établi suite au diagnostic sur place de l'artisan.</p>
                  {willAutoValidate ? (
                    <Badge className="bg-success/15 text-success border-0">Validé automatiquement (sous le seuil de délégation de {settings.delegation_threshold} €)</Badge>
                  ) : (
                    <Badge className="bg-warning/15 text-warning border-0">
                      {settings.always_ask_owner
                        ? "Accord propriétaire requis (règle agence)"
                        : `Au-dessus du seuil (${settings.delegation_threshold} €) — Accord propriétaire requis`}
                    </Badge>
                  )}
                  <Button onClick={() => ctx.validateQuote(ticket.id)} className="w-full">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> {willAutoValidate ? "Valider le devis" : "Envoyer au propriétaire"}
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Accord propriétaire */}
          {ticket.status === "validation_proprio" && selectedQuote && (
            <Card className="border-0 shadow-sm border-l-4 border-l-warning">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Accord propriétaire</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{selectedQuote.artisanNom}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuote.description}</p>
                  <p className="text-sm font-semibold mt-1">{selectedQuote.montant} € · {selectedQuote.delai}</p>
                </div>
                <Badge className="bg-warning/15 text-warning border-0">
                  {settings.always_ask_owner
                    ? "Accord propriétaire requis (règle agence)"
                    : `Au-dessus du seuil (${settings.delegation_threshold} €) — Accord propriétaire requis`}
                </Badge>

                {/* Email envoyé au propriétaire */}
                <Card className="border border-border bg-muted/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email envoyé à <strong className="text-foreground">{ticket.bien.proprietaire}</strong> ({ticket.bien.emailProprio})</span>
                    </div>
                    <Separator />
                    <div className="text-sm space-y-1">
                      <p className="font-medium text-xs text-muted-foreground">Objet : Demande d'accord pour travaux — {ticket.reference}</p>
                      <p>Bonjour {ticket.bien.proprietaire},</p>
                      <p>Suite au diagnostic sur place de <strong>{selectedQuote.artisanNom}</strong> concernant un problème de <strong>{ticket.categorie}</strong> au <strong>{ticket.bien.adresse}</strong> ({ticket.bien.lot}), nous avons reçu un devis de <strong>{selectedQuote.montant} €</strong>.</p>
                      <p className="text-muted-foreground text-xs">Prestation : {selectedQuote.description}</p>
                      <p>Merci de nous confirmer votre accord pour engager ces travaux.</p>
                      <p className="text-muted-foreground text-xs italic">— L'équipe de gestion</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Réponse du propriétaire */}
                {ticket.validationStatus === "en_attente" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>En attente de la réponse du propriétaire…</span>
                  </div>
                )}
                {ticket.validationStatus === "approuve" && (
                  <Card className="border border-success/30 bg-success/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-success">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Réponse de <strong>{ticket.bien.proprietaire}</strong></span>
                      </div>
                      <Separator />
                      <div className="text-sm space-y-1">
                        <p>Bonjour, je confirme mon accord pour le devis de <strong>{selectedQuote.montant} €</strong>. Merci de procéder aux travaux.</p>
                        <p className="text-muted-foreground text-xs italic">— {ticket.bien.proprietaire}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {ticket.validationStatus === "refuse" && (
                  <Card className="border border-destructive/30 bg-destructive/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Réponse de <strong>{ticket.bien.proprietaire}</strong></span>
                      </div>
                      <Separator />
                      <div className="text-sm space-y-1">
                        <p>Je ne souhaite pas donner suite à ce devis. Merci de me proposer une alternative.</p>
                        <p className="text-muted-foreground text-xs italic">— {ticket.bien.proprietaire}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

          {/* Intervention */}
          {ticket.status === "intervention" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-accent">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Intervention</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">Artisan : <span className="font-medium">{artisan?.nom}</span></p>
                {selectedQuote && <p className="text-sm">Devis validé : <span className="font-medium">{selectedQuote.montant} €</span></p>}
                {selectedQuote && !needsOwnerApproval(selectedQuote.montant) && ticket.validationStatus === "approuve" && (
                  <Badge className="bg-success/15 text-success border-0">Validé automatiquement (sous le seuil de délégation)</Badge>
                )}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Date d'intervention prévue</label>
                  <Input
                    type="date"
                    value={ticket.dateInterventionPrevue || ""}
                    onChange={e => ctx.updateTicket(ticket.id, { dateInterventionPrevue: e.target.value })}
                  />
                </div>
                <Button onClick={() => ctx.updateTicket(ticket.id, { status: "confirmation_passage" })} className="w-full"
                  disabled={!ticket.dateInterventionPrevue}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Marquer l'intervention comme réalisée
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Confirmation passage */}
          {ticket.status === "confirmation_passage" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Confirmation de passage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">Artisan : <span className="font-medium">{artisan?.nom}</span></p>
                {ticket.dateInterventionPrevue && <p className="text-sm">Date prévue : <span className="font-medium">{ticket.dateInterventionPrevue}</span></p>}
                <p className="text-sm font-medium">L'artisan est-il bien intervenu ?</p>
                <div className="flex gap-3">
                  <Button onClick={() => ctx.confirmPassage(ticket.id, true)} className="flex-1 bg-success hover:bg-success/90">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Oui, confirmé
                  </Button>
                  <Button onClick={() => ctx.confirmPassage(ticket.id, false)} variant="destructive" className="flex-1">
                    <XCircle className="h-4 w-4 mr-2" /> Non, pas intervenu
                  </Button>
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
                {ticket.dateInterventionPrevue && <p><span className="text-muted-foreground">Intervention :</span> {ticket.dateInterventionPrevue}</p>}
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

          {/* === SYNDIC WORKFLOW === */}

          {/* Contact syndic */}
          {ticket.status === "contact_syndic" && ticket.syndic && (
            <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-600" /> Contact syndic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg text-sm space-y-1">
                  <p className="font-medium">{ticket.syndic.nom}</p>
                  <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {ticket.syndic.email}</p>
                  <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {ticket.syndic.telephone}</p>
                </div>
                <p className="text-xs text-muted-foreground">L'IA va envoyer un mail au syndic avec la description du problème.</p>
                <Button onClick={() => ctx.contactSyndic(ticket.id)} className="w-full bg-orange-600 hover:bg-orange-700">
                  <Send className="h-4 w-4 mr-2" /> Envoyer au syndic
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Relance syndic */}
          {ticket.status === "relance_syndic" && ticket.syndic && (
            <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-orange-600" /> Relance syndic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg text-sm">
                  <p className="font-medium">{ticket.syndic.nom}</p>
                  <p className="text-xs text-muted-foreground mt-1">En attente de réponse depuis le {ticket.dateCreation}</p>
                </div>
                {ticket.syndicRelances && ticket.syndicRelances.length > 0 && (
                  <div className="space-y-1.5">
                    {ticket.syndicRelances.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] border-0 bg-orange-100 text-orange-700 mr-1">
                        Relancé automatiquement le {r.date} (#{r.numero})
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={() => ctx.relanceSyndic(ticket.id)} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    <RefreshCw className="h-4 w-4 mr-2" /> Relancer le syndic
                  </Button>
                  <Button onClick={() => ctx.resolveSyndic(ticket.id)} variant="outline" className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Syndic a répondu
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Escalade syndic */}
          {ticket.status === "escalade_syndic" && ticket.syndic && (
            <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gavel className="h-4 w-4 text-red-600" /> Escalade syndic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Badge className="bg-red-100 text-red-700 border-0">Escalade : recommandation de mise en demeure</Badge>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-sm space-y-1">
                  <p className="font-medium">{ticket.syndic.nom} — aucune réponse</p>
                  <p className="text-xs text-muted-foreground">{ticket.syndicRelances?.length || 0} relances envoyées sans réponse</p>
                </div>
                {ticket.syndicRelances && ticket.syndicRelances.length > 0 && (
                  <div className="space-y-1.5">
                    {ticket.syndicRelances.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] border-0 bg-orange-100 text-orange-700 mr-1">
                        Relance #{r.numero} le {r.date} — sans réponse
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={() => ctx.escaladeSyndic(ticket.id)} variant="destructive" className="flex-1">
                    <Gavel className="h-4 w-4 mr-2" /> Générer une mise en demeure
                  </Button>
                  <Button onClick={() => ctx.resolveSyndic(ticket.id)} variant="outline" className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Syndic a répondu
                  </Button>
                </div>
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
          {ticket.responsabilite && (
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Diagnostic</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Catégorie</span>
                  <Badge variant="secondary" className="text-[10px]">{categoryLabels[ticket.categorie]}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsabilité</span>
                  <Badge variant="outline" className="border-0 bg-primary/10 text-primary text-[10px]">{responsabiliteLabels[ticket.responsabilite]}</Badge>
                </div>
                {ticket.urgence && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgence</span>
                    <Badge className="bg-destructive text-destructive-foreground text-[10px]">Oui</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {ticket.syndic && (
            <Card className="border-0 shadow-sm bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-600" /> Syndic</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{ticket.syndic.nom}</p>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{ticket.syndic.telephone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{ticket.syndic.email}</div>
                {ticket.syndicRelances && ticket.syndicRelances.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">{ticket.syndicRelances.length} relance(s) envoyée(s)</p>
                    {ticket.syndicEscalade && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Escalade en cours</Badge>}
                  </>
                )}
              </CardContent>
            </Card>
          )}

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
