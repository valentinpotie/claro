import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { statusLabels, statusColors, categoryLabels, workflowSteps, syndicWorkflowSteps, responsabiliteLabels } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { DiscussionBlock } from "@/components/DiscussionBlock";
import { ArtisanContactModal } from "@/components/ArtisanContactModal";
import { QuoteComparison } from "@/components/QuoteComparison";
import { OwnerApprovalModal } from "@/components/OwnerApprovalModal";
import { OwnerResponseConfirmModal } from "@/components/OwnerResponseConfirmModal";
import {
  ArrowLeft, ArrowRight, Phone, Mail, MapPin, User, Home, Wrench, Calendar, Euro, CheckCircle2, Clock,
  AlertTriangle, Send, Brain, Bot, XCircle, FileText, Archive, Building2, RefreshCw, Gavel, X, Sparkles, Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { artisanSpecialtyLabels } from "@/components/ArtisanFormFields";
import { TicketDocuments } from "@/components/TicketDocuments";
import { RecipientSelector, Recipient } from "@/components/RecipientSelector";
import { DateTimePicker } from "@/components/DateTimePicker";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { toast as sonnerToast } from "sonner";
import { buildTemplateVars, getAutoMessageContent, getAutoMessageSubject } from "@/lib/templateUtils";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useTickets();
  const { settings, needsOwnerApproval, updateSettings } = useSettings();
  const { toast } = useToast();
  const ticket = ctx.getTicket(id || "");
  const [ticketTourStep, setTicketTourStep] = useState(0);
  const [artisanContactPending, setArtisanContactPending] = useState<string | null>(null);
  const [discussionFocusTab, setDiscussionFocusTab] = useState<string | null>(null);
  const [interventionDraft, setInterventionDraft] = useState<{ key: string; recipientId: string; label: string; subject: string; body: string } | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [factureForm, setFactureForm] = useState<{ montant: string; ref: string; prestation: string; date: string; file: File | null } | null>(null);
  const [uploadingFacture, setUploadingFacture] = useState(false);
  const [showProofsWarning, setShowProofsWarning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerApprovalOpen, setOwnerApprovalOpen] = useState(false);
  const [ownerResponseConfirmOpen, setOwnerResponseConfirmOpen] = useState(false);
  const [showFactureRequired, setShowFactureRequired] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const facturePdfInputRef = useRef<HTMLInputElement>(null);

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
  const syndicStepColor = "bg-orange-500 text-white";
  const syndicCompletedColor = "bg-orange-400 text-white";
  const isHeaderFocused = ticketTourStep === 1;
  const isStepperFocused = ticketTourStep === 2;
  const isDrawerFocused = ticketTourStep === 3;

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
      ctx.setActiveTicketId(ticket.id);
      ctx.setShowJournal(true);
      setTicketTourStep(3);
      return;
    }
    closeTicketTour();
  };

  return (
    <>
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
          <h1 className="text-xl font-bold">{ticket.titre}</h1>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <p className="text-sm text-muted-foreground">{ticket.reference} · Créé le {new Date(ticket.dateCreation).toLocaleDateString("fr-FR")}</p>
            <Badge variant="outline" className="border-0 bg-primary/10 text-primary text-[10px]">Catégorie : {categoryLabels[ticket.categorie]}</Badge>
            {ticket.responsabilite && <Badge variant="secondary" className="text-[10px]">Responsabilité : {responsabiliteLabels[ticket.responsabilite]}</Badge>}
            {ticket.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setTicketTourStep(1)}>
            <Sparkles className="h-3.5 w-3.5" /> Tutoriel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            disabled={refreshing}
            onClick={async () => {
              if (refreshing) return;
              setRefreshing(true);
              try {
                await Promise.all([
                  ctx.refreshTicket(ticket.id),
                  new Promise((r) => setTimeout(r, 400)), // min-visible spin
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Rafraîchir
          </Button>
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]" onClick={() => { ctx.setActiveTicketId(ticket.id); ctx.setShowJournal(true); }}>
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

          {/* Signalement -> Diagnostic (démo uniquement : en prod le signalement est déjà
              qualifié par l'IA au moment de l'email inbound — rien à montrer ici). */}
          {ticket.status === "signale" && settings.demo_mode && (
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
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Contacter un artisan pour diagnostic sur place</CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate("/artisans")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
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
                      {ctx.artisans.filter(a => a.specialites.some(s => s.toLowerCase().includes(ticket.categorie === "electricite" ? "elect" : ticket.categorie))).map(a => (
                        <Button key={a.id} size="sm" variant="outline" onClick={() => setArtisanContactPending(a.id)}>
                          <Send className="h-3 w-3 mr-1" /> {a.nom}
                        </Button>
                      ))}
                      {/* Other artisans */}
                      {ctx.artisans.filter(a => !a.specialites.some(s => s.toLowerCase().includes(ticket.categorie === "electricite" ? "elect" : ticket.categorie))).map(a => (
                        <Button key={a.id} size="sm" variant="outline" className="opacity-70" onClick={() => setArtisanContactPending(a.id)}>
                          <Send className="h-3 w-3 mr-1" /> {a.nom}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Simulate receiving quote — demo mode only. In prod the quote arrives via the
                  artisan's email (classify-reply extracts it) and appears in the comparison below. */}
              {settings.demo_mode && ticket.artisanId && (
                <Card className="border-0 shadow-sm border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-sm mb-3">L'artisan a effectué son diagnostic sur place ?</p>
                    <Button onClick={() => ctx.receiveQuote(ticket.id)}>
                      <FileText className="h-4 w-4 mr-2" /> Simuler la réception du devis
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quotes already received (edge case where classify-reply didn't auto-advance
                  the status, or an artisan responded before the transition). */}
              {!settings.demo_mode && ticket.quotes.length > 0 && (
                <QuoteComparison quotes={ticket.quotes} onSelect={(quoteId) => ctx.selectQuote(ticket.id, quoteId)} />
              )}

              {/* Prod: info message while waiting for quotes */}
              {!settings.demo_mode && ticket.artisanId && ticket.quotes.length === 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-muted">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">En attente du devis de l'artisan par email. Il apparaîtra automatiquement ici.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Réception devis */}
          {ticket.status === "reception_devis" && (() => {
            const hasMultipleQuotes = ticket.quotes.length > 1;
            const willAutoValidate = selectedQuote ? !needsOwnerApproval(selectedQuote.montant) : false;
            return (
              <>
                {/* Always show the comparison so the gestionnaire picks explicitly (no auto-selection
                    on inbound quotes). Single-quote case = list of 1 with a "Choisir" button. */}
                {ticket.quotes.length > 0 && (
                  <QuoteComparison quotes={ticket.quotes} onSelect={(quoteId) => ctx.selectQuote(ticket.id, quoteId)} />
                )}

                {/* Nothing selected yet — prompt the user to pick a quote before validation. */}
                {!selectedQuote && (
                  <Card className="border-0 shadow-sm border-l-4 border-l-muted">
                    <CardContent className="p-4 flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {ticket.quotes.length === 0
                          ? "En attente d'un devis. Le devis apparaîtra ici dès sa réception par email."
                          : "Choisissez un devis ci-dessus pour passer à la validation."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* The validation card (send to owner / validate) only appears once a quote is selected. */}
                {selectedQuote && (
                <Card className="border-0 shadow-sm border-l-4 border-l-primary">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Devis sélectionné</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      <p className="font-medium text-sm">{selectedQuote.artisanNom}</p>
                      <p className="text-xs text-muted-foreground">{selectedQuote.description}</p>
                      <p className="text-sm font-semibold mt-1">{selectedQuote.montant} € · {selectedQuote.delai}</p>
                      {/* Only show docs linked to THIS quote. Fallback: if no doc has quote_id
                          set yet (legacy rows), show all devis to preserve the previous behavior. */}
                      {ticket.documents
                        .filter((d) => d.document_type === "devis")
                        .filter((d) =>
                          ticket.documents.some((doc) => doc.quote_id)
                            ? d.quote_id === selectedQuote.id
                            : true,
                        )
                        .map(doc => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline text-xs font-medium pt-1 border-t border-border/50 mt-1"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{doc.file_name}</span>
                        </a>
                      ))}
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
                    <Button
                      onClick={() => {
                        // Owner approval path in prod → open a preview modal so the gestionnaire can edit before sending.
                        // Auto-validate path OR demo mode → keep the direct flow (no modal).
                        if (!willAutoValidate && !settings.demo_mode) {
                          setOwnerApprovalOpen(true);
                        } else {
                          ctx.validateQuote(ticket.id);
                        }
                      }}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> {willAutoValidate ? "Valider le devis" : "Envoyer au propriétaire"}
                    </Button>
                  </CardContent>
                </Card>
                )}

                {/* Still allow contacting more artisans for additional quotes before validation (prod only). */}
                {!settings.demo_mode && ctx.artisans.length > 0 && (
                  <Card className="border-0 shadow-sm border-l-4 border-l-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Contacter un autre artisan pour comparer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">Avant de valider, vous pouvez demander un devis à d'autres artisans.</p>
                      <div className="flex flex-wrap gap-2">
                        {ctx.artisans
                          .filter(a => !ticket.quotes.some(q => q.artisanId === a.id))
                          .map(a => (
                            <Button key={a.id} size="sm" variant="outline" className="opacity-80" onClick={() => setArtisanContactPending(a.id)}>
                              <Send className="h-3 w-3 mr-1" /> {a.nom}
                            </Button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Accord propriétaire */}
          {ticket.status === "validation_proprio" && selectedQuote && (() => {
            const ownerMessages = ticket.messages["proprietaire"] ?? [];
            const latestInbound = [...ownerMessages].reverse().find((m) => m.direction === "inbound");
            const latestCategory = latestInbound?.ai_classification?.category;
            const approvalDetected = latestCategory === "approval";
            const refusalDetected = latestCategory === "owner_refusal";
            return (
            <Card className="border-0 shadow-sm border-l-4 border-l-warning">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Accord propriétaire</CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Le devis a été envoyé à <strong className="text-foreground">{ticket.bien.proprietaire}</strong> pour approbation. Retrouvez l'échange dans l'onglet <strong className="text-foreground">Propriétaire</strong> ci-dessus. Sans réponse de sa part, une relance automatique sera envoyée tous les <strong className="text-foreground">{settings.escalation_delay_days} jour{settings.escalation_delay_days > 1 ? "s" : ""}</strong>.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvalDetected && (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-success">Accord détecté dans la réponse du propriétaire</p>
                        {latestInbound?.ai_classification?.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">« {latestInbound.ai_classification.summary} »</p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => setOwnerResponseConfirmOpen(true)}>
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5" /> Confirmer l'accord et notifier artisan + locataire
                    </Button>
                  </div>
                )}
                {refusalDetected && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-destructive">Refus détecté dans la réponse du propriétaire</p>
                        {latestInbound?.ai_classification?.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">« {latestInbound.ai_classification.summary} »</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => ctx.ownerRespond(ticket.id, false)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Confirmer le refus — chercher un nouvel artisan
                    </Button>
                  </div>
                )}
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="font-medium text-sm">{selectedQuote.artisanNom}</p>
                  <p className="text-xs text-muted-foreground">{selectedQuote.description}</p>
                  <p className="text-sm font-semibold mt-1">{selectedQuote.montant} € · {selectedQuote.delai}</p>
                  {ticket.documents
                    .filter((d) => d.document_type === "devis")
                    .filter((d) =>
                      ticket.documents.some((doc) => doc.quote_id)
                        ? d.quote_id === selectedQuote.id
                        : true,
                    )
                    .map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline text-xs font-medium pt-1 border-t border-border/50 mt-1"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{doc.file_name}</span>
                    </a>
                  ))}
                </div>
                <Badge className="bg-warning/15 text-warning border-0">
                  {settings.always_ask_owner
                    ? "Accord propriétaire requis (règle agence)"
                    : `Au-dessus du seuil (${settings.delegation_threshold} €) — Accord propriétaire requis`}
                </Badge>
                {ticket.validationStatus === "en_attente" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>En attente de la réponse du propriétaire…</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => ctx.ownerRespond(ticket.id, true)} className="flex-1">
                    <ArrowRight className="h-4 w-4 mr-2" /> Approuver
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => ctx.ownerRespond(ticket.id, false)}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Refuser — nouveau devis
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })()}

          {/* Intervention — 3 blocs : date / preuves / facture */}
          {(ticket.status === "intervention" || ticket.status === "confirmation_passage") && (() => {
            const vars = buildTemplateVars(ticket, artisan ?? null, settings.agency_name);
            const photoProofs = ticket.documents.filter(d => d.document_type === "photo");
            const hasFacture = !!ticket.facture;

            const openDraft = (key: string, useCase: string, recipientId: string, fallbackSubject: string, fallbackBody: string, label: string) => {
              setInterventionDraft({
                key,
                recipientId,
                label,
                subject: getAutoMessageSubject(settings.email_templates ?? [], useCase, vars, fallbackSubject),
                body: getAutoMessageContent(settings.email_templates ?? [], useCase, vars, fallbackBody),
              });
            };

            const sendDraft = () => {
              if (!interventionDraft) return;
              ctx.addMessage(ticket.id, interventionDraft.recipientId, interventionDraft.body, "agence", interventionDraft.subject);
              sonnerToast.success("Message envoyé");
              setInterventionDraft(null);
            };

            const InlineDraft = () => (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">À : {interventionDraft!.label}</span>
                  <button onClick={() => setInterventionDraft(null)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <Input
                  value={interventionDraft!.subject}
                  onChange={e => setInterventionDraft(d => d ? { ...d, subject: e.target.value } : d)}
                  placeholder="Objet…"
                  className="h-8 text-xs"
                />
                <textarea
                  value={interventionDraft!.body}
                  onChange={e => setInterventionDraft(d => d ? { ...d, body: e.target.value } : d)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button size="sm" onClick={sendDraft} disabled={!interventionDraft!.body.trim()} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Envoyer
                </Button>
              </div>
            );

            return (
              <>
                {/* Bloc 1 — Date d'intervention */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Date d'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">L'artisan doit prendre contact avec le locataire pour planifier l'intervention au {ticket.bien.adresse}.</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground shrink-0">Date planifiée :</span>
                      <DateTimePicker
                        value={ticket.dateInterventionPrevue}
                        onChange={val => ctx.updateTicket(ticket.id, { dateInterventionPrevue: val })}
                        placeholder="Information non communiquée"
                      />
                    </div>
                    {interventionDraft && ["artisan_date", "locataire_date"].includes(interventionDraft.key) && <InlineDraft />}
                    {(!interventionDraft || !["artisan_date", "locataire_date"].includes(interventionDraft.key)) && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                          onClick={() => openDraft("artisan_date", "auto:artisan_relance_date", artisan?.id ?? "artisan", `Relance — date d'intervention ${ticket.bien.adresse}`, `Bonjour ${artisan?.nom ?? ""},\n\nNous attendons que vous preniez contact avec le locataire ${ticket.locataire.nom} (${ticket.locataire.telephone}) pour fixer une date d'intervention au ${ticket.bien.adresse}.\n\nMerci de nous confirmer la date retenue.\n\nCordialement,\n${settings.agency_name}`, artisan?.nom ?? "Artisan")}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Relancer l'artisan
                        </Button>
                        <Button
                          size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                          onClick={() => openDraft("locataire_date", "auto:locataire_contact_artisan", "locataire", `Votre dossier — ${ticket.bien.adresse}`, `Bonjour ${ticket.locataire.nom},\n\nL'artisan chargé de votre intervention devrait vous avoir contacté pour convenir d'une date de passage. Avez-vous été contacté ?\n\nSi oui, pourriez-vous nous indiquer la date et l'heure convenues ?\n\nCordialement,\n${settings.agency_name}`, ticket.locataire.nom)}
                        >
                          <Mail className="h-3.5 w-3.5" /> Contacter le locataire
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bloc 2 — Preuves d'intervention */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Preuves d'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Une fois l'intervention effectuée, demandez des photos à l'artisan ou au locataire, ou ajoutez-les vous-même.</p>
                    {photoProofs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {photoProofs.map(doc => (
                          doc.file_url
                            ? <img key={doc.id} src={doc.file_url} alt={doc.file_name} className="h-16 w-16 object-cover rounded-md border" />
                            : <div key={doc.id} className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">{doc.file_name}</div>
                        ))}
                      </div>
                    )}
                    {interventionDraft && ["artisan_preuve", "locataire_preuve"].includes(interventionDraft.key) && <InlineDraft />}
                    {(!interventionDraft || !["artisan_preuve", "locataire_preuve"].includes(interventionDraft.key)) && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                          onClick={() => openDraft("artisan_preuve", "auto:artisan_demande_preuve", artisan?.id ?? "artisan", `Preuves d'intervention — ${ticket.bien.adresse}`, `Bonjour ${artisan?.nom ?? ""},\n\nSuite à votre intervention au ${ticket.bien.adresse}, pourriez-vous nous transmettre des photos attestant de la réalisation des travaux ?\n\nCordialement,\n${settings.agency_name}`, artisan?.nom ?? "Artisan")}
                        >
                          <Send className="h-3.5 w-3.5" /> Demander à l'artisan
                        </Button>
                        <Button
                          size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                          onClick={() => openDraft("locataire_preuve", "auto:locataire_preuve_passage", "locataire", `Confirmation d'intervention — ${ticket.bien.adresse}`, `Bonjour ${ticket.locataire.nom},\n\nPourriez-vous nous faire parvenir une photo confirmant que l'intervention a bien eu lieu à votre domicile ?\n\nMerci.\n\n${settings.agency_name}`, ticket.locataire.nom)}
                        >
                          <Send className="h-3.5 w-3.5" /> Demander au locataire
                        </Button>
                        <Button
                          size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                          onClick={() => proofInputRef.current?.click()}
                          disabled={uploadingProof}
                        >
                          {uploadingProof ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Ajouter une photo
                        </Button>
                        <input
                          ref={proofInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingProof(true);
                            try {
                              await ctx.uploadTicketDocument(ticket.id, file, "photo", "Preuve d'intervention");
                            } finally {
                              setUploadingProof(false);
                              if (proofInputRef.current) proofInputRef.current.value = "";
                            }
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bloc 3 — Facture */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Facture
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hasFacture ? (
                      <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                        {ticket.facture!.refFacture && <div className="flex justify-between"><span className="text-muted-foreground">Réf.</span><span className="font-mono">{ticket.facture!.refFacture}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-semibold">{ticket.facture!.montant} €</span></div>
                        {ticket.facture!.prestation && <div className="flex justify-between"><span className="text-muted-foreground">Prestation</span><span>{ticket.facture!.prestation}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">Artisan</span><span>{artisan?.nom}</span></div>
                        {ticket.documents.filter(d => d.document_type === "facture").map(doc => (
                          <div key={doc.id} className="flex justify-between items-center pt-1 border-t mt-1">
                            <span className="text-muted-foreground">Fichier</span>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline text-xs font-medium">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">{doc.file_name}</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">En attente de la facture de l'artisan. La facture est obligatoire pour passer à l'étape suivante.</p>
                        {factureForm ? (
                          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                            <p className="text-xs font-medium">Saisir la facture manuellement</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">Montant (€) *</label>
                                <Input value={factureForm.montant} onChange={e => setFactureForm(f => f ? { ...f, montant: e.target.value } : f)} placeholder="ex : 250" className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">Référence</label>
                                <Input value={factureForm.ref} onChange={e => setFactureForm(f => f ? { ...f, ref: e.target.value } : f)} placeholder="ex : FAC-001" className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">Prestation</label>
                                <Input value={factureForm.prestation} onChange={e => setFactureForm(f => f ? { ...f, prestation: e.target.value } : f)} placeholder="ex : Remplacement robinet" className="h-8 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">Date</label>
                                <Input type="date" value={factureForm.date} onChange={e => setFactureForm(f => f ? { ...f, date: e.target.value } : f)} className="h-8 text-xs" />
                              </div>
                            </div>
                            {/* PDF attachment */}
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground">PDF de la facture *</label>
                              {factureForm.file ? (
                                <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 bg-background text-xs">
                                  <FileText className="h-3.5 w-3.5 text-success shrink-0" />
                                  <span className="flex-1 truncate">{factureForm.file.name}</span>
                                  <button
                                    onClick={() => setFactureForm(f => f ? { ...f, file: null } : f)}
                                    className="shrink-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => facturePdfInputRef.current?.click()}
                                  className="w-full rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors flex items-center gap-2"
                                >
                                  <Plus className="h-3.5 w-3.5 shrink-0" /> Joindre un PDF
                                </button>
                              )}
                              <input
                                ref={facturePdfInputRef}
                                type="file"
                                accept="application/pdf,image/jpeg,image/png"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0] ?? null;
                                  setFactureForm(f => f ? { ...f, file } : f);
                                  if (facturePdfInputRef.current) facturePdfInputRef.current.value = "";
                                }}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFactureForm(null)} disabled={uploadingFacture}>Annuler</Button>
                              <Button
                                size="sm" className="h-7 text-xs gap-1.5"
                                disabled={!factureForm.montant || isNaN(parseFloat(factureForm.montant)) || !factureForm.file || uploadingFacture}
                                onClick={async () => {
                                  setUploadingFacture(true);
                                  try {
                                    ctx.updateTicket(ticket.id, {
                                      facture: {
                                        montant: parseFloat(factureForm!.montant),
                                        payee: false,
                                        refFacture: factureForm!.ref || undefined,
                                        dateFacture: factureForm!.date || undefined,
                                        prestation: factureForm!.prestation || undefined,
                                      }
                                    });
                                    if (factureForm!.file) {
                                      await ctx.uploadTicketDocument(ticket.id, factureForm!.file, "facture", factureForm!.prestation || "Facture d'intervention");
                                    }
                                    setFactureForm(null);
                                  } finally {
                                    setUploadingFacture(false);
                                  }
                                }}
                              >
                                {uploadingFacture ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {uploadingFacture ? "Envoi…" : "Enregistrer"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {interventionDraft?.key === "artisan_facture" && <InlineDraft />}
                            {interventionDraft?.key !== "artisan_facture" && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                                  onClick={() => openDraft("artisan_facture", "auto:artisan_relance_facture", artisan?.id ?? "artisan", `Facture en attente — ${ticket.bien.adresse}`, `Bonjour ${artisan?.nom ?? ""},\n\nNous n'avons pas encore reçu votre facture concernant l'intervention au ${ticket.bien.adresse}. Pourriez-vous nous la transmettre dans les meilleurs délais ?\n\nCordialement,\n${settings.agency_name}`, artisan?.nom ?? "Artisan")}
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Relancer l'artisan
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setFactureForm({ montant: "", ref: "", prestation: "", date: "", file: null })}>
                                  <Plus className="h-3.5 w-3.5" /> Ajouter manuellement
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* CTA — Passer à la facturation */}
                <div className="pt-1">
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      if (!hasFacture) { setShowFactureRequired(true); return; }
                      if (photoProofs.length === 0) { setShowProofsWarning(true); return; }
                      ctx.advanceToFacturation(ticket.id);
                    }}
                  >
                    Passer à la facturation <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Modale — pas de preuves */}
                {showProofsWarning && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowProofsWarning(false)}>
                    <div className="w-[380px] rounded-[4px] border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
                      <div className="px-5 py-4 border-b">
                        <p className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Aucune preuve jointe</p>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Vous n'avez pas encore ajouté de preuve d'intervention (photos). Voulez-vous tout de même passer à l'étape Facturation ?</p>
                      </div>
                      <div className="px-5 py-3 border-t flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowProofsWarning(false)}>Annuler</Button>
                        <Button size="sm" onClick={() => { setShowProofsWarning(false); ctx.advanceToFacturation(ticket.id); }}>Continuer sans preuve</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modale — facture obligatoire */}
                {showFactureRequired && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFactureRequired(false)}>
                    <div className="w-[400px] rounded-[4px] border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
                      <div className="px-5 py-4 border-b">
                        <p className="text-sm font-semibold flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Facture manquante</p>
                      </div>
                      <div className="px-5 py-4 space-y-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">La facture est obligatoire pour passer à l'étape Facturation. Elle est nécessaire pour le règlement, l'imputation comptable et la clôture du dossier.</p>
                        <p className="text-sm text-muted-foreground">Relancez l'artisan ou saisissez la facture manuellement dans le bloc ci-dessus.</p>
                      </div>
                      <div className="px-5 py-3 border-t flex justify-end">
                        <Button size="sm" onClick={() => setShowFactureRequired(false)}>Compris</Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

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
                {(() => {
                  const vars = buildTemplateVars(ticket, artisan ?? null, settings.agency_name);
                  const defaultSubject = getAutoMessageSubject(
                    settings.email_templates ?? [],
                    "auto:proprietaire_cloture",
                    vars,
                    `Clôture de votre dossier — ${ticket.bien.adresse}`,
                  );
                  const defaultBody = getAutoMessageContent(
                    settings.email_templates ?? [],
                    "auto:proprietaire_cloture",
                    vars,
                    `Bonjour,\n\nVotre dossier concernant le bien au ${ticket.bien.adresse} est désormais clôturé.\n\nMontant facturé : ${ticket.facture?.montant} €.\n\nCordialement,\n${settings.agency_name}`,
                  );
                  const threadKeyForRole: Record<Recipient["role"], string | null> = {
                    tenant: "locataire", owner: "proprietaire",
                    artisan: ticket.artisanId ?? null, syndic: "syndic",
                    accountant: null, custom: null,
                  };
                  return (
                    <RecipientSelector
                      ticket={ticket}
                      artisans={ctx.artisans}
                      accountantEmail={settings.accountant_email || undefined}
                      defaultSubject={defaultSubject}
                      defaultBody={defaultBody}
                      onSend={async (recipients, subject, body) => {
                        // Add message to each stakeholder thread that has one
                        recipients.forEach(r => {
                          const threadKey = threadKeyForRole[r.role];
                          if (threadKey) ctx.addMessage(ticket.id, threadKey, body, "agence", subject);
                        });
                        sonnerToast.success(`Récapitulatif envoyé à ${recipients.length} destinataire${recipients.length > 1 ? "s" : ""}`);
                        if (USE_SUPABASE && !ticket.id.startsWith("local-")) {
                          try {
                            const names = recipients.map(r => r.name).join(", ");
                            await supabase.from("ticket_journal_entries").insert({
                              ticket_id: ticket.id, type: "notification", triggered_by: "user",
                              message: `Récapitulatif envoyé à : ${names}`,
                              occurred_at: new Date().toISOString(),
                            });
                          } catch (e) { console.error("Failed to persist journal entry", e); }
                        }
                        // Close the ticket
                        ctx.finalizeFacture(ticket.id);
                      }}
                    />
                  );
                })()}
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

          {/* Discussions — always visible, all steps */}
          <DiscussionBlock
            ticket={ticket}
            artisans={ctx.artisans}
            emailTemplates={settings.email_templates ?? []}
            focusTab={discussionFocusTab ?? (ticket.status === "validation_proprio" ? "proprietaire" : null)}
            onFocused={() => setDiscussionFocusTab(null)}
          />

        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
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

          {/* Locataire card */}
          <Card className={`border-0 shadow-sm${ticket.tenant_id ? " cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow" : ""}`}
            onClick={() => ticket.tenant_id && navigate(`/tenants/${ticket.tenant_id}`)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Locataire
                {ticket.tenant_id && <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{ticket.locataire.nom}</p>
              {ticket.locataire.telephone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{ticket.locataire.telephone}</span></div>}
              {ticket.locataire.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" /><span>{ticket.locataire.email}</span></div>}
            </CardContent>
          </Card>

          {/* Bien / Propriétaire card */}
          <Card className={`border-0 shadow-sm${ticket.property_id ? " cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow" : ""}`}
            onClick={() => ticket.property_id && navigate(`/properties/${ticket.property_id}`)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="h-4 w-4" /> Bien
                {ticket.property_id && <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p>{ticket.bien.adresse}</p><p className="text-muted-foreground">{ticket.bien.lot}</p></div></div>
              <Separator />
              <div className={`space-y-2${ticket.owner_id ? " cursor-pointer" : ""}`} onClick={e => { if (ticket.owner_id) { e.stopPropagation(); navigate(`/owners/${ticket.owner_id}`); } }}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">Propriétaire {ticket.owner_id && <ArrowRight className="h-3 w-3 text-muted-foreground" />}</p>
                <p className="font-medium">{ticket.bien.proprietaire}</p>
                {ticket.bien.telephoneProprio && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{ticket.bien.telephoneProprio}</span></div>}
                {ticket.bien.emailProprio && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" /><span>{ticket.bien.emailProprio}</span></div>}
              </div>
            </CardContent>
          </Card>
          {artisan && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Artisan</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{artisan.nom}</p>
                <p className="text-muted-foreground">{artisan.specialites.map(s => artisanSpecialtyLabels[s] ?? s).join(", ") || "—"}</p>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{artisan.telephone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{artisan.email}</div>
              </CardContent>
            </Card>
          )}

          <TicketDocuments ticketId={ticket.id} documents={ticket.documents ?? []} />
        </div>
      </div>

    </div>

    {/* Artisan contact confirmation modal */}
    {artisanContactPending && (() => {
      const pendingArtisan = ctx.getArtisan(artisanContactPending);
      if (!pendingArtisan) return null;
      return (
        <ArtisanContactModal
          open
          artisan={pendingArtisan}
          ticket={ticket}
          onClose={() => setArtisanContactPending(null)}
          onConfirm={(subject, content) => {
            ctx.sendArtisanContact(ticket.id, artisanContactPending, content, subject);
            setArtisanContactPending(null);
            setDiscussionFocusTab("artisans");
          }}
        />
      );
    })()}

    {/* Owner response confirmation modal — shown when owner's reply was classified as approval. */}
    {ownerResponseConfirmOpen && (() => {
      const ownerMessages = ticket.messages["proprietaire"] ?? [];
      const latestInbound = [...ownerMessages].reverse().find((m) => m.direction === "inbound");
      return (
        <OwnerResponseConfirmModal
          open
          ticket={ticket}
          artisan={selectedQuote ? (ctx.getArtisan(selectedQuote.artisanId) ?? null) : null}
          settings={settings}
          aiSummary={latestInbound?.ai_classification?.summary}
          onClose={() => setOwnerResponseConfirmOpen(false)}
          onConfirm={(overrides) => {
            setOwnerResponseConfirmOpen(false);
            ctx.ownerRespond(ticket.id, true, overrides);
          }}
        />
      );
    })()}

    {/* Owner approval preview modal — shown before sending the approval request to the owner. */}
    {ownerApprovalOpen && selectedQuote && (
      <OwnerApprovalModal
        open
        ticket={ticket}
        artisan={ctx.getArtisan(selectedQuote.artisanId) ?? null}
        quote={selectedQuote}
        settings={settings}
        onClose={() => setOwnerApprovalOpen(false)}
        onConfirm={(subject, content, attachmentDocIds) => {
          setOwnerApprovalOpen(false);
          ctx.validateQuote(ticket.id, undefined, { subject, content, attachmentDocumentIds: attachmentDocIds });
        }}
      />
    )}
    </>
  );
}
