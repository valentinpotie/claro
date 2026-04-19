export type TicketStatus =
  | "signale"
  | "qualifie"
  | "contact_artisan"
  | "reception_devis"
  | "validation_proprio"
  | "intervention"
  | "confirmation_passage"
  | "facturation"
  | "cloture"
  // Syndic workflow
  | "contact_syndic"
  | "relance_syndic"
  | "escalade_syndic"
  | "resolution_syndic";

export type TicketPriority = "urgente" | "haute" | "normale" | "basse";
export type TicketCategory = "plomberie" | "electricite" | "serrurerie" | "chauffage" | "toiture" | "humidite" | "nuisibles" | "autre";
export type Responsabilite = "locataire" | "proprietaire" | "partagee" | "syndic";

export interface TimeSlot {
  date: string;
  heure: string;
}

export interface Quote {
  id: string;
  artisanId: string;
  artisanNom: string;
  montant: number;
  delai: string;
  description: string;
  selected: boolean;
}

export type TicketMessageClassification = {
  category: "acceptance" | "refusal" | "quote_sent" | "invoice_sent" | "proof_sent"
    | "approval" | "owner_refusal" | "question" | "info" | "unknown";
  confidence: "high" | "medium" | "low";
  summary?: string;
  clean_reply?: string;
  extracted?: Record<string, unknown>;
};

export interface TicketMessage {
  id: string;
  from: "agence" | "artisan" | "proprietaire" | "locataire" | "syndic" | "assurance";
  content: string;
  subject?: string;
  template_id?: string;
  timestamp: string;
  /** "outbound" (sent by agency) vs "inbound" (received from artisan/tenant/owner/syndic) */
  direction?: "outbound" | "inbound";
  /** AI classification result (filled by classify-reply for inbound messages). */
  ai_classification?: TicketMessageClassification;
  /** IDs des ticket_documents attachés à ce message (OUTBOUND). Pour les INBOUND
   *  le lien se fait côté doc via ticket_documents.ticket_message_id. */
  attachment_document_ids?: string[];
}

export interface AIJournalEntry {
  id: string;
  ticketId: string;
  timestamp: string;
  message: string;
  type: "analysis" | "message_sent" | "notification" | "action" | "validation" | "matching" | "escalation" | "reminder" | "status_change";
  status: "pending" | "in_progress" | "done" | "failed";
}

export type TicketDocumentType = "devis" | "facture" | "photo" | "autre";

export interface TicketDocument {
  id: string;
  ticket_id: string;
  document_type: TicketDocumentType;
  file_name: string;
  file_url: string;
  storage_path: string;
  mime_type?: string;
  file_size?: number;
  uploaded_by?: string;
  uploaded_at: string;
  description?: string;
  /** When set, this document is attached to a specific quote. Used by the UI to show
   *  only the PDFs of the currently-selected quote instead of all devis on the ticket. */
  quote_id?: string;
  /** When set, this document arrived via the email that produced this ticket_messages row.
   *  Used by the Discussions view to render attachments inline inside the message bubble. */
  ticket_message_id?: string;
}

export interface Ticket {
  id: string;
  reference: string;
  titre: string;
  description: string;
  status: TicketStatus;
  priorite: TicketPriority;
  categorie: TicketCategory;
  dateCreation: string;
  dateMaj: string;
  /** Last time the agency or a stakeholder acted on this ticket. Feeds the "Dernière action"
   *  chip and will drive the Phase 2 auto-reminder cron. Reset on any outbound/inbound
   *  message or manual patch. */
  lastActionAt?: string;
  urgence: boolean;
  locataire: { nom: string; telephone: string; email: string };
  bien: { adresse: string; lot: string; proprietaire: string; telephoneProprio: string; emailProprio: string };
  responsabilite?: Responsabilite;
  quotes: Quote[];
  selectedQuoteId?: string;
  messages: Record<string, TicketMessage[]>;
  dateInterventionPrevue?: string;
  passageConfirme?: boolean;
  facture?: { montant: number; payee: boolean; refFacture?: string; dateFacture?: string; prestation?: string };
  factureValidee?: boolean;
  artisanId?: string;
  tenant_id?: string;
  property_id?: string;
  owner_id?: string;
  /** FK vers leases — résolu à la création depuis le tenant, puis stable. NULL si aucun
   *  bail actif n'a pu être trouvé pour ce tenant (ticket de démo, locataire non lié, etc.). */
  lease_id?: string | null;
  /** Snapshot texte de la référence externe du bail (ex. "BAIL000363"). Reste même si
   *  le bail est supprimé — trace historique permanente. */
  lease_ref?: string | null;
  /** Phase 2 — compteurs de relances par destinataire. Incrémentés par le edge function
   *  send-reminders (ou par l'action manuelle relanceStakeholder). */
  reminders_sent_artisan?: number;
  reminders_sent_owner?: number;
  reminders_sent_tenant?: number;
  /** Quand set, aucune relance n'est envoyée avant cette date (snooze 48h ou autre). */
  reminder_paused_until?: string | null;
  /** Passe à true quand le compteur atteint escalation_reminders_count : gestionnaire
   *  doit prendre la main (changer d'artisan, appeler le proprio, etc.). */
  requires_manual_action?: boolean;
  photos: string[];
  notes: string[];
  documents: TicketDocument[];
  disponibilitesArtisan: TimeSlot[];
  disponibilitesLocataire: TimeSlot[];
  validationStatus?: "en_attente" | "approuve" | "refuse";
  source?: "email" | "manual" | "phone" | "other";
  inbound_email_id?: string;
  mailSource?: { from: string; to: string; subject: string; body: string; receivedAt: string; attachments?: SignalementAttachment[] | null };
  created_at?: string; // Added optional created_at field
  // Syndic workflow
  syndic?: { nom: string; email: string; telephone: string };
  syndicRelances?: { date: string; numero: number }[];
  syndicEscalade?: boolean;
}

