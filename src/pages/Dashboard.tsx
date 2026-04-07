import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { TicketCategory, TicketPriority, categoryLabels, priorityLabels, responsabiliteLabels, Responsabilite } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Clock, CheckCircle2, HardHat, Mail, Brain, Sparkles, FileText } from "lucide-react";
import { GuidedTour } from "@/components/GuidedTour";

interface AutoSignalement {
  id: string;
  titre: string;
  description: string;
  adresse: string;
  lot: string;
  locataireNom: string;
  locataireTel: string;
  locataireEmail: string;
  proprietaire: string;
  telephoneProprio: string;
  emailProprio: string;
  categorie: TicketCategory;
  priorite: TicketPriority;
  responsabilite: Responsabilite;
  urgence: boolean;
  mailSource: { from: string; to: string; subject: string; body: string; receivedAt: string };
}

const initialAutoSignalements: AutoSignalement[] = [
  {
    id: "auto-1",
    titre: "Fuite sous évier — salle de bain",
    description: "Le locataire signale une fuite d'eau sous le lavabo de la salle de bain. L'eau s'infiltre dans le meuble vasque.",
    adresse: "7 rue Pasteur, 75015 Paris", lot: "Apt 2A",
    locataireNom: "Julie Petit", locataireTel: "06 34 56 78 90", locataireEmail: "j.petit@email.fr",
    proprietaire: "Marc Lefèvre", telephoneProprio: "06 77 88 99 00", emailProprio: "m.lefevre@email.fr",
    categorie: "plomberie", priorite: "haute", responsabilite: "proprietaire", urgence: false,
    mailSource: { from: "j.petit@email.fr", to: "travaux@agence-durand.fr", subject: "Problème fuite salle de bain", receivedAt: "2026-03-20T08:15:00", body: "Bonjour,\n\nJe vous contacte car il y a une fuite sous le lavabo de la salle de bain depuis ce matin. L'eau coule doucement mais le meuble vasque commence à gonfler.\n\nMerci de faire intervenir un plombier.\n\nCordialement,\nJulie Petit\n7 rue Pasteur, Apt 2A\nTél : 06 34 56 78 90" },
  },
  {
    id: "auto-2",
    titre: "Panne radiateur chambre",
    description: "Le radiateur de la chambre principale ne chauffe plus. Les autres radiateurs fonctionnent normalement.",
    adresse: "22 boulevard Voltaire, 69003 Lyon", lot: "Apt 4C",
    locataireNom: "Sophie Martin", locataireTel: "06 11 22 33 44", locataireEmail: "s.martin@email.fr",
    proprietaire: "Groupe Immo Plus", telephoneProprio: "04 78 99 88 77", emailProprio: "gestion@immoplus.fr",
    categorie: "chauffage", priorite: "normale", responsabilite: "proprietaire", urgence: false,
    mailSource: { from: "s.martin@email.fr", to: "travaux@agence-durand.fr", subject: "Radiateur en panne", receivedAt: "2026-03-20T06:30:00", body: "Bonjour,\n\nLe radiateur de ma chambre ne fonctionne plus depuis hier soir. J'ai vérifié le thermostat et purgé le radiateur mais rien n'y fait. Les autres pièces chauffent normalement.\n\nPourriez-vous envoyer un chauffagiste ?\n\nMerci,\nSophie Martin\n22 boulevard Voltaire, Apt 4C, Lyon 3ème" },
  },
  {
    id: "auto-3",
    titre: "Porte d'entrée — serrure grippée",
    description: "Le locataire a du mal à tourner la clé dans la serrure de la porte d'entrée. Risque de blocage complet.",
    adresse: "5 place de la Comédie, 34000 Montpellier", lot: "Apt 1B",
    locataireNom: "Thomas Roche", locataireTel: "06 55 44 33 22", locataireEmail: "t.roche@email.fr",
    proprietaire: "Anne Dubois", telephoneProprio: "04 67 12 34 56", emailProprio: "a.dubois@email.fr",
    categorie: "serrurerie", priorite: "haute", responsabilite: "proprietaire", urgence: false,
    mailSource: { from: "t.roche@email.fr", to: "travaux@agence-durand.fr", subject: "Serrure porte entrée difficile", receivedAt: "2026-03-20T05:45:00", body: "Bonjour,\n\nDepuis quelques jours la serrure de ma porte d'entrée est de plus en plus difficile à tourner. Ce matin j'ai mis 5 minutes à ouvrir. J'ai peur de me retrouver bloqué dehors.\n\nEst-ce possible de faire venir un serrurier ?\n\nMerci d'avance,\nThomas Roche\n5 place de la Comédie, Apt 1B\nTél : 06 55 44 33 22" },
  },
];

