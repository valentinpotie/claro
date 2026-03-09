export type TicketStatus = 
  | "signale" 
  | "qualifie" 
  | "recherche_artisan" 
  | "validation_proprio" 
  | "planifie" 
  | "intervention" 
  | "facturation" 
  | "cloture" 
  | "assurance";

export type TicketPriority = "urgente" | "haute" | "normale" | "basse";
export type TicketCategory = "plomberie" | "electricite" | "serrurerie" | "chauffage" | "toiture" | "humidite" | "nuisibles" | "autre";

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
  locataire: {
    nom: string;
    telephone: string;
    email: string;
  };
  bien: {
    adresse: string;
    lot: string;
    proprietaire: string;
    telephoneProprio: string;
  };
  artisan?: {
    nom: string;
    telephone: string;
    specialite: string;
    devis?: number;
  };
  intervention?: {
    datePrevisionnelle: string;
    dateFin?: string;
    commentaire?: string;
  };
  facture?: {
    montant: number;
    payee: boolean;
    refFacture?: string;
  };
  assurance?: {
    declaree: boolean;
    refSinistre?: string;
    franchise?: number;
  };
  photos?: string[];
  notes: string[];
}

export const statusLabels: Record<TicketStatus, string> = {
  signale: "Signalé",
  qualifie: "Qualifié",
  recherche_artisan: "Recherche artisan",
  validation_proprio: "Validation propriétaire",
  planifie: "Planifié",
  intervention: "Intervention en cours",
  facturation: "Facturation",
  cloture: "Clôturé",
  assurance: "Déclaration assurance",
};

export const statusColors: Record<TicketStatus, string> = {
  signale: "bg-warning/15 text-warning",
  qualifie: "bg-primary/10 text-primary",
  recherche_artisan: "bg-accent/15 text-accent",
  validation_proprio: "bg-warning/15 text-warning",
  planifie: "bg-primary/10 text-primary",
  intervention: "bg-accent/15 text-accent",
  facturation: "bg-muted text-muted-foreground",
  cloture: "bg-success/15 text-success",
  assurance: "bg-destructive/10 text-destructive",
};

export const priorityLabels: Record<TicketPriority, string> = {
  urgente: "Urgente",
  haute: "Haute",
  normale: "Normale",
  basse: "Basse",
};

export const priorityColors: Record<TicketPriority, string> = {
  urgente: "bg-destructive/15 text-destructive",
  haute: "bg-warning/15 text-warning",
  normale: "bg-primary/10 text-primary",
  basse: "bg-muted text-muted-foreground",
};

export const categoryLabels: Record<TicketCategory, string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
  serrurerie: "Serrurerie",
  chauffage: "Chauffage",
  toiture: "Toiture",
  humidite: "Humidité",
  nuisibles: "Nuisibles",
  autre: "Autre",
};

export const workflowSteps: { key: TicketStatus; label: string }[] = [
  { key: "signale", label: "Signalement" },
  { key: "qualifie", label: "Qualification" },
  { key: "recherche_artisan", label: "Artisan" },
  { key: "validation_proprio", label: "Validation" },
  { key: "planifie", label: "Planification" },
  { key: "intervention", label: "Intervention" },
  { key: "facturation", label: "Facturation" },
  { key: "cloture", label: "Clôture" },
];