export interface Artisan {
  id: string;
  nom: string;
  specialites: string[];
  ville: string;
  address?: string;
  note: number;
  interventions: number;
  delaiMoyen: string;
  telephone: string;
  email: string;
}

export interface Property {
  id: string;
  agency_id?: string;
  address: string;
  city?: string;
  postal_code?: string;
  unit_number?: string;
  floor?: string;
  building_name?: string;
  door_code?: string;
  external_ref?: string;
  syndic_id?: string;
  /** FK vers owners — 1 propriétaire par bien. Les indivisions sont gérées via
   *  owners.legal_type='indivision' (un seul enregistrement owner avec company_name
   *  type "Indivision MARTIN"). Nullable : un bien peut ne pas avoir de proprio assigné. */
  owner_id?: string | null;
  /** Populated côté leases via nested select property:properties(*, owner:owners(*)). */
  owner?: Owner | null;
  created_at?: string;
  updated_at?: string;
}

export type LeaseType = "residential" | "commercial" | "parking" | "other";

export const leaseTypeLabels: Record<LeaseType, string> = {
  residential: "Habitation",
  commercial: "Commercial",
  parking: "Parking",
  other: "Autre",
};

export interface Lease {
  id: string;
  agency_id: string;
  property_id: string;
  external_ref?: string | null;
  lease_type: LeaseType;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  rent_amount?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Populated by fetchLeases via nested select. Not persisted on the row itself.
  tenants?: LeaseTenant[];
  property?: Property;
}

export interface LeaseTenant {
  lease_id: string;
  tenant_id: string;
  is_primary: boolean;
  exited_at?: string | null;
  tenant?: Tenant;
}

/** Returns true only if the lease flag is_active AND the end_date hasn't passed yet
 *  (or is not set). Matches the product rule: active = both conditions combined. */
export function isLeaseCurrentlyActive(lease: Pick<Lease, "is_active" | "end_date">): boolean {
  if (!lease.is_active) return false;
  if (!lease.end_date) return true;
  return new Date(lease.end_date) >= new Date();
}

export interface Tenant {
  id: string;
  agency_id?: string;
  property_id?: string;
  first_name?: string;
  last_name: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
  is_active?: boolean;
  external_ref?: string;
  created_at?: string;
  updated_at?: string;
}

export type OwnerLegalType = "person" | "sci" | "sarl" | "indivision" | "other";
export type OwnerCivility = "M." | "Mme" | "Mlle";

export interface Owner {
  id: string;
  agency_id?: string;
  legal_type?: OwnerLegalType;
  civility?: OwnerCivility | null;
  company_name?: string | null;
  first_name?: string;
  last_name?: string | null;
  /** Computed server-side (GENERATED ALWAYS). Safe to use for every UI rendering.
   *  Never set from client code — the DB rewrites it from company_name or the name trio. */
  display_name?: string;
  email?: string;
  phone?: string;
  validation_threshold?: number;
  prefers_phone?: boolean;
  external_ref?: string;
  created_at?: string;
  updated_at?: string;
}

export const ownerLegalTypeLabels: Record<OwnerLegalType, string> = {
  person: "Personne physique",
  sci: "SCI",
  sarl: "SARL",
  indivision: "Indivision",
  other: "Autre",
};

export interface SignalementAttachment {
  filename: string;
  content_type: string | null;
  size: number | null;
  storage_path: string;
}

/** Pending inbound email waiting for gestionnaire validation */
export interface InboundSignalement {
  id: string;
  agency_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html?: string | null;
  received_at: string;
  status: "processing" | "processed" | "failed";
  validation_status: "pending" | "validated" | "rejected" | "modified";
  ticket_id: string | null;
  attachments?: SignalementAttachment[] | null;
  ai_suggestion: {
    title?: string;
    category?: string;
    priority?: TicketPriority;
    responsibility?: string;
    ai_required_action?: string;
    ai_summary?: string;
    ai_qualified_description?: string;
    tenant_name?: string;
    tenant_phone?: string;
    property_address?: string;
    property_unit?: string;
    owner_name?: string;
    owner_phone?: string;
    owner_email?: string;
    is_urgent?: boolean;
  } | null;
}

