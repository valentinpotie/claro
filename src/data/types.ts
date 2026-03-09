export type TicketStatus =
  | "signale"
  | "qualifie"
  | "recherche_artisan"
  | "validation_proprio"
  | "planifie"
  | "intervention"
  | "facturation"
  | "cloture";

export type TicketPriority = "urgente" | "haute" | "normale" | "basse";
export type TicketCategory = "plomberie" | "electricite" | "serrurerie" | "chauffage" | "toiture" | "humidite" | "nuisibles" | "autre";
export type Responsabilite = "locataire" | "proprietaire" | "partagee";

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
  disponibilitesArtisan: TimeSlot[];
  disponibilitesLocataire: TimeSlot[];
  rdv?: { date: string; heure: string };
  interventionStatus?: "planifie" | "en_cours" | "termine";
  interventionValidee?: boolean;
  facture?: { montant: number; payee: boolean; refFacture?: string; dateFacture?: string; prestation?: string };
  factureValidee?: boolean;
  artisanId?: string;
  photos: string[];
  notes: string[];
  validationStatus?: "en_attente" | "approuve" | "refuse";
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

export const statusLabels: Record<TicketStatus, string> = {
  signale: "Signalé",
  qualifie: "Qualifié",
  recherche_artisan: "Recherche artisan",
  validation_proprio: "Validation propriétaire",
  planifie: "Planifié",
  intervention: "Intervention en cours",
  facturation: "Facturation",
  cloture: "Clôturé",
};

export const statusColors: Record<TicketStatus, string> = {
  signale: "bg-warning/15 text-warning",
  qualifie: "bg-primary/10 text-primary",
  recherche_artisan: "bg-accent/15 text-accent-foreground",
  validation_proprio: "bg-warning/15 text-warning",
  planifie: "bg-primary/10 text-primary",
  intervention: "bg-accent/15 text-accent-foreground",
  facturation: "bg-muted text-muted-foreground",
  cloture: "bg-success/15 text-success",
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
  locataire: "Locataire", proprietaire: "Propriétaire", partagee: "Partagée",
};

export const workflowSteps: { key: TicketStatus; label: string }[] = [
  { key: "signale", label: "Signalement" },
  { key: "qualifie", label: "Qualification" },
  { key: "recherche_artisan", label: "Artisans" },
  { key: "validation_proprio", label: "Validation" },
  { key: "planifie", label: "Planification" },
  { key: "intervention", label: "Intervention" },
  { key: "facturation", label: "Facturation" },
  { key: "cloture", label: "Clôture" },
];
