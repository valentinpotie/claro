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

export interface Quote {
  id: string;
  artisanId: string;
  artisanNom: string;
  montant: number;
  delai: string;
  description: string;
  selected: boolean;
}

export interface TicketMessage {
  id: string;
  from: "agence" | "artisan";
  content: string;
  timestamp: string;
}

export interface AIJournalEntry {
  id: string;
  ticketId: string;
  timestamp: string;
  message: string;
  type: "analysis" | "message_sent" | "notification" | "action" | "validation" | "matching";
  status: "pending" | "in_progress" | "done";
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
  photos: string[];
  notes: string[];
  validationStatus?: "en_attente" | "approuve" | "refuse";
  mailSource?: { from: string; to: string; subject: string; body: string; receivedAt: string };
  // Syndic workflow
  syndic?: { nom: string; email: string; telephone: string };
  syndicRelances?: { date: string; numero: number }[];
  syndicEscalade?: boolean;
}

export interface Artisan {
  id: string;
  nom: string;
  specialite: string;
  ville: string;
  note: number;
  interventions: number;
  delaiMoyen: string;
  telephone: string;
  email: string;
}

export const SEUIL_DELEGATION = 500;

// Mirrors Supabase table "agency_settings"
export interface AgencySettings {
  id: string;
  agency_id: string;
  delegation_threshold: number;
  always_ask_owner: boolean;
  escalation_delay_days: number;
  escalation_reminders_count: number;
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
  urgente: "bg-destructive/15 text-destructive",
  haute: "bg-warning/15 text-warning",
  normale: "bg-primary/10 text-primary",
  basse: "bg-muted text-muted-foreground",
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
  { key: "validation_proprio", label: "Accord proprio." },
  { key: "intervention", label: "Intervention" },
  { key: "confirmation_passage", label: "Confirmation" },
  { key: "facturation", label: "Facturation" },
  { key: "cloture", label: "Clôture" },
];
