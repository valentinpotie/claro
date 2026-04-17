import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { TicketCategory, TicketPriority, categoryLabels, responsabiliteLabels, Responsabilite, InboundSignalement } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Brain, Sparkles, FileText, Inbox, Copy, ArrowRight, Send, RefreshCcw, CheckCircle2, Check, ChevronsUpDown, User, Home, Building2, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_SUPABASE } from "@/lib/supabase";
import { GuidedTour } from "@/components/GuidedTour";
import { useTenants } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";

// Mock signalements for demo mode (USE_SUPABASE=false)
const mockSignalements: InboundSignalement[] = [
  {
    id: "auto-1",
    agency_id: "agence-durand",
    from_email: "j.petit@email.fr",
    to_email: "travaux@agence-durand.fr",
    subject: "Problème fuite salle de bain",
    body_text: "Bonjour,\n\nJe vous contacte car il y a une fuite sous le lavabo de la salle de bain depuis ce matin. L'eau coule doucement mais le meuble vasque commence à gonfler.\n\nMerci de faire intervenir un plombier.\n\nCordialement,\nJulie Petit\n7 rue Pasteur, Apt 2A\nTél : 06 34 56 78 90",
    received_at: "2026-03-20T08:15:00",
    status: "processed",
    validation_status: "pending",
    ticket_id: null,
    ai_suggestion: {
      title: "Fuite sous évier — salle de bain",
      category: "plomberie",
      priority: "haute",
      responsibility: "proprietaire",
      ai_summary: "Le locataire signale une fuite d'eau sous le lavabo de la salle de bain. L'eau s'infiltre dans le meuble vasque.",
      ai_qualified_description: "Le locataire signale une fuite d'eau sous le lavabo de la salle de bain. L'eau s'infiltre dans le meuble vasque.",
      tenant_name: "Julie Petit",
      tenant_phone: "06 34 56 78 90",
      property_address: "7 rue Pasteur",
      property_unit: "Apt 2A",
      owner_name: "M. Bernard Dupont",
      owner_phone: "06 11 22 33 44",
      owner_email: "bernard.dupont@email.fr",
      is_urgent: false,
    },
  },
  {
    id: "auto-2",
    agency_id: "agence-durand",
    from_email: "s.martin@email.fr",
    to_email: "travaux@agence-durand.fr",
    subject: "Radiateur en panne",
    body_text: "Bonjour,\n\nLe radiateur de ma chambre ne fonctionne plus depuis hier soir. J'ai vérifié le thermostat et purgé le radiateur mais rien n'y fait. Les autres pièces chauffent normalement.\n\nPourriez-vous envoyer un chauffagiste ?\n\nMerci,\nSophie Martin\n22 boulevard Voltaire, Apt 4C, Lyon 3ème",
    received_at: "2026-03-20T06:30:00",
    status: "processed",
    validation_status: "pending",
    ticket_id: null,
    ai_suggestion: {
      title: "Panne radiateur chambre",
      category: "chauffage",
      priority: "normale",
      responsibility: "proprietaire",
      ai_summary: "Le radiateur de la chambre principale ne chauffe plus. Les autres radiateurs fonctionnent normalement.",
      ai_qualified_description: "Le radiateur de la chambre principale ne chauffe plus. Les autres radiateurs fonctionnent normalement.",
      tenant_name: "Sophie Martin",
      property_address: "22 boulevard Voltaire",
      property_unit: "Apt 4C",
      owner_name: "Mme Claire Perrin",
      owner_email: "claire.perrin@email.fr",
      is_urgent: false,
    },
  },
  {
    id: "auto-3",
    agency_id: "agence-durand",
    from_email: "t.roche@email.fr",
    to_email: "travaux@agence-durand.fr",
    subject: "Serrure porte entrée difficile",
    body_text: "Bonjour,\n\nDepuis quelques jours la serrure de ma porte d'entrée est de plus en plus difficile à tourner. Ce matin j'ai mis 5 minutes à ouvrir. J'ai peur de me retrouver bloqué dehors.\n\nEst-ce possible de faire venir un serrurier ?\n\nMerci d'avance,\nThomas Roche\n5 place de la Comédie, Apt 1B\nTél : 06 55 44 33 22",
    received_at: "2026-03-20T05:45:00",
    status: "processed",
    validation_status: "pending",
    ticket_id: null,
    ai_suggestion: {
      title: "Porte d'entrée — serrure grippée",
      category: "serrurerie",
      priority: "haute",
      responsibility: "proprietaire",
      ai_summary: "Le locataire a du mal à tourner la clé dans la serrure de la porte d'entrée. Risque de blocage complet.",
      ai_qualified_description: "Le locataire a du mal à tourner la clé dans la serrure de la porte d'entrée. Risque de blocage complet.",
      tenant_name: "Thomas Roche",
      tenant_phone: "06 55 44 33 22",
      property_address: "5 place de la Comédie",
      property_unit: "Apt 1B",
      owner_name: "SCI Comédie Lyon",
      is_urgent: false,
    },
  },
];

