import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { statusLabels, statusColors, categoryLabels, workflowSteps, syndicWorkflowSteps, responsabiliteLabels } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { MessageThread } from "@/components/MessageThread";
import {
  ArrowLeft, ArrowRight, Phone, Mail, MapPin, User, Home, Wrench, Calendar, Euro, CheckCircle2, Clock,
  AlertTriangle, Send, Brain, Bot, XCircle, FileText, Archive, Shield, Building2, RefreshCw, Gavel, X, Sparkles
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function TicketDetail() {
  const fallbackAccountantEmail = "comptabilite@agence-demo.fr";
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useTickets();
  const { settings, needsOwnerApproval, updateSettings } = useSettings();
  const { toast } = useToast();
  const ticket = ctx.getTicket(id || "");
  const [ticketTourStep, setTicketTourStep] = useState(0);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [factureSent, setFactureSent] = useState(false);

  useEffect(() => {
    if (ticket && ticket.status === "signale") {
      ctx.qualifyTicket(ticket.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  useEffect(() => {
    if (ticketTourStep === 1) {
      document.getElementById("ticket-tour-header")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (ticketTourStep === 2) {
      document.getElementById("ticket-tour-stepper")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [ticketTourStep]);

  if (!ticket) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Ticket introuvable</p></div>;

  const isSyndic = ticket.responsabilite === "syndic";
  const displaySteps = isSyndic
    ? syndicWorkflowSteps.filter(s => s.key !== "qualifie")
    : workflowSteps.filter(s => s.key !== "qualifie");
  const currentStepIndex = displaySteps.findIndex(s => s.key === ticket.status);
  const selectedQuote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
  const artisan = ticket.artisanId ? ctx.getArtisan(ticket.artisanId) : null;
  const accountantEmail = settings.accountant_email || fallbackAccountantEmail;
  const syndicStepColor = "bg-orange-500 text-white";
  const syndicCompletedColor = "bg-orange-400 text-white";
  const isHeaderFocused = ticketTourStep === 1;
  const isStepperFocused = ticketTourStep === 2;
  const isDrawerFocused = ticketTourStep === 3;
  const showArtisanConversation = ["contact_artisan", "intervention", "confirmation_passage"].includes(ticket.status);

  const closeTicketTour = () => {
    setTicketTourStep(0);
    if (ctx.showJournal) ctx.setShowJournal(false);
  };

  const nextTicketTourStep = () => {
    if (ticketTourStep === 1) {
      setTicketTourStep(2);
      return;
    }
    if (ticketTourStep === 2) {
      ctx.setShowJournal(true);
      setTicketTourStep(3);
      return;
    }
    closeTicketTour();
  };

  return (
    <div className="space-y-6">
      {ticketTourStep > 0 && (
        <>
          <div className="fixed inset-0 z-40 bg-black/35" onClick={closeTicketTour} />
          <div className={`fixed bottom-6 z-[70] w-[360px] rounded-xl border bg-card shadow-2xl overflow-hidden ${
            isDrawerFocused ? "left-6" : "right-6"
          }`}>
            <div className="px-4 py-3 border-b bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDrawerFocused && <Bot className="h-3.5 w-3.5 text-primary" />}
                <p className="text-xs font-semibold">Visite guidée</p>
                <span className="text-[10px] text-muted-foreground">{ticketTourStep}/3</span>
              </div>
              <button onClick={closeTicketTour} className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm font-semibold">
                {ticketTourStep === 1 ? "Résumé du dossier" : ticketTourStep === 2 ? "Suivi étape par étape" : "L'Agent Claro en action"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {ticketTourStep === 1
                  ? "Vous voyez ici le titre, le statut et la responsabilité du dossier. Vous pouvez aussi marquer un ticket comme urgent."
                  : ticketTourStep === 2
                    ? "Chaque dossier suit ces étapes automatiquement. Claro gère les relances et les échanges avec les artisans."
                    : "Ce panneau affiche en temps réel les actions automatisées de l'Agent Claro\u00a0: contact artisans, demande de devis, relances. Vous gardez le contrôle à chaque instant."}
              </p>
            </div>
            <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
              <button onClick={closeTicketTour} className="text-xs text-muted-foreground hover:text-foreground">Passer le tour</button>
              <Button size="sm" onClick={nextTicketTourStep} className="h-7 text-xs gap-1.5">
                {ticketTourStep < 3 ? "Suivant" : "Terminer"} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div id="ticket-tour-header" className={`flex items-center gap-3 ${isHeaderFocused ? "relative z-[60] rounded-xl ring-2 ring-primary ring-offset-4 ring-offset-background bg-background p-2" : ""}`}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{ticket.titre}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{ticket.reference} · Créé le {new Date(ticket.dateCreation).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setTicketTourStep(1)}>
            <Sparkles className="h-3.5 w-3.5" /> Tutoriel
          </Button>
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]" onClick={() => ctx.setShowJournal(true)}>
            <Bot className="h-4 w-4 mr-1" /> Journal Claro
          </Button>
        </div>
      </div>

      {/* Workflow stepper */}
      <Card id="ticket-tour-stepper" className={`border-0 shadow-sm ${isSyndic ? "ring-1 ring-orange-200" : ""} ${isStepperFocused ? "relative z-[60] ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}>
        <CardContent className="p-4">
          {isSyndic && (
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-orange-700">
              <Building2 className="h-3.5 w-3.5" /> Parcours Syndic
            </div>
          )}
          <div>
            <div className="flex items-start">
              {displaySteps.map((step, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.key} className="relative flex-1 min-w-0 flex flex-col items-center">
                    {i < displaySteps.length - 1 && (
                      <div
                        className={`absolute h-0.5 ${
                          isCompleted && i + 1 <= currentStepIndex
                            ? (isSyndic ? "bg-orange-400" : i + 1 === currentStepIndex ? "bg-primary" : "bg-foreground/30")
                            : "bg-border"
                        }`}
                        style={{ top: 16, transform: "translateY(-50%)", left: "calc(50% + 20px)", right: "calc(-50% + 20px)" }}
                      />
                    )}
                    <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      isCompleted
                        ? "bg-foreground text-background"
                        : isCurrent
                          ? (isSyndic ? syndicStepColor : "bg-primary text-primary-foreground")
                          : "border border-border bg-background text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1.5 text-center leading-tight px-1 ${isCurrent ? (isSyndic ? "font-semibold text-orange-700" : "font-semibold text-primary") : isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step.label}</span>
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
          <Tabs defaultValue="description">
            <TabsList className="h-8 bg-transparent p-0 gap-1">
              <TabsTrigger value="description" className="text-xs rounded-md px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground">Description</TabsTrigger>
              {ticket.mailSource && <TabsTrigger value="mail" className="text-xs rounded-md px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground">Mail source</TabsTrigger>}
            </TabsList>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <TabsContent value="description" className="mt-0">
                  <p className="text-sm leading-relaxed">{ticket.description}</p>
                </TabsContent>
                {ticket.mailSource && (
                  <TabsContent value="mail" className="mt-0">
                    <div className="space-y-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                        <span className="text-muted-foreground font-medium">De</span><span>{ticket.mailSource.from}</span>
                        <span className="text-muted-foreground font-medium">À</span><span>{ticket.mailSource.to}</span>
                        <span className="text-muted-foreground font-medium">Objet</span><span className="font-medium">{ticket.mailSource.subject}</span>
                        <span className="text-muted-foreground font-medium">Reçu</span><span>{new Date(ticket.mailSource.receivedAt).toLocaleString("fr-FR")}</span>
                      </div>
                      <Separator />
                      <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{ticket.mailSource.body}</div>
                      <Separator />
                      {ticket.mailSource.attachments && ticket.mailSource.attachments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Pièces jointes</p>
                          <div className="flex flex-wrap gap-2">
                            {ticket.mailSource.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-[4px] border bg-muted/50 px-2.5 py-1.5 text-xs">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{att.name}</span>
                                {att.size && <span className="text-muted-foreground">— {att.size}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}
              </CardContent>
            </Card>
          </Tabs>

          {/* Signalement -> Diagnostic (auto-lancé) */}
          {ticket.status === "signale" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center gap-3">
                <Brain className="h-4 w-4 text-primary animate-pulse shrink-0" />
                <p className="text-sm text-muted-foreground">Diagnostic IA en cours…</p>
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
                  {ctx.artisans.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">Aucun artisan configuré</p>
                      <Button size="sm" variant="outline" onClick={() => navigate("/artisans")}>
                        <Wrench className="h-3.5 w-3.5 mr-1.5" /> Ajouter des artisans
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {/* Matching specialty first */}
                      {ctx.artisans.filter(a => a.specialite.toLowerCase().includes(ticket.categorie === "electricite" ? "élect" : ticket.categorie)).map(a => (
                        <Button key={a.id} size="sm" variant="outline" onClick={() => ctx.sendArtisanContact(ticket.id, a.id)}>
                          <Send className="h-3 w-3 mr-1" /> {a.nom}
                        </Button>
                      ))}
                      {/* Other artisans */}
                      {ctx.artisans.filter(a => !a.specialite.toLowerCase().includes(ticket.categorie === "electricite" ? "élect" : ticket.categorie)).map(a => (
                        <Button key={a.id} size="sm" variant="outline" className="opacity-70" onClick={() => ctx.sendArtisanContact(ticket.id, a.id)}>
                          <Send className="h-3 w-3 mr-1" /> {a.nom}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

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

          {/* Conversation artisan visible pendant le suivi intervention */}
          {showArtisanConversation && Object.keys(ticket.messages).length > 0 && (
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      <span>En attente de la réponse du propriétaire…</span>
                    </div>
                    <Button onClick={() => ctx.ownerRespond(ticket.id, true)} className="w-full">
                      <ArrowRight className="h-4 w-4 mr-2" /> Approuver et continuer
                    </Button>
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

          {/* Intervention — suivi artisan + attente preuve locataire */}
          {ticket.status === "intervention" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Intervention en cours</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">Artisan : <span className="font-medium">{artisan?.nom}</span></p>
                {ticket.dateInterventionPrevue && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2">
                    <p className="text-sm">Date prévue : <span className="font-medium">{ticket.dateInterventionPrevue}</span></p>
                    <Badge className="bg-success/15 text-success border-0">Rendez-vous convenu artisan/locataire</Badge>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Quand l'artisan envoie sa facture, Claro demande automatiquement au locataire une preuve (photo/vidéo) du passage.</p>
                <p className="text-sm font-medium">Facture reçue de l'artisan ?</p>
                <div className="flex gap-3">
                  <Button onClick={() => ctx.confirmPassage(ticket.id, true)} className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Oui, lancer la demande de preuve
                  </Button>
                  <Button onClick={() => ctx.confirmPassage(ticket.id, false)} variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <XCircle className="h-4 w-4 mr-2" /> Non, pas encore
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation passage — preuve locataire */}
          {ticket.status === "confirmation_passage" && (
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Confirmation du passage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">Artisan : <span className="font-medium">{artisan?.nom}</span></p>
                {ticket.dateInterventionPrevue && <p className="text-sm">Date prévue : <span className="font-medium">{ticket.dateInterventionPrevue}</span></p>}
                <p className="text-sm text-muted-foreground">Un email a été envoyé au locataire pour fournir une photo/vidéo de confirmation.</p>
                <p className="text-sm font-medium">Preuve locataire reçue ?</p>
                <div className="flex gap-3">
                  <Button onClick={() => ctx.confirmPassage(ticket.id, true)} className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Oui, passer à la facturation
                  </Button>
                  <Button onClick={() => ctx.confirmPassage(ticket.id, false)} variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <XCircle className="h-4 w-4 mr-2" /> Non, relancer le locataire
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
                    <Badge variant="secondary" className="text-[10px]">
                      {ticket.responsabilite === "locataire" ? ticket.locataire.nom : ticket.bien.proprietaire}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!factureSent ? (
                    <Button variant="outline" className="flex-1" onClick={() => {
                      if (!settings.accountant_email) {
                        updateSettings({ accountant_email: fallbackAccountantEmail });
                        setEmailDraft(fallbackAccountantEmail);
                      }
                      setFactureSent(true);
                      toast({ title: "Facture envoyée", description: `Envoyée à ${accountantEmail}` });
                    }}>
                      <Mail className="h-4 w-4 mr-2" /> Envoyer au comptable
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 h-10 rounded-md border bg-success/10 text-success text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Envoyée à {accountantEmail}
                    </div>
                  )}
                  <Button onClick={() => ctx.validateFacture(ticket.id)} className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Valider et clôturer
                  </Button>
                </div>
                {showEmailInput && (
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Email du comptable"
                      value={emailDraft}
                      onChange={e => setEmailDraft(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button size="sm" className="h-9" disabled={!emailDraft.includes("@")} onClick={() => {
                      updateSettings({ accountant_email: emailDraft });
                      setShowEmailInput(false);
                      setFactureSent(true);
                      toast({ title: "Facture envoyée", description: `Envoyée à ${emailDraft}` });
                    }}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Envoyer
                    </Button>
                  </div>
                )}
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
                <p className="text-xs text-muted-foreground">Claro va envoyer un mail au syndic avec la description du problème.</p>
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
                  <Badge variant="outline" className="border-0 bg-primary/10 text-primary text-[10px]">{categoryLabels[ticket.categorie]}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsabilité</span>
                  <Badge variant="secondary" className="text-[10px]">{responsabiliteLabels[ticket.responsabilite]}</Badge>
                </div>
                {ticket.urgence && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgence</span>
                    <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
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

          <Card className={`border-0 shadow-sm${ticket.tenant_id ? " cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow" : ""}`} onClick={() => ticket.tenant_id && navigate(`/tenants/${ticket.tenant_id}`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Locataire {ticket.tenant_id && <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{ticket.locataire.nom}</p>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{ticket.locataire.telephone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{ticket.locataire.email}</div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm${ticket.property_id ? " cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow" : ""}`} onClick={() => ticket.property_id && navigate(`/properties/${ticket.property_id}`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" /> Bien {ticket.property_id && <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p>{ticket.bien.adresse}</p><p className="text-muted-foreground">{ticket.bien.lot}</p></div></div>
              <Separator />
              <div className={`space-y-2${ticket.owner_id ? " cursor-pointer" : ""}`} onClick={e => { if (ticket.owner_id) { e.stopPropagation(); navigate(`/owners/${ticket.owner_id}`); } }}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">Propriétaire {ticket.owner_id && <ArrowRight className="h-3 w-3 text-muted-foreground" />}</p>
                <p className="font-medium">{ticket.bien.proprietaire}</p>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{ticket.bien.telephoneProprio}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{ticket.bien.emailProprio}</div>
              </div>
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
