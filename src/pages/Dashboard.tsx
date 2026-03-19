import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, statusColors, workflowSteps, TicketCategory, TicketPriority, categoryLabels, priorityLabels, responsabiliteLabels, Responsabilite } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Clock, CheckCircle2, HardHat, ArrowRight, Mail, Brain, Sparkles } from "lucide-react";

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
  detectedAgo: string;
  sourceEmail: string;
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
    detectedAgo: "il y a 2h", sourceEmail: "travaux@agence-durand.fr",
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
    detectedAgo: "il y a 4h", sourceEmail: "travaux@agence-durand.fr",
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
    detectedAgo: "il y a 5h", sourceEmail: "travaux@agence-durand.fr",
    mailSource: { from: "t.roche@email.fr", to: "travaux@agence-durand.fr", subject: "Serrure porte entrée difficile", receivedAt: "2026-03-20T05:45:00", body: "Bonjour,\n\nDepuis quelques jours la serrure de ma porte d'entrée est de plus en plus difficile à tourner. Ce matin j'ai mis 5 minutes à ouvrir. J'ai peur de me retrouver bloqué dehors.\n\nEst-ce possible de faire venir un serrurier ?\n\nMerci d'avance,\nThomas Roche\n5 place de la Comédie, Apt 1B\nTél : 06 55 44 33 22" },
  },
];

export default function Dashboard() {
  const { tickets, createTicket } = useTickets();
  const navigate = useNavigate();
  const [autoSignalements, setAutoSignalements] = useState<AutoSignalement[]>(initialAutoSignalements);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState<AutoSignalement | null>(null);
  const [correctionForm, setCorrectionForm] = useState<{ categorie: TicketCategory; priorite: TicketPriority; responsabilite: Responsabilite; description: string; urgence: boolean }>({ categorie: "plomberie", priorite: "normale", responsabilite: "proprietaire", description: "", urgence: false });

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
    }, 400);
  };

  const openCorrection = (s: AutoSignalement) => {
    setCorrecting(s);
    setCorrectionForm({ categorie: s.categorie, priorite: s.priorite, responsabilite: s.responsabilite, description: s.description, urgence: s.urgence });
  };

  const submitCorrection = () => {
    if (!correcting) return;
    const updated = { ...correcting, ...correctionForm };
    validateSignalement(updated);
    setCorrecting(null);
  };

  const ouverts = tickets.filter(t => t.status !== "cloture").length;
  const urgents = tickets.filter(t => t.urgence || t.priorite === "urgente").length;
  const interventions = tickets.filter(t => t.status === "intervention").length;
  const clotures = tickets.filter(t => t.status === "cloture").length;
  const statusCounts = workflowSteps.map(s => ({ ...s, count: tickets.filter(t => t.status === s.key).length }));
  const recentTickets = [...tickets].sort((a, b) => b.dateMaj.localeCompare(a.dateMaj)).slice(0, 5);
  const routeMap: Record<string, string> = { signale: "/qualification", qualifie: "/qualification", contact_artisan: "/artisans", reception_devis: "/artisans", validation_proprio: "/validation", intervention: "/interventions", confirmation_passage: "/confirmation", facturation: "/facturation", cloture: "/cloture", contact_syndic: "/tickets", relance_syndic: "/tickets", escalade_syndic: "/tickets", resolution_syndic: "/tickets" };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold">Tableau de bord</h1>

      {/* Auto-detected signalements */}
      {autoSignalements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{autoSignalements.length} nouveau{autoSignalements.length > 1 ? "x" : ""} signalement{autoSignalements.length > 1 ? "s" : ""} détecté{autoSignalements.length > 1 ? "s" : ""}</p>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Analysés automatiquement par l'IA depuis les mails entrants</p>
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
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{categoryLabels[s.categorie]}</Badge>
                      <Badge variant="outline" className="text-[10px] border-0 bg-warning/15 text-warning">{priorityLabels[s.priorite]}</Badge>
                      <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">{responsabiliteLabels[s.responsabilite]}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Détecté {s.detectedAgo} depuis {s.sourceEmail}</p>
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Ouverts</p><p className="text-2xl font-bold">{ouverts}</p></div><Clock className="h-8 w-8 text-primary/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Urgents</p><p className="text-2xl font-bold text-destructive">{urgents}</p></div><AlertTriangle className="h-8 w-8 text-destructive/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Interventions</p><p className="text-2xl font-bold">{interventions}</p></div><HardHat className="h-8 w-8 text-accent/20" /></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Clôturés</p><p className="text-2xl font-bold text-success">{clotures}</p></div><CheckCircle2 className="h-8 w-8 text-success/20" /></div></CardContent></Card>
      </div>

      {/* Pipeline + Recent tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline</CardTitle></CardHeader><CardContent><div className="space-y-2">
          {statusCounts.map(s => (
            <div key={s.key} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1.5 transition-colors" onClick={() => navigate(routeMap[s.key] || "/tickets")}>
              <Badge variant="outline" className={`status-badge border-0 w-24 justify-center ${statusColors[s.key]}`}>{s.label}</Badge>
              <div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, s.count * 25)}%` }} /></div>
              <span className="text-sm font-semibold w-6 text-right">{s.count}</span>
            </div>
          ))}
        </div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">Tickets récents</CardTitle></CardHeader><CardContent><div className="space-y-2">
          {recentTickets.map(t => (
            <div key={t.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1.5 transition-colors" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{t.titre}</p><p className="text-[10px] text-muted-foreground">{t.reference} · {t.locataire.nom}</p></div>
              <Badge variant="outline" className={`status-badge border-0 text-[10px] ${statusColors[t.status]}`}>{statusLabels[t.status]}</Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div></CardContent></Card>
      </div>

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
              <div className="flex items-center gap-2">
                <input type="checkbox" id="urgence-check" checked={correctionForm.urgence} onChange={e => setCorrectionForm(p => ({ ...p, urgence: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="urgence-check" className="text-xs cursor-pointer">Urgence</Label>
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