export default function Dashboard() {
  const { tickets, createTicket, validateSignalement: ctxValidateSignalement, signalements: remoteSignalements, removeSignalement, refetchSignalements } = useTickets();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const { tenants } = useTenants(settings.agency_id);
  const { properties } = useProperties(settings.agency_id);
  const { owners } = useOwners(settings.agency_id);

  const [mockSignalementsState, setMockSignalementsState] = useState<InboundSignalement[]>(
    USE_SUPABASE ? [] : mockSignalements,
  );
  const autoSignalements = USE_SUPABASE ? remoteSignalements : mockSignalementsState;

  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState<InboundSignalement | null>(null);
  const [deletingSignalement, setDeletingSignalement] = useState<InboundSignalement | null>(null);
  const [tourHighlight, setTourHighlight] = useState(false);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date());
  const [, forceTickTick] = useState(0); // re-render every minute to keep timestamp fresh
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => forceTickTick(n => n + 1), 30_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const refreshLabel = (() => {
    const diffMs = Date.now() - lastRefreshed.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return null;
    if (diffMin < 60) return `il y a ${diffMin} min`;
    return `il y a ${Math.floor(diffMin / 60)} h`;
  })();

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Guarantee a minimum visible spin of 700 ms even when the fetch is instant
      await Promise.all([refetchSignalements(), new Promise(r => setTimeout(r, 700))]);
      setLastRefreshed(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };
  const [correctionForm, setCorrectionForm] = useState({
    titre: "",
    description: "",
    categorie: "plomberie" as TicketCategory,
    responsabilite: "proprietaire" as Responsabilite,
    urgence: false,
    locataireNom: "",
    locataireTel: "",
    locataireEmail: "",
    adresse: "",
    lot: "",
    proprietaire: "",
    telephoneProprio: "",
    emailProprio: "",
    tenant_id: "" as string,
    property_id: "" as string,
    owner_id: "" as string,
  });
  const [viewModes, setViewModes] = useState<Record<string, "synthese" | "mail">>({});
  const [emailCopied, setEmailCopied] = useState(false);

  type CardSel = {
    tenant_id: string; tenantName: string; tenantPhone: string; tenantEmail: string;
    property_id: string; propertyAddress: string; propertyUnit: string;
    owner_id: string; ownerName: string; ownerPhone: string; ownerEmail: string;
  };
  const emptySel = (): CardSel => ({
    tenant_id: "", tenantName: "", tenantPhone: "", tenantEmail: "",
    property_id: "", propertyAddress: "", propertyUnit: "",
    owner_id: "", ownerName: "", ownerPhone: "", ownerEmail: "",
  });
  const [cardSelections, setCardSelections] = useState<Record<string, CardSel>>({});
  const [openCombobox, setOpenCombobox] = useState<Record<string, "tenant" | "property" | "owner" | null>>({});

  const claroEmail = settings.email_inbound?.trim() || "Adresse de reception non configuree";

  const handleCopyEmail = () => {
    if (!settings.email_inbound?.trim()) return;
    navigator.clipboard.writeText(claroEmail).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const isEmpty = tickets.length === 0 && autoSignalements.length === 0;

  // Helper to extract display fields from an InboundSignalement
  const categoryFromAi: Record<string, TicketCategory> = {
    plomberie: "plomberie",
    plumbing: "plomberie",
    electricite: "electricite",
    electrical: "electricite",
    serrurerie: "serrurerie",
    locksmith: "serrurerie",
    chauffage: "chauffage",
    heating: "chauffage",
    toiture: "toiture",
    roofing: "toiture",
    humidite: "humidite",
    humidity: "humidite",
    nuisibles: "nuisibles",
    pests: "nuisibles",
    autre: "autre",
    other: "autre",
    general: "autre",
    painting: "autre",
  };

  const responsibilityFromAi: Record<string, Responsabilite> = {
    locataire: "locataire",
    tenant: "locataire",
    proprietaire: "proprietaire",
    owner: "proprietaire",
    partagee: "partagee",
    shared: "partagee",
    syndic: "syndic",
  };

  const normalizeCategory = (value?: string | null): TicketCategory => {
    if (!value) return "autre";
    return categoryFromAi[value.toLowerCase().trim()] ?? "autre";
  };

  const normalizeResponsibility = (value?: string | null): Responsabilite => {
    if (!value) return "proprietaire";
    return responsibilityFromAi[value.toLowerCase().trim()] ?? "proprietaire";
  };

  const htmlToPlainText = (html?: string | null) => {
    if (!html?.trim()) return "";
    if (typeof window !== "undefined" && "DOMParser" in window) {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      return (parsed.body.textContent ?? "").trim();
    }
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const getOriginalMailBody = (s: InboundSignalement) => {
    const text = s.body_text?.trim();
    if (text) return text;
    const htmlText = htmlToPlainText(s.body_html);
    if (htmlText) return htmlText;
    return "Corps du mail indisponible.";
  };

  const getTitle = (s: InboundSignalement) => s.ai_suggestion?.title ?? s.subject;
  const getDescription = (s: InboundSignalement) => s.ai_suggestion?.ai_qualified_description || s.ai_suggestion?.ai_summary || null;
  const getCategory = (s: InboundSignalement) => normalizeCategory(s.ai_suggestion?.category);
  const getResponsibility = (s: InboundSignalement) => normalizeResponsibility(s.ai_suggestion?.responsibility);
  const getTenantName = (s: InboundSignalement) => s.ai_suggestion?.tenant_name ?? "";
  const getTenantPhone = (s: InboundSignalement) => s.ai_suggestion?.tenant_phone ?? "";
  const getPropertyAddress = (s: InboundSignalement) => s.ai_suggestion?.property_address ?? "";
  const getPropertyUnit = (s: InboundSignalement) => s.ai_suggestion?.property_unit ?? "";
  const getOwnerName = (s: InboundSignalement) => s.ai_suggestion?.owner_name ?? "";
  const getOwnerPhone = (s: InboundSignalement) => s.ai_suggestion?.owner_phone ?? "";
  const getOwnerEmail = (s: InboundSignalement) => s.ai_suggestion?.owner_email ?? "";
  const isUrgent = (s: InboundSignalement) => s.ai_suggestion?.is_urgent ?? false;

  const emailInstructionsCard = (
    <Card className="border-0 shadow-sm mt-6 w-full max-w-lg">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Transférez vos emails de travaux</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Les emails envoyés à cette adresse seront automatiquement analysés par Claro et transformés en tickets.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-background border px-3 py-2.5 text-sm font-mono select-all text-center">
              {claroEmail}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyEmail} className="shrink-0 gap-1.5 h-10" disabled={!settings.email_inbound?.trim()}>
              {emailCopied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              {emailCopied ? "Copié !" : "Copier"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="flex gap-2.5 items-start">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="text-xs font-medium">Recevez un email</p>
              <p className="text-[11px] text-muted-foreground">Un locataire vous signale un problème</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="text-xs font-medium">Transférez-le</p>
              <p className="text-[11px] text-muted-foreground">Envoyez-le à votre adresse Claro</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p className="text-xs font-medium">Claro s'en occupe</p>
              <p className="text-[11px] text-muted-foreground">Analyse, création de ticket, suivi</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleValidate = (s: InboundSignalement) => {
    const sel = cardSelections[s.id];
    setDismissing(prev => new Set(prev).add(s.id));
    setTimeout(async () => {
      if (USE_SUPABASE) {
        const ticket = await ctxValidateSignalement(s, sel ? {
          tenantName: sel.tenantName, tenantPhone: sel.tenantPhone, tenantEmail: sel.tenantEmail,
          propertyAddress: sel.propertyAddress, propertyUnit: sel.propertyUnit,
          ownerName: sel.ownerName, ownerPhone: sel.ownerPhone, ownerEmail: sel.ownerEmail,
          tenant_id: sel.tenant_id || undefined,
          property_id: sel.property_id || undefined,
          owner_id: sel.owner_id || undefined,
        } : undefined);
        removeSignalement(s.id);
        setDismissing(prev => { const next = new Set(prev); next.delete(s.id); return next; });
        navigate(`/tickets/${ticket.id}`);
      } else {
        // Demo mode: fallback to createTicket
        const ticket = createTicket({
          titre: getTitle(s), description: getDescription(s),
          categorie: getCategory(s), priorite: "normale" as TicketPriority, urgence: isUrgent(s),
          locataireNom: sel?.tenantName || getTenantName(s),
          locataireTel: sel?.tenantPhone || getTenantPhone(s),
          locataireEmail: sel?.tenantEmail || s.from_email,
          adresse: sel?.propertyAddress || getPropertyAddress(s),
          lot: sel?.propertyUnit || getPropertyUnit(s),
          proprietaire: sel?.ownerName || getOwnerName(s),
          telephoneProprio: sel?.ownerPhone || getOwnerPhone(s),
          emailProprio: sel?.ownerEmail || getOwnerEmail(s),
          mailSource: { from: s.from_email, to: s.to_email, subject: s.subject, body: getOriginalMailBody(s), receivedAt: s.received_at },
          tenant_id: sel?.tenant_id || undefined,
          property_id: sel?.property_id || undefined,
          owner_id: sel?.owner_id || undefined,
        });
        setMockSignalementsState(prev => prev.filter(x => x.id !== s.id));
        setDismissing(prev => { const next = new Set(prev); next.delete(s.id); return next; });
        navigate(`/tickets/${ticket.id}`);
      }
    }, 400);
  };

  const openCorrection = (s: InboundSignalement) => {
    setCorrecting(s);
    setCorrectionForm({
      titre: getTitle(s),
      urgence: isUrgent(s),
      categorie: getCategory(s),
      responsabilite: getResponsibility(s),
      description: getDescription(s),
      locataireNom: getTenantName(s),
      locataireTel: getTenantPhone(s),
      locataireEmail: s.from_email,
      adresse: getPropertyAddress(s),
      lot: getPropertyUnit(s),
      proprietaire: getOwnerName(s),
      telephoneProprio: getOwnerPhone(s),
      emailProprio: getOwnerEmail(s),
      tenant_id: "",
      property_id: "",
      owner_id: "",
    });
  };

  const submitCorrection = () => {
    if (!correcting) return;
    setDismissing(prev => new Set(prev).add(correcting.id));
    setCorrecting(null);
    setTimeout(async () => {
      if (USE_SUPABASE) {
        const ticket = await ctxValidateSignalement(correcting, {
          title: correctionForm.titre,
          category: correctionForm.categorie,
          responsibility: correctionForm.responsabilite,
          description: correctionForm.description,
          urgent: correctionForm.urgence,
          tenantName: correctionForm.locataireNom,
          tenantPhone: correctionForm.locataireTel,
          tenantEmail: correctionForm.locataireEmail,
          propertyAddress: correctionForm.adresse,
          propertyUnit: correctionForm.lot,
          ownerName: correctionForm.proprietaire,
          ownerPhone: correctionForm.telephoneProprio,
          ownerEmail: correctionForm.emailProprio,
          tenant_id: correctionForm.tenant_id || undefined,
          property_id: correctionForm.property_id || undefined,
          owner_id: correctionForm.owner_id || undefined,
        });
        removeSignalement(correcting.id);
        setDismissing(prev => { const next = new Set(prev); next.delete(correcting.id); return next; });
        navigate(`/tickets/${ticket.id}`);
      } else {
        const ticket = createTicket({
          titre: correctionForm.titre, description: correctionForm.description,
          categorie: correctionForm.categorie, priorite: "normale" as TicketPriority, urgence: isUrgent(correcting),
          locataireNom: correctionForm.locataireNom, locataireTel: correctionForm.locataireTel, locataireEmail: correctionForm.locataireEmail,
          adresse: correctionForm.adresse, lot: correctionForm.lot,
          proprietaire: correctionForm.proprietaire, telephoneProprio: correctionForm.telephoneProprio, emailProprio: correctionForm.emailProprio,
          mailSource: { from: correcting.from_email, to: correcting.to_email, subject: correcting.subject, body: getOriginalMailBody(correcting), receivedAt: correcting.received_at },
          tenant_id: correctionForm.tenant_id || undefined,
          property_id: correctionForm.property_id || undefined,
          owner_id: correctionForm.owner_id || undefined,
        });
        setMockSignalementsState(prev => prev.filter(x => x.id !== correcting.id));
        setDismissing(prev => { const next = new Set(prev); next.delete(correcting.id); return next; });
        navigate(`/tickets/${ticket.id}`);
      }
    }, 400);
  };

  const ouverts = tickets.filter(t => t.status !== "cloture").length;

  const urgents = tickets.filter(t => t.urgence && t.status !== "cloture").length;
  const interventions = tickets.filter(t => t.status === "intervention").length;
  const clotures = tickets.filter(t => t.status === "cloture").length;
  const highlightSignalements = tourHighlight;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">Tableau de bord</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Actualiser les signalements"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {refreshLabel && <span>{refreshLabel}</span>}
          </button>
          <GuidedTour onHighlight={setTourHighlight} />
        </div>
      </div>

      {/* KPI cards */}
      {!isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "En cours", value: ouverts, color: "text-foreground", href: "/tickets?filter=active" },
            { label: "Urgents", value: urgents, color: "text-destructive", href: "/tickets?filter=urgent" },
            { label: "Interventions", value: interventions, color: "text-orange-500", href: "/tickets?filter=active" },
            { label: "Clôturés", value: clotures, color: "text-success", href: "/tickets?filter=cloture" },
          ].map(({ label, value, color, href }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className="group text-left bg-card rounded-[4px] px-5 py-4 flex flex-col gap-2 hover:bg-muted/60 transition-colors"
              style={{ boxShadow: "0 20px 60px -10px hsl(180 5% 11% / 0.06)" }}
            >
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
              <span className={`text-4xl font-bold font-display leading-none tabular-nums ${color}`}>{value}</span>
            </button>
          ))}
        </div>
      )}

      {/* Email info card — shown when there are tickets but no pending signalements */}
      {!isEmpty && autoSignalements.length === 0 && (
        <div className="flex justify-center">{emailInstructionsCard}</div>
      )}

      {/* Empty state — first thing new users see */}
      {isEmpty && (
        <div className="flex flex-col items-center text-center py-8 px-4">
          {/* Hero illustration */}
          <div className="relative mb-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Inbox className="h-9 w-9 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center animate-pulse">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
          </div>

          <h2 className="text-lg font-bold font-display">Bienvenue sur Claro</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Votre tableau de bord est prêt. Dès qu'un signalement arrivera, il s'affichera ici pour que vous puissiez le traiter.
          </p>

          {emailInstructionsCard}

          {/* Secondary actions */}
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/signalement")}>
              <Send className="h-3.5 w-3.5" /> Créer un signalement manuellement
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/settings")}>
              Paramètres <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Auto-detected signalements */}
      {autoSignalements.length > 0 && (
        <div className={`space-y-3 transition-all duration-300 ${highlightSignalements ? "relative z-[55] rounded-[4px] ring-2 ring-indigo-400 ring-offset-4 ring-offset-background p-3 bg-background" : ""}`}>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{autoSignalements.length} nouveau{autoSignalements.length > 1 ? "x" : ""} signalement{autoSignalements.length > 1 ? "s" : ""} détecté{autoSignalements.length > 1 ? "s" : ""}</p>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Analysés automatiquement par Claro depuis les mails entrants</p>
            </div>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>

          {autoSignalements.map(s => (
            <Card key={s.id} className={`relative border-0 transition-all duration-400 ${dismissing.has(s.id) ? "opacity-0 scale-95 h-0 overflow-hidden" : "opacity-100"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/12 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold">{getTitle(s)}</p>
                    {(() => {
                      const desc = getDescription(s);
                      const showingMail = viewModes[s.id] === "mail" || !desc;
                      return (
                        <>
                          {desc && (
                            <div className="flex gap-1 mt-2">
                              <Button size="sm" variant={!showingMail ? "outline" : "ghost"} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setViewModes(p => ({ ...p, [s.id]: "synthese" })); }}>
                                <Brain className="h-3 w-3 mr-1" /> Synthèse Claro
                              </Button>
                              <Button size="sm" variant={showingMail ? "default" : "ghost"} className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setViewModes(p => ({ ...p, [s.id]: "mail" })); }}>
                                <FileText className="h-3 w-3 mr-1" /> Mail original
                              </Button>
                            </div>
                          )}
                          {!showingMail ? (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
                          ) : (
                            <div className="mt-1.5 p-2 rounded-[4px] bg-muted/50 border border-border/50">
                              <p className="text-[10px] text-muted-foreground mb-1">De : {s.from_email} · {new Date(s.received_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                              <p className="text-sm whitespace-pre-wrap">{getOriginalMailBody(s)}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="default" className="text-[11px]">Catégorie : {categoryLabels[getCategory(s)]}</Badge>
                      <Badge variant="secondary" className="text-[11px]">Responsabilité : {responsabiliteLabels[getResponsibility(s)]}</Badge>
                      {isUrgent(s) && <Badge variant="destructive" className="text-[11px]">Urgent</Badge>}
                    </div>

                    {/* Sélection locataire / bien / propriétaire */}
                    {(() => {
                      const sel = cardSelections[s.id] ?? emptySel();
                      const setOpen = (type: "tenant" | "property" | "owner" | null) =>
                        setOpenCombobox(p => ({ ...p, [s.id]: type }));
                      const setSel = (patch: Partial<CardSel>) =>
                        setCardSelections(p => ({ ...p, [s.id]: { ...(p[s.id] ?? emptySel()), ...patch } }));

                      const fieldCls = "flex items-center gap-0.5 hover:text-foreground transition-colors cursor-pointer";

                      return (
                        <div className="mt-2 pt-2 border-t border-dashed">
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                            {/* Locataire */}
                            <Popover open={openCombobox[s.id] === "tenant"} onOpenChange={open => setOpen(open ? "tenant" : null)}>
                              <PopoverTrigger asChild>
                                <button className={fieldCls}>
                                  <span className="opacity-60">Locataire :</span>
                                  <span className={cn("ml-1", sel.tenantName ? "text-foreground" : "italic opacity-50")}>{sel.tenantName || getTenantName(s) || "Non lié"}</span>
                                  <ChevronsUpDown className="h-2.5 w-2.5 ml-0.5 opacity-40 shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-72" align="start">
                                <Command>
                                  <CommandInput placeholder="Rechercher un locataire…" />
                                  <CommandList>
                                    <CommandEmpty>Aucun locataire trouvé</CommandEmpty>
                                    <CommandGroup>
                                      {tenants.map(t => {
                                        const name = `${t.first_name ?? ""} ${t.last_name}`.trim();
                                        return (
                                          <CommandItem key={t.id} value={name} onSelect={() => {
                                            setSel({ tenant_id: t.id, tenantName: name, tenantPhone: t.phone ?? "", tenantEmail: t.email ?? "" });
                                            setOpen(null);
                                          }}>
                                            <Check className={cn("mr-2 h-3.5 w-3.5", sel.tenant_id === t.id ? "opacity-100" : "opacity-0")} />
                                            <span>{name}</span>
                                            {t.phone && <span className="ml-auto text-[10px] text-muted-foreground">{t.phone}</span>}
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                  <div className="border-t p-1.5">
                                    <button className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors" onClick={() => { navigate("/tenants"); setOpen(null); }}>
                                      <ExternalLink className="h-3 w-3" /> Gérer les locataires
                                    </button>
                                  </div>
                                </Command>
                              </PopoverContent>
                            </Popover>

                            {/* Bien */}
                            <Popover open={openCombobox[s.id] === "property"} onOpenChange={open => setOpen(open ? "property" : null)}>
                              <PopoverTrigger asChild>
                                <button className={fieldCls}>
                                  <span className="opacity-60">Bien :</span>
                                  <span className={cn("ml-1", sel.propertyAddress ? "text-foreground" : "italic opacity-50")}>
                                    {sel.propertyAddress
                                      ? `${sel.propertyAddress}${sel.propertyUnit ? ` · ${sel.propertyUnit}` : ""}`
                                      : getPropertyAddress(s)
                                        ? `${getPropertyAddress(s)}${getPropertyUnit(s) ? ` · ${getPropertyUnit(s)}` : ""}`
                                        : "Non lié"}
                                  </span>
                                  <ChevronsUpDown className="h-2.5 w-2.5 ml-0.5 opacity-40 shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-72" align="start">
                                <Command>
                                  <CommandInput placeholder="Rechercher un bien…" />
                                  <CommandList>
                                    <CommandEmpty>Aucun bien trouvé</CommandEmpty>
                                    <CommandGroup>
                                      {properties.map(p => {
                                        const addr = p.address + (p.city ? `, ${p.city}` : "");
                                        const label = addr + (p.unit_number ? ` · ${p.unit_number}` : "");
                                        return (
                                          <CommandItem key={p.id} value={label} onSelect={() => {
                                            setSel({ property_id: p.id, propertyAddress: addr, propertyUnit: p.unit_number ?? "" });
                                            setOpen(null);
                                          }}>
                                            <Check className={cn("mr-2 h-3.5 w-3.5", sel.property_id === p.id ? "opacity-100" : "opacity-0")} />
                                            <span className="truncate">{label}</span>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                  <div className="border-t p-1.5">
                                    <button className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors" onClick={() => { navigate("/properties"); setOpen(null); }}>
                                      <ExternalLink className="h-3 w-3" /> Gérer les biens
                                    </button>
                                  </div>
                                </Command>
                              </PopoverContent>
                            </Popover>

                            {/* Propriétaire */}
                            <Popover open={openCombobox[s.id] === "owner"} onOpenChange={open => setOpen(open ? "owner" : null)}>
                              <PopoverTrigger asChild>
                                <button className={fieldCls}>
                                  <span className="opacity-60">Propriétaire :</span>
                                  <span className={cn("ml-1", sel.ownerName ? "text-foreground" : "italic opacity-50")}>{sel.ownerName || getOwnerName(s) || "Non lié"}</span>
                                  <ChevronsUpDown className="h-2.5 w-2.5 ml-0.5 opacity-40 shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-72" align="start">
                                <Command>
                                  <CommandInput placeholder="Rechercher un propriétaire…" />
                                  <CommandList>
                                    <CommandEmpty>Aucun propriétaire trouvé</CommandEmpty>
                                    <CommandGroup>
                                      {owners.map(o => {
                                        const name = `${o.first_name ?? ""} ${o.last_name}`.trim();
                                        return (
                                          <CommandItem key={o.id} value={name} onSelect={() => {
                                            setSel({ owner_id: o.id, ownerName: name, ownerPhone: o.phone ?? "", ownerEmail: o.email ?? "" });
                                            setOpen(null);
                                          }}>
                                            <Check className={cn("mr-2 h-3.5 w-3.5", sel.owner_id === o.id ? "opacity-100" : "opacity-0")} />
                                            <span>{name}</span>
                                            {o.email && <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[100px]">{o.email}</span>}
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                  <div className="border-t p-1.5">
                                    <button className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors" onClick={() => { navigate("/owners"); setOpen(null); }}>
                                      <ExternalLink className="h-3 w-3" /> Gérer les propriétaires
                                    </button>
                                  </div>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="opacity-60">Reçu le :</span> {new Date(s.received_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{s.from_email}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {(() => {
                      const sel = cardSelections[s.id];
                      const canValidate = !!sel?.tenant_id && !!sel?.property_id && !!sel?.owner_id;
                      const missing: string[] = [];
                      if (!sel?.tenant_id) missing.push("locataire");
                      if (!sel?.property_id) missing.push("bien");
                      if (!sel?.owner_id) missing.push("propriétaire");
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" disabled={!canValidate} onClick={() => handleValidate(s)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Valider et créer le ticket
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canValidate && (
                              <TooltipContent side="left" className="max-w-[200px] text-center">
                                Sélectionnez un {missing.join(", un ")} pour valider
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                    <Button size="sm" variant="outline" className="text-muted-foreground hover:text-foreground" onClick={() => openCorrection(s)}>
                      Corriger
                    </Button>
                  </div>
                </div>
                <button
                  className="absolute bottom-2 right-2 p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={e => { e.stopPropagation(); setDeletingSignalement(s); }}
                  title="Supprimer ce signalement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Correction modal */}
      <Dialog open={!!correcting} onOpenChange={open => { if (!open) setCorrecting(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] !flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-base">Corriger le signalement</DialogTitle>
            <DialogDescription className="sr-only">Modifier les informations extraites du signalement avant de créer le ticket</DialogDescription>
          </DialogHeader>
          {correcting && (
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="space-y-4 pr-2">
                {/* Email source */}
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">De :</span> {correcting.from_email}
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{new Date(correcting.received_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {/* Signalement */}
                <div className="space-y-2">
                  <Label htmlFor="correction-title">Titre</Label>
                  <Input id="correction-title" value={correctionForm.titre} onChange={e => setCorrectionForm(p => ({ ...p, titre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correction-description">Description</Label>
                  <Textarea id="correction-description" value={correctionForm.description} onChange={e => setCorrectionForm(p => ({ ...p, description: e.target.value }))} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={correctionForm.categorie} onValueChange={v => setCorrectionForm(p => ({ ...p, categorie: v as TicketCategory }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(categoryLabels) as [TicketCategory, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsabilité</Label>
                    <Select value={correctionForm.responsabilite} onValueChange={v => setCorrectionForm(p => ({ ...p, responsabilite: v as Responsabilite }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(responsabiliteLabels) as [Responsabilite, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">Urgence</span>
                  <Switch checked={correctionForm.urgence} onCheckedChange={value => setCorrectionForm(p => ({ ...p, urgence: value }))} />
                </div>

                <Separator />

                {/* Locataire — relational */}
                <div className="space-y-2">
                  <Label>Locataire (lier à un existant)</Label>
                  <Select value={correctionForm.tenant_id} onValueChange={v => {
                    if (v === "__go-tenants") {
                      navigate("/tenants");
                      return;
                    }
                    const t = tenants.find(t => t.id === v);
                    if (t) {
                      setCorrectionForm(p => ({ ...p, tenant_id: v, locataireNom: `${t.first_name ?? ""} ${t.last_name}`.trim(), locataireTel: t.phone ?? p.locataireTel, locataireEmail: t.email ?? p.locataireEmail }));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un locataire…" /></SelectTrigger>
                    <SelectContent>
                      {tenants.length === 0 && <SelectItem value="__go-tenants">Aucun locataire - Ouvrir la page Locataires</SelectItem>}
                      {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={correctionForm.locataireNom} onChange={e => setCorrectionForm(p => ({ ...p, locataireNom: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={correctionForm.locataireTel} onChange={e => setCorrectionForm(p => ({ ...p, locataireTel: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={correctionForm.locataireEmail} onChange={e => setCorrectionForm(p => ({ ...p, locataireEmail: e.target.value }))} /></div>
                </div>

                <Separator />

                {/* Bien — relational */}
                <div className="space-y-2">
                  <Label>Bien (lier à un existant)</Label>
                  <Select value={correctionForm.property_id} onValueChange={v => {
                    if (v === "__go-properties") {
                      navigate("/properties");
                      return;
                    }
                    const p = properties.find(p => p.id === v);
                    if (p) {
                      setCorrectionForm(prev => ({ ...prev, property_id: v, adresse: p.address + (p.city ? `, ${p.city}` : ""), lot: p.unit_number ?? prev.lot }));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un bien…" /></SelectTrigger>
                    <SelectContent>
                      {properties.length === 0 && <SelectItem value="__go-properties">Aucun bien - Ouvrir la page Biens</SelectItem>}
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.address}{p.unit_number ? ` · ${p.unit_number}` : ""}{p.city ? ` — ${p.city}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Adresse</Label><Input value={correctionForm.adresse} onChange={e => setCorrectionForm(p => ({ ...p, adresse: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Lot</Label><Input value={correctionForm.lot} onChange={e => setCorrectionForm(p => ({ ...p, lot: e.target.value }))} /></div>
                </div>

                <Separator />

                {/* Propriétaire — relational */}
                <div className="space-y-2">
                  <Label>Propriétaire (lier à un existant)</Label>
                  <Select value={correctionForm.owner_id} onValueChange={v => {
                    if (v === "__go-owners") {
                      navigate("/owners");
                      return;
                    }
                    const o = owners.find(o => o.id === v);
                    if (o) {
                      setCorrectionForm(prev => ({ ...prev, owner_id: v, proprietaire: `${o.first_name ?? ""} ${o.last_name}`.trim(), telephoneProprio: o.phone ?? prev.telephoneProprio, emailProprio: o.email ?? prev.emailProprio }));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un propriétaire…" /></SelectTrigger>
                    <SelectContent>
                      {owners.length === 0 && <SelectItem value="__go-owners">Aucun propriétaire - Ouvrir la page Propriétaires</SelectItem>}
                      {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={correctionForm.proprietaire} onChange={e => setCorrectionForm(p => ({ ...p, proprietaire: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={correctionForm.telephoneProprio} onChange={e => setCorrectionForm(p => ({ ...p, telephoneProprio: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={correctionForm.emailProprio} onChange={e => setCorrectionForm(p => ({ ...p, emailProprio: e.target.value }))} /></div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="px-5 pb-5 pt-2 border-t">
            <Button variant="outline" onClick={() => setCorrecting(null)}>Annuler</Button>
            <Button onClick={submitCorrection}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Valider et créer le ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingSignalement} onOpenChange={open => { if (!open) setDeletingSignalement(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-destructive" />
              Supprimer ce signalement
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce signalement ? Cette action supprimera définitivement le signalement de la file d'attente et ne créera aucun ticket.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeletingSignalement(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deletingSignalement) return;
                setDismissing(prev => { const next = new Set(prev); next.add(deletingSignalement.id); return next; });
                setTimeout(() => removeSignalement(deletingSignalement.id), 400);
                setDeletingSignalement(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