export const mockTickets: Ticket[] = [
  {
    id: "1",
    reference: "SIN-2026-0142",
    titre: "Fuite sous évier cuisine",
    description: "Le locataire signale une fuite d'eau persistante sous l'évier de la cuisine. L'eau s'accumule dans le meuble bas et commence à endommager le parquet.",
    status: "recherche_artisan",
    priorite: "haute",
    categorie: "plomberie",
    dateCreation: "2026-03-05",
    dateMaj: "2026-03-08",
    locataire: { nom: "Marie Dupont", telephone: "06 12 34 56 78", email: "m.dupont@email.fr" },
    bien: { adresse: "12 rue des Lilas, 75011 Paris", lot: "Apt 3B", proprietaire: "Jean-Pierre Martin", telephoneProprio: "06 98 76 54 32" },
    notes: ["Locataire a mis une bassine en attendant", "Photos reçues - dégât des eaux possible"],
  },
  {
    id: "2",
    reference: "SIN-2026-0141",
    titre: "Panne chaudière - plus d'eau chaude",
    description: "La chaudière ne produit plus d'eau chaude depuis 2 jours. Le chauffage fonctionne normalement.",
    status: "planifie",
    priorite: "urgente",
    categorie: "chauffage",
    dateCreation: "2026-03-04",
    dateMaj: "2026-03-07",
    locataire: { nom: "Ahmed Benali", telephone: "06 45 67 89 01", email: "a.benali@email.fr" },
    bien: { adresse: "8 avenue Foch, 69006 Lyon", lot: "Apt 5A", proprietaire: "Sophie Girard", telephoneProprio: "06 11 22 33 44" },
    artisan: { nom: "Thermo Services Lyon", telephone: "04 78 12 34 56", specialite: "Chauffage", devis: 350 },
    intervention: { datePrevisionnelle: "2026-03-10" },
    notes: ["Chaudière Saunier Duval, modèle 2019", "Artisan confirmé pour lundi"],
  },
  {
    id: "3",
    reference: "SIN-2026-0140",
    titre: "Serrure porte d'entrée bloquée",
    description: "Le locataire ne peut plus fermer sa porte d'entrée à clé. La serrure tourne dans le vide.",
    status: "validation_proprio",
    priorite: "haute",
    categorie: "serrurerie",
    dateCreation: "2026-03-03",
    dateMaj: "2026-03-06",
    locataire: { nom: "Claire Moreau", telephone: "06 78 90 12 34", email: "c.moreau@email.fr" },
    bien: { adresse: "45 boulevard Haussmann, 75008 Paris", lot: "Apt 2C", proprietaire: "Groupe Immo Invest", telephoneProprio: "01 42 56 78 90" },
    artisan: { nom: "Allo Serrurier 8ème", telephone: "01 43 12 34 56", specialite: "Serrurerie", devis: 280 },
    notes: ["Devis envoyé au propriétaire pour validation", "Locataire souhaite intervention rapide"],
  },
  {
    id: "4",
    reference: "SIN-2026-0139",
    titre: "Infiltration d'eau plafond chambre",
    description: "Tache d'humidité au plafond de la chambre qui s'agrandit. Possiblement lié à la toiture.",
    status: "assurance",
    priorite: "haute",
    categorie: "humidite",
    dateCreation: "2026-03-01",
    dateMaj: "2026-03-08",
    locataire: { nom: "Thomas Laurent", telephone: "06 23 45 67 89", email: "t.laurent@email.fr" },
    bien: { adresse: "3 rue du Château, 33000 Bordeaux", lot: "Apt 4D", proprietaire: "Marie-Hélène Fabre", telephoneProprio: "05 56 12 34 56" },
    artisan: { nom: "Étanchéité 33", telephone: "05 56 78 90 12", specialite: "Toiture/Étanchéité", devis: 1800 },
    assurance: { declaree: true, refSinistre: "ASS-2026-0034", franchise: 250 },
    notes: ["Expertise assurance prévue le 12/03", "Dégât des eaux confirmé - toiture défaillante"],
  },
  {
    id: "5",
    reference: "SIN-2026-0138",
    titre: "Prise électrique ne fonctionne plus",
    description: "Deux prises dans le salon ne fonctionnent plus depuis une coupure de courant.",
    status: "cloture",
    priorite: "normale",
    categorie: "electricite",
    dateCreation: "2026-02-25",
    dateMaj: "2026-03-04",
    locataire: { nom: "Julie Petit", telephone: "06 34 56 78 90", email: "j.petit@email.fr" },
    bien: { adresse: "17 rue de la Paix, 13001 Marseille", lot: "Apt 1A", proprietaire: "Paul Roche", telephoneProprio: "06 55 66 77 88" },
    artisan: { nom: "Elec Pro Marseille", telephone: "04 91 23 45 67", specialite: "Électricité", devis: 120 },
    intervention: { datePrevisionnelle: "2026-03-02", dateFin: "2026-03-02", commentaire: "Disjoncteur différentiel remplacé" },
    facture: { montant: 120, payee: true, refFacture: "FAC-2026-0089" },
    notes: ["Intervention réalisée avec succès", "Facture acquittée par le propriétaire"],
  },
  {
    id: "6",
    reference: "SIN-2026-0137",
    titre: "Volet roulant bloqué",
    description: "Le volet roulant de la chambre est bloqué en position haute, impossible de le descendre.",
    status: "signale",
    priorite: "basse",
    categorie: "autre",
    dateCreation: "2026-03-08",
    dateMaj: "2026-03-08",
    locataire: { nom: "Lucie Garnier", telephone: "06 56 78 90 12", email: "l.garnier@email.fr" },
    bien: { adresse: "22 rue Victor Hugo, 31000 Toulouse", lot: "Apt 6E", proprietaire: "François Blanc", telephoneProprio: "05 61 12 34 56" },
    notes: [],
  },
  {
    id: "7",
    reference: "SIN-2026-0136",
    titre: "Ballon d'eau chaude en panne",
    description: "Plus d'eau chaude depuis hier soir. Le cumulus fait un bruit anormal.",
    status: "intervention",
    priorite: "urgente",
    categorie: "plomberie",
    dateCreation: "2026-03-06",
    dateMaj: "2026-03-09",
    locataire: { nom: "Nicolas Renard", telephone: "06 67 89 01 23", email: "n.renard@email.fr" },
    bien: { adresse: "5 place Bellecour, 69002 Lyon", lot: "Apt 3F", proprietaire: "Catherine Vidal", telephoneProprio: "06 22 33 44 55" },
    artisan: { nom: "Plomberie Express Lyon", telephone: "04 72 34 56 78", specialite: "Plomberie", devis: 650 },
    intervention: { datePrevisionnelle: "2026-03-09", commentaire: "Artisan sur place, remplacement du cumulus en cours" },
    notes: ["Cumulus Atlantic 200L à remplacer", "Propriétaire validé par téléphone - urgence"],
  },
  {
    id: "8",
    reference: "SIN-2026-0135",
    titre: "Fissure mur porteur salon",
    description: "Fissure visible sur le mur porteur du salon, s'étend sur environ 50cm.",
    status: "qualifie",
    priorite: "haute",
    categorie: "autre",
    dateCreation: "2026-03-07",
    dateMaj: "2026-03-08",
    locataire: { nom: "Emma Leroy", telephone: "06 78 01 23 45", email: "e.leroy@email.fr" },
    bien: { adresse: "14 rue Nationale, 59000 Lille", lot: "Apt 2A", proprietaire: "Pierre Duval", telephoneProprio: "03 20 12 34 56" },
    notes: ["Photos reçues - nécessite expertise", "Qualification: problème structurel potentiel"],
  },
];