export const SEUIL_DELEGATION = 500;

// Mirrors Supabase table "agency_settings"
export interface EmailTemplate {
  id: string;
  name: string;
  target: "artisan" | "locataire" | "proprietaire" | "syndic";
  useCase: string;
  subject: string;
  body: string;
}

export interface AgencySettings {
  id: string;
  agency_id: string;
  agency_name: string;
  email_inbound: string;
  delegation_threshold: number;
  always_ask_owner: boolean;
  escalation_delay_owner_days: number;
  escalation_delay_artisan_days: number;
  escalation_delay_tenant_days: number;
  escalation_reminders_count: number;
  /** Phase 2 — relances : si true, Claro envoie automatiquement les mails de relance
   *  quand le délai est dépassé. Si false (défaut), le gestionnaire voit la liste des
   *  relances dues dans le dashboard et les déclenche manuellement. */
  auto_reminders_enabled: boolean;
  /** Mode test : si > 0, send-reminders considère un ticket stale après ce nombre de
   *  secondes au lieu des jours normaux. NULL = désactivé (comportement par défaut). */
  test_reminders_override_seconds?: number | null;
  onboarding_completed: boolean;
  enabled_priorities: TicketPriority[];
  tour_completed: boolean;
  accountant_email: string;
  email_templates: EmailTemplate[];
  /** true = actions fakées côté client (simulateAI). false = appels réels aux edge functions. */
  demo_mode: boolean;
}

export const statusLabels: Record<TicketStatus, string> = {
  signale: "Signalé",
  qualifie: "Diagnostiqué",
  contact_artisan: "Contact artisan",
  reception_devis: "Devis reçu",
  validation_proprio: "Accord propriétaire",
  intervention: "Intervention",
  confirmation_passage: "Confirmation passage",
  facturation: "Facturation",
  cloture: "Clôturé",
  contact_syndic: "Contact syndic",
  relance_syndic: "Relance syndic",
  escalade_syndic: "Escalade syndic",
  resolution_syndic: "Résolution syndic",
};

export const statusColors: Record<TicketStatus, string> = {
  signale: "bg-warning/15 text-warning",
  qualifie: "bg-primary/10 text-primary",
  contact_artisan: "bg-accent/15 text-accent-foreground",
  reception_devis: "bg-primary/10 text-primary",
  validation_proprio: "bg-warning/15 text-warning",
  intervention: "bg-accent/15 text-accent-foreground",
  confirmation_passage: "bg-primary/10 text-primary",
  facturation: "bg-muted text-muted-foreground",
  cloture: "bg-success/15 text-success",
  contact_syndic: "bg-orange-100 text-orange-700",
  relance_syndic: "bg-orange-100 text-orange-700",
  escalade_syndic: "bg-red-100 text-red-700",
  resolution_syndic: "bg-success/15 text-success",
};

export const priorityLabels: Record<TicketPriority, string> = {
  urgente: "Urgente", haute: "Haute", normale: "Normale", basse: "Basse",
};

export const priorityColors: Record<TicketPriority, string> = {
  urgente: "bg-destructive/25 text-destructive",
  haute: "bg-destructive/15 text-destructive",
  normale: "bg-warning/20 text-amber-800 dark:text-amber-300",
  basse: "bg-cyan-100/60 text-cyan-700",
};

export const categoryLabels: Record<TicketCategory, string> = {
  plomberie: "Plomberie", electricite: "Électricité", serrurerie: "Serrurerie",
  chauffage: "Chauffage", toiture: "Toiture", humidite: "Humidité",
  nuisibles: "Nuisibles", autre: "Autre",
};

export const responsabiliteLabels: Record<Responsabilite, string> = {
  locataire: "Locataire", proprietaire: "Propriétaire", partagee: "Partagée", syndic: "Syndic",
};

export const syndicWorkflowSteps: { key: TicketStatus; label: string }[] = [
  { key: "signale", label: "Signalement" },
  { key: "qualifie", label: "Diagnostic" },
  { key: "contact_syndic", label: "Contact syndic" },
  { key: "relance_syndic", label: "Relance syndic" },
  { key: "escalade_syndic", label: "Escalade" },
  { key: "resolution_syndic", label: "Résolution" },
  { key: "cloture", label: "Clôture" },
];

export const workflowSteps: { key: TicketStatus; label: string }[] = [
  { key: "signale", label: "Signalement" },
  { key: "qualifie", label: "Diagnostic" },
  { key: "contact_artisan", label: "Contact artisan" },
  { key: "reception_devis", label: "Devis" },
  { key: "validation_proprio", label: "Accord propriétaire" },
  { key: "intervention", label: "Intervention" },
  { key: "confirmation_passage", label: "Confirmation" },
  { key: "facturation", label: "Facturation" },
  { key: "cloture", label: "Clôture" },
];
