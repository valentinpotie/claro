import { Ticket, Artisan } from "./types";

export const initialArtisans: Artisan[] = [
  { id: "1", nom: "Plomberie Martin & Fils", specialite: "Plomberie", ville: "Paris", note: 4.5, interventions: 23, delaiMoyen: "48h", telephone: "01 42 12 34 56", email: "contact@martin-plomberie.fr" },
  { id: "2", nom: "Thermo Services Lyon", specialite: "Chauffage", ville: "Lyon", note: 4.8, interventions: 45, delaiMoyen: "24h", telephone: "04 78 12 34 56", email: "rdv@thermoservices.fr" },
  { id: "3", nom: "Allo Serrurier 8ème", specialite: "Serrurerie", ville: "Paris", note: 4.2, interventions: 12, delaiMoyen: "4h", telephone: "01 43 12 34 56", email: "urgence@alloserrurier8.fr" },
  { id: "4", nom: "Elec Pro Marseille", specialite: "Électricité", ville: "Marseille", note: 4.6, interventions: 34, delaiMoyen: "72h", telephone: "04 91 23 45 67", email: "devis@elecpro13.fr" },
  { id: "5", nom: "Étanchéité 33", specialite: "Toiture/Étanchéité", ville: "Bordeaux", note: 4.3, interventions: 8, delaiMoyen: "5j", telephone: "05 56 78 90 12", email: "contact@etancheite33.fr" },
  { id: "6", nom: "Plomberie Express Lyon", specialite: "Plomberie", ville: "Lyon", note: 4.7, interventions: 56, delaiMoyen: "12h", telephone: "04 72 34 56 78", email: "express@plomberielyon.fr" },
];

export const initialTickets: Ticket[] = [];