export const mockArtisans = [
  { id: "1", nom: "Plomberie Martin & Fils", specialite: "Plomberie", ville: "Paris", note: 4.5, interventions: 23, delaiMoyen: "48h", telephone: "01 42 12 34 56" },
  { id: "2", nom: "Thermo Services Lyon", specialite: "Chauffage", ville: "Lyon", note: 4.8, interventions: 45, delaiMoyen: "24h", telephone: "04 78 12 34 56" },
  { id: "3", nom: "Allo Serrurier 8ème", specialite: "Serrurerie", ville: "Paris", note: 4.2, interventions: 12, delaiMoyen: "4h", telephone: "01 43 12 34 56" },
  { id: "4", nom: "Elec Pro Marseille", specialite: "Électricité", ville: "Marseille", note: 4.6, interventions: 34, delaiMoyen: "72h", telephone: "04 91 23 45 67" },
  { id: "5", nom: "Étanchéité 33", specialite: "Toiture/Étanchéité", ville: "Bordeaux", note: 4.3, interventions: 8, delaiMoyen: "5j", telephone: "05 56 78 90 12" },
  { id: "6", nom: "Plomberie Express Lyon", specialite: "Plomberie", ville: "Lyon", note: 4.7, interventions: 56, delaiMoyen: "12h", telephone: "04 72 34 56 78" },
];

export const dashboardStats = {
  ticketsOuverts: 6,
  ticketsUrgents: 2,
  interventionsEnCours: 1,
  delaiMoyenResolution: "5.2j",
  ticketsCeMois: 8,
  ticketsResolus: 2,
  montantDevisMois: 3320,
  satisfactionLocataires: 4.1,
};
