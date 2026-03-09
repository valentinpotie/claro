import React, { createContext, useContext, useState, useCallback } from "react";
import { Ticket, Artisan, AIJournalEntry, Quote, TimeSlot, TicketMessage, SEUIL_DELEGATION, Responsabilite, TicketCategory, TicketPriority } from "@/data/types";
import { initialTickets, initialArtisans } from "@/data/mockData";

interface TicketContextType {
  tickets: Ticket[];
  artisans: Artisan[];
  journalEntries: AIJournalEntry[];
  showJournal: boolean;
  activeTicketId: string | null;
  setShowJournal: (v: boolean) => void;
  setActiveTicketId: (v: string | null) => void;
  createTicket: (data: { titre: string; description: string; categorie: TicketCategory; priorite: TicketPriority; urgence: boolean; locataireNom: string; locataireTel: string; locataireEmail: string; adresse: string; lot: string; proprietaire: string; telephoneProprio: string; emailProprio: string }) => Ticket;
  updateTicket: (id: string, data: Partial<Ticket>) => void;
  qualifyTicket: (id: string) => void;
  sendArtisanContact: (ticketId: string, artisanId: string) => void;
  addQuote: (ticketId: string, artisanId: string, montant: number, delai: string, description: string) => void;
  selectQuoteAndAdvance: (ticketId: string, quoteId: string) => void;
  validateQuote: (ticketId: string) => void;
  ownerRespond: (ticketId: string, approved: boolean) => void;
  setDisponibilites: (ticketId: string, role: "artisan" | "locataire", slots: TimeSlot[]) => void;
  matchAndConfirm: (ticketId: string) => void;
  startIntervention: (ticketId: string) => void;
  completeIntervention: (ticketId: string) => void;
  validateIntervention: (ticketId: string) => void;
  validateFacture: (ticketId: string) => void;
  closeTicket: (ticketId: string) => void;
  addMessage: (ticketId: string, artisanId: string, content: string, from: "agence" | "artisan") => void;
  getTicket: (id: string) => Ticket | undefined;
  getArtisan: (id: string) => Artisan | undefined;
}

const TicketContext = createContext<TicketContextType | null>(null);

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be inside TicketProvider");
  return ctx;
}