export default function Dashboard() {
  const { tickets, createTicket } = useTickets();
  const navigate = useNavigate();
  const [autoSignalements, setAutoSignalements] = useState<AutoSignalement[]>(initialAutoSignalements);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState<AutoSignalement | null>(null);
  const [tourHighlight, setTourHighlight] = useState(false);
  const [correctionForm, setCorrectionForm] = useState<{ categorie: TicketCategory; priorite: TicketPriority; responsabilite: Responsabilite; description: string }>({ categorie: "plomberie", priorite: "normale", responsabilite: "proprietaire", description: "" });
  const [viewModes, setViewModes] = useState<Record<string, "synthese" | "mail">>({});

  const validateSignalement = (s: AutoSignalement) => {
    setDismissing(prev => new Set(prev).add(s.id));
    setTimeout(() => {
      const ticket = createTicket({
        titre: s.titre, description: s.description,
        categorie: s.categorie, priorite: s.priorite, urgence: s.urgence,
        locataireNom: s.locataireNom, locataireTel: s.locataireTel, locataireEmail: s.locataireEmail,
        adresse: s.adresse, lot: s.lot,
        proprietaire: s.proprietaire, telephoneProprio: s.telephoneProprio, emailProprio: s.emailProprio,
        mailSource: s.mailSource,
      });
      setAutoSignalements(prev => prev.filter(x => x.id !== s.id));
      setDismissing(prev => { const next = new Set(prev); next.delete(s.id); return next; });
      navigate(`/tickets/${ticket.id}`);
    }, 400);
  };

  const openCorrection = (s: AutoSignalement) => {
    setCorrecting(s);
    setCorrectionForm({ categorie: s.categorie, priorite: s.priorite, responsabilite: s.responsabilite, description: s.description });
  };

  const submitCorrection = () => {
    if (!correcting) return;
    const updated = { ...correcting, ...correctionForm };
    validateSignalement(updated);
    setCorrecting(null);
  };

  const ouverts = tickets.filter(t => t.status !== "cloture").length;

  // Sort: urgent tickets first
  const sortedTickets = [...tickets].sort((a, b) => (b.urgence ? 1 : 0) - (a.urgence ? 1 : 0));

  const urgents = tickets.filter(t => t.urgence).length;
  const interventions = sortedTickets.filter(t => t.status === "intervention").length;
  const clotures = sortedTickets.filter(t => t.status === "cloture").length;
  const highlightSignalements = tourHighlight;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <GuidedTour onHighlight={setTourHighlight} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Ouverts</p><p className="text-2xl font-bold">{ouverts}</p></div><Clock className="h-8 w-8 text-primary/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Urgents</p><p className="text-2xl font-bold text-destructive">{urgents}</p></div><AlertTriangle className="h-8 w-8 text-destructive/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Interventions</p><p className="text-2xl font-bold">{interventions}</p></div><HardHat className="h-8 w-8 text-accent/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Clôturés</p><p className="text-2xl font-bold text-success">{clotures}</p></div><CheckCircle2 className="h-8 w-8 text-success/20" /></div></CardContent></Card>
      </div>

      {/* Auto-detected signalements */}
      {autoSignalements.length > 0 && (
        <div className={`space-y-3 transition-all duration-300 ${highlightSignalements ? "relative z-[55] rounded-xl ring-2 ring-indigo-400 ring-offset-4 ring-offset-background p-3 bg-background" : ""}`}>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{autoSignalements.length} nouveau{autoSignalements.length > 1 ? "x" : ""} signalement{autoSignalements.length > 1 ? "s" : ""} détecté{autoSignalements.length > 1 ? "s" : ""}</p>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Analysés automatiquement par Claro depuis les mails entrants</p>
            </div>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>

          {autoSignalements.map(s => (
            <Card key={s.id} className={`border-0 shadow-sm transition-all duration-400 ${dismissing.has(s.id) ? "opacity-0 scale-95 h-0 overflow-hidden" : "opacity-100"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.titre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.adresse}, {s.lot} — Locataire : {s.locataireNom}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant={(!viewModes[s.id] || viewModes[s.id] === "synthese") ? "outline" : "ghost"} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setViewModes(p => ({ ...p, [s.id]: "synthese" })); }}>
                        <Brain className="h-3 w-3 mr-1" /> Synthèse IA
                      </Button>
                      <Button size="sm" variant={viewModes[s.id] === "mail" ? "default" : "ghost"} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setViewModes(p => ({ ...p, [s.id]: "mail" })); }}>
                        <FileText className="h-3 w-3 mr-1" /> Mail original
                      </Button>
                    </div>
                    {(!viewModes[s.id] || viewModes[s.id] === "synthese") ? (
                      <p className="text-xs text-muted-foreground mt-1.5">{s.description}</p>
                    ) : (
                      <div className="mt-1.5 p-2 rounded bg-muted/50 border border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1">De : {s.mailSource.from} · {new Date(s.mailSource.receivedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        <p className="text-xs whitespace-pre-wrap">{s.mailSource.body}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px]">Catégorie : {categoryLabels[s.categorie]}</Badge>
                      <Badge variant="outline" className="text-[10px] border-0 bg-warning/15 text-warning">Priorité : {priorityLabels[s.priorite]}</Badge>
                      <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">Responsabilité : {responsabiliteLabels[s.responsabilite]}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(s.mailSource.receivedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · Reçu par email de "}{s.mailSource.from}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => validateSignalement(s)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Valider et créer le ticket
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openCorrection(s)}>
                      Corriger
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Correction modal */}
      <Dialog open={!!correcting} onOpenChange={open => { if (!open) setCorrecting(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Corriger le signalement</DialogTitle>
          </DialogHeader>
          {correcting && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-medium">{correcting.titre}</p>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea value={correctionForm.description} onChange={e => setCorrectionForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={correctionForm.categorie} onValueChange={v => setCorrectionForm(p => ({ ...p, categorie: v as TicketCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(categoryLabels) as [TicketCategory, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Priorité</Label>
                  <Select value={correctionForm.priorite} onValueChange={v => setCorrectionForm(p => ({ ...p, priorite: v as TicketPriority }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(priorityLabels) as [TicketPriority, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Responsabilité</Label>
                <Select value={correctionForm.responsabilite} onValueChange={v => setCorrectionForm(p => ({ ...p, responsabilite: v as Responsabilite }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(responsabiliteLabels) as [Responsabilite, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrecting(null)}>Annuler</Button>
            <Button onClick={submitCorrection}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Valider et créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