let ticketCounter = 9;

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [artisans] = useState<Artisan[]>(initialArtisans);
  const [journalEntries, setJournalEntries] = useState<AIJournalEntry[]>([]);
  const [showJournal, setShowJournal] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const simulateAI = useCallback((ticketId: string, actions: { msg: string; type: AIJournalEntry["type"] }[], onComplete?: () => void) => {
    setActiveTicketId(ticketId);
    setShowJournal(true);
    const ids: string[] = [];
    actions.forEach((action, i) => {
      const entryId = `${Date.now()}-${ticketId}-${i}`;
      ids.push(entryId);
      setTimeout(() => {
        setJournalEntries(prev => [...prev, {
          id: entryId, ticketId, timestamp: new Date().toISOString(),
          message: action.msg, type: action.type, status: "in_progress",
        }]);
        setTimeout(() => {
          setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "done" } : e));
          if (i === actions.length - 1 && onComplete) setTimeout(onComplete, 400);
        }, 800);
      }, i * 1200);
    });
  }, []);

  const update = useCallback((id: string, data: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data, dateMaj: new Date().toISOString().slice(0, 10) } : t));
  }, []);

  const createTicket = useCallback((data: any) => {
    const id = String(ticketCounter++);
    const ticket: Ticket = {
      id, reference: `SIN-2026-${String(ticketCounter).padStart(4, "0")}`,
      titre: data.titre, description: data.description,
      status: "signale", priorite: data.priorite, categorie: data.categorie,
      dateCreation: new Date().toISOString().slice(0, 10),
      dateMaj: new Date().toISOString().slice(0, 10),
      urgence: data.urgence,
      locataire: { nom: data.locataireNom, telephone: data.locataireTel, email: data.locataireEmail },
      bien: { adresse: data.adresse, lot: data.lot, proprietaire: data.proprietaire, telephoneProprio: data.telephoneProprio, emailProprio: data.emailProprio },
      quotes: [], messages: {}, disponibilitesArtisan: [], disponibilitesLocataire: [],
      photos: [], notes: [],
    };
    setTickets(prev => [ticket, ...prev]);
    simulateAI(id, [
      { msg: "Nouveau ticket créé : " + data.titre, type: "action" },
      { msg: "Notification envoyée au gestionnaire", type: "notification" },
    ]);
    return ticket;
  }, [simulateAI]);

  const qualifyTicket = useCallback((id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const responsabilites: Responsabilite[] = ["proprietaire", "locataire", "partagee"];
    const resp = ticket.categorie === "autre" ? "partagee" : (["plomberie", "electricite", "chauffage", "toiture", "humidite"].includes(ticket.categorie) ? "proprietaire" : "locataire");
    simulateAI(id, [
      { msg: "Analyse du signalement en cours…", type: "analysis" },
      { msg: `Description analysée : "${ticket.description.slice(0, 60)}…"`, type: "analysis" },
      { msg: `Catégorie détectée : ${ticket.categorie}`, type: "analysis" },
      { msg: `Analyse de responsabilité : ${resp === "proprietaire" ? "Propriétaire" : resp === "locataire" ? "Locataire" : "Partagée"}`, type: "analysis" },
      { msg: "Ticket qualifié → Orientation : Réparation/Entretien", type: "action" },
      { msg: "Passage à l'étape Recherche artisan", type: "action" },
    ], () => {
      update(id, { status: "recherche_artisan", responsabilite: resp as Responsabilite });
    });
  }, [tickets, simulateAI, update]);

  const sendArtisanContact = useCallback((ticketId: string, artisanId: string) => {
    const artisan = artisans.find(a => a.id === artisanId);
    const ticket = tickets.find(t => t.id === ticketId);
    if (!artisan || !ticket) return;
    const msg: TicketMessage = {
      id: `msg-${Date.now()}`, from: "agence",
      content: `Bonjour ${artisan.nom}, nous avons un problème de ${ticket.categorie} au ${ticket.bien.adresse}. Pouvez-vous nous faire parvenir un devis ? Merci.`,
      timestamp: new Date().toISOString(),
    };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t, messages: { ...t.messages, [artisanId]: [...(t.messages[artisanId] || []), msg] }
    } : t));
    simulateAI(ticketId, [
      { msg: `Email envoyé à ${artisan.nom} (${artisan.email})`, type: "message_sent" },
      { msg: `Demande de devis pour : ${ticket.titre}`, type: "message_sent" },
    ]);
  }, [artisans, tickets, simulateAI]);

  const addQuote = useCallback((ticketId: string, artisanId: string, montant: number, delai: string, description: string) => {
    const artisan = artisans.find(a => a.id === artisanId);
    if (!artisan) return;
    const quote: Quote = { id: `q-${Date.now()}`, artisanId, artisanNom: artisan.nom, montant, delai, description, selected: false };
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, quotes: [...t.quotes, quote] } : t));
    simulateAI(ticketId, [
      { msg: `Devis reçu de ${artisan.nom} : ${montant} €`, type: "notification" },
    ]);
  }, [artisans, simulateAI]);

  const selectQuoteAndAdvance = useCallback((ticketId: string, quoteId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const quote = ticket?.quotes.find(q => q.id === quoteId);
    if (!ticket || !quote) return;
    simulateAI(ticketId, [
      { msg: `Devis sélectionné : ${quote.artisanNom} — ${quote.montant} €`, type: "action" },
      { msg: "Passage à l'étape Validation", type: "action" },
    ], () => {
      update(ticketId, {
        status: "validation_proprio",
        selectedQuoteId: quoteId,
        artisanId: quote.artisanId,
        quotes: ticket.quotes.map(q => ({ ...q, selected: q.id === quoteId })),
        validationStatus: "en_attente",
      });
    });
  }, [tickets, simulateAI, update]);

  const validateQuote = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const quote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
    if (!quote) return;
    if (quote.montant <= SEUIL_DELEGATION) {
      simulateAI(ticketId, [
        { msg: `Montant du devis : ${quote.montant} € — dans le seuil de délégation (${SEUIL_DELEGATION} €)`, type: "validation" },
        { msg: "Validation directe par l'agence — propriétaire non sollicité", type: "validation" },
        { msg: `Confirmation envoyée à ${quote.artisanNom}`, type: "message_sent" },
        { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
        { msg: "Passage à l'étape Planification", type: "action" },
      ], () => {
        update(ticketId, { status: "planifie", validationStatus: "approuve" });
      });
    } else {
      simulateAI(ticketId, [
        { msg: `Montant du devis : ${quote.montant} € — au-dessus du seuil (${SEUIL_DELEGATION} €)`, type: "validation" },
        { msg: `Demande de validation envoyée à ${ticket.bien.proprietaire} (${ticket.bien.emailProprio})`, type: "message_sent" },
        { msg: "En attente de la réponse du propriétaire…", type: "notification" },
      ]);
    }
  }, [tickets, simulateAI, update]);

  const ownerRespond = useCallback((ticketId: string, approved: boolean) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    if (approved) {
      simulateAI(ticketId, [
        { msg: `✅ ${ticket.bien.proprietaire} a approuvé le devis`, type: "validation" },
        { msg: `Message envoyé à ${artisan?.nom} : "Votre intervention a été validée pour le logement de ${ticket.locataire.nom}. Merci d'indiquer vos disponibilités."`, type: "message_sent" },
        { msg: `Message envoyé à ${ticket.locataire.nom} : "Une intervention est prévue chez vous. Merci d'indiquer vos créneaux disponibles."`, type: "message_sent" },
        { msg: "Passage à l'étape Planification", type: "action" },
      ], () => {
        update(ticketId, { status: "planifie", validationStatus: "approuve" });
      });
    } else {
      simulateAI(ticketId, [
        { msg: `❌ ${ticket.bien.proprietaire} a refusé le devis`, type: "validation" },
        { msg: "Ticket en attente — possibilité de soumettre un nouveau devis", type: "notification" },
      ], () => {
        update(ticketId, { validationStatus: "refuse", status: "recherche_artisan", selectedQuoteId: undefined, artisanId: undefined });
      });
    }
  }, [tickets, artisans, simulateAI, update]);

  const setDisponibilites = useCallback((ticketId: string, role: "artisan" | "locataire", slots: TimeSlot[]) => {
    const field = role === "artisan" ? "disponibilitesArtisan" : "disponibilitesLocataire";
    update(ticketId, { [field]: slots });
    simulateAI(ticketId, [
      { msg: `Disponibilités ${role === "artisan" ? "de l'artisan" : "du locataire"} enregistrées (${slots.length} créneaux)`, type: "notification" },
    ]);
  }, [update, simulateAI]);

  const matchAndConfirm = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    // Find first common slot
    const match = ticket.disponibilitesArtisan.find(a =>
      ticket.disponibilitesLocataire.some(l => l.date === a.date && l.heure === a.heure)
    );
    if (match) {
      simulateAI(ticketId, [
        { msg: "Analyse des disponibilités en cours…", type: "matching" },
        { msg: `Créneau commun identifié : ${match.date} à ${match.heure}`, type: "matching" },
        { msg: `Confirmation envoyée à ${artisan?.nom}`, type: "message_sent" },
        { msg: `Confirmation envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
        { msg: "Rendez-vous confirmé — Passage à l'étape Intervention", type: "action" },
      ], () => {
        update(ticketId, { status: "intervention", rdv: match, interventionStatus: "planifie" });
      });
    } else {
      simulateAI(ticketId, [
        { msg: "Analyse des disponibilités en cours…", type: "matching" },
        { msg: "❌ Aucun créneau commun trouvé", type: "matching" },
        { msg: "Demande de nouveaux créneaux envoyée aux deux parties", type: "message_sent" },
      ]);
    }
  }, [tickets, artisans, simulateAI, update]);

  const startIntervention = useCallback((ticketId: string) => {
    update(ticketId, { interventionStatus: "en_cours" });
    simulateAI(ticketId, [
      { msg: "Intervention démarrée — artisan sur place", type: "action" },
    ]);
  }, [update, simulateAI]);

  const completeIntervention = useCallback((ticketId: string) => {
    update(ticketId, { interventionStatus: "termine" });
    const ticket = tickets.find(t => t.id === ticketId);
    simulateAI(ticketId, [
      { msg: "Retour d'intervention reçu — travaux terminés", type: "action" },
      { msg: `Notification envoyée à ${ticket?.locataire.nom} pour validation`, type: "message_sent" },
    ]);
  }, [update, tickets, simulateAI]);

  const validateIntervention = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const artisan = artisans.find(a => a.id === ticket?.artisanId);
    const quote = ticket?.quotes.find(q => q.selected);
    simulateAI(ticketId, [
      { msg: `✅ Intervention validée par ${ticket?.locataire.nom}`, type: "validation" },
      { msg: "Passage à l'étape Facturation", type: "action" },
    ], () => {
      update(ticketId, {
        status: "facturation", interventionValidee: true,
        facture: {
          montant: quote?.montant || 0, payee: false,
          refFacture: `FAC-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
          dateFacture: new Date().toISOString().slice(0, 10),
          prestation: quote?.description || "",
        },
      });
    });
  }, [tickets, artisans, simulateAI, update]);

  const validateFacture = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket?.facture) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    const payeur = ticket.responsabilite === "locataire" ? ticket.locataire.nom : ticket.bien.proprietaire;
    simulateAI(ticketId, [
      { msg: `Paiement de ${ticket.facture.montant} € envoyé à ${artisan?.nom}`, type: "action" },
      { msg: `Facturation de ${ticket.facture.montant} € transmise au ${payeur}`, type: "message_sent" },
      { msg: "Imputation comptable enregistrée", type: "action" },
      { msg: `Compte-rendu envoyé à ${ticket.bien.proprietaire}`, type: "message_sent" },
      { msg: `Information de clôture envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
      { msg: "Passage à l'étape Clôture", type: "action" },
    ], () => {
      update(ticketId, { status: "cloture", factureValidee: true, facture: { ...ticket.facture!, payee: true } });
    });
  }, [tickets, artisans, simulateAI, update]);

  const closeTicket = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    simulateAI(ticketId, [
      { msg: `Message de clôture envoyé à ${ticket.locataire.nom} : "Votre demande a bien été traitée."`, type: "message_sent" },
      { msg: `Compte-rendu complet envoyé à ${ticket.bien.proprietaire}`, type: "message_sent" },
      { msg: "Ticket archivé dans la base de données", type: "action" },
    ]);
  }, [tickets, simulateAI]);

  const addMessage = useCallback((ticketId: string, artisanId: string, content: string, from: "agence" | "artisan") => {
    const msg: TicketMessage = { id: `msg-${Date.now()}`, from, content, timestamp: new Date().toISOString() };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t, messages: { ...t.messages, [artisanId]: [...(t.messages[artisanId] || []), msg] }
    } : t));
  }, []);

  const getTicket = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);
  const getArtisan = useCallback((id: string) => artisans.find(a => a.id === id), [artisans]);

  return (
    <TicketContext.Provider value={{
      tickets, artisans, journalEntries, showJournal, activeTicketId,
      setShowJournal, setActiveTicketId,
      createTicket, updateTicket: update, qualifyTicket, sendArtisanContact,
      addQuote, selectQuoteAndAdvance, validateQuote, ownerRespond,
      setDisponibilites, matchAndConfirm, startIntervention, completeIntervention,
      validateIntervention, validateFacture, closeTicket, addMessage,
      getTicket, getArtisan,
    }}>
      {children}
    </TicketContext.Provider>
  );
}
