import React, { createContext, useContext, useState, useCallback } from "react";
import { Ticket, Artisan, AIJournalEntry, Quote, TicketMessage, Responsabilite, TicketCategory, TicketPriority, categoryLabels } from "@/data/types";
import { initialTickets, initialArtisans } from "@/data/mockData";
import { useSettings } from "@/contexts/SettingsContext";

interface TicketContextType {
  tickets: Ticket[];
  artisans: Artisan[];
  journalEntries: AIJournalEntry[];
  showJournal: boolean;
  activeTicketId: string | null;
  setShowJournal: (v: boolean) => void;
  setActiveTicketId: (v: string | null) => void;
  createTicket: (data: { titre: string; description: string; categorie: TicketCategory; priorite: TicketPriority; urgence: boolean; locataireNom: string; locataireTel: string; locataireEmail: string; adresse: string; lot: string; proprietaire: string; telephoneProprio: string; emailProprio: string; mailSource?: { from: string; to: string; subject: string; body: string; receivedAt: string } }) => Ticket;
  updateTicket: (id: string, data: Partial<Ticket>) => void;
  qualifyTicket: (id: string) => void;
  sendArtisanContact: (ticketId: string, artisanId: string) => void;
  receiveQuote: (ticketId: string) => void;
  validateQuote: (ticketId: string) => void;
  ownerRespond: (ticketId: string, approved: boolean) => void;
  confirmPassage: (ticketId: string, confirmed: boolean) => void;
  validateFacture: (ticketId: string) => void;
  closeTicket: (ticketId: string) => void;
  contactSyndic: (ticketId: string) => void;
  relanceSyndic: (ticketId: string) => void;
  escaladeSyndic: (ticketId: string) => void;
  resolveSyndic: (ticketId: string) => void;
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

let ticketCounter = 1;

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const { settings, needsOwnerApproval } = useSettings();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [artisans] = useState<Artisan[]>(initialArtisans);
  const [journalEntries, setJournalEntries] = useState<AIJournalEntry[]>([]);
  const [showJournal, setShowJournal] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const simulateAI = useCallback((ticketId: string, actions: { msg: string; type: AIJournalEntry["type"] }[], onComplete?: () => void) => {
    setActiveTicketId(ticketId);
    setShowJournal(true);
    actions.forEach((action, i) => {
      const entryId = `${Date.now()}-${ticketId}-${i}`;
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
      quotes: [], messages: {},
      photos: [], notes: [],
      mailSource: data.mailSource,
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
    const isSyndic = ticket.responsabilite === "syndic" || ticket.syndic != null;
    const resp = isSyndic ? "syndic" : (ticket.categorie === "autre" ? "partagee" : (["plomberie", "electricite", "chauffage", "toiture", "humidite"].includes(ticket.categorie) ? "proprietaire" : "locataire"));
    if (resp === "syndic") {
      simulateAI(id, [
        { msg: "Analyse du signalement en cours…", type: "analysis" },
        { msg: `Description analysée : "${ticket.description.slice(0, 60)}…"`, type: "analysis" },
        { msg: "Parties communes détectées → Responsabilité : Syndic", type: "analysis" },
        { msg: `Syndic identifié : ${ticket.syndic?.nom || "À renseigner"}`, type: "analysis" },
        { msg: "Diagnostic terminé → Parcours Syndic activé", type: "action" },
        { msg: "Passage à l'étape Contact syndic", type: "action" },
      ], () => {
        update(id, { status: "contact_syndic", responsabilite: "syndic" });
      });
    } else {
      simulateAI(id, [
        { msg: "Analyse du signalement en cours…", type: "analysis" },
        { msg: `Description analysée : "${ticket.description.slice(0, 60)}…"`, type: "analysis" },
        { msg: `Catégorie détectée : ${ticket.categorie}`, type: "analysis" },
        { msg: `Analyse de responsabilité : ${resp === "proprietaire" ? "Propriétaire" : resp === "locataire" ? "Locataire" : "Partagée"}`, type: "analysis" },
        { msg: "Diagnostic terminé → Orientation : Réparation/Entretien", type: "action" },
        { msg: "Passage à l'étape Contact artisan", type: "action" },
      ], () => {
        update(id, { status: "contact_artisan", responsabilite: resp as Responsabilite });
      });
    }
  }, [tickets, simulateAI, update]);

  const sendArtisanContact = useCallback((ticketId: string, artisanId: string) => {
    const artisan = artisans.find(a => a.id === artisanId);
    const ticket = tickets.find(t => t.id === ticketId);
    if (!artisan || !ticket) return;
    const msg: TicketMessage = {
      id: `msg-${Date.now()}`, from: "agence",
      content: `Bonjour ${artisan.nom}, nous avons un problème de ${ticket.categorie} au ${ticket.bien.adresse}. Pouvez-vous vous déplacer pour faire un diagnostic sur place ? Merci.`,
      timestamp: new Date().toISOString(),
    };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      artisanId: artisanId,
      messages: { ...t.messages, [artisanId]: [...(t.messages[artisanId] || []), msg] }
    } : t));
    simulateAI(ticketId, [
      { msg: `Email envoyé à ${artisan.nom} (${artisan.email})`, type: "message_sent" },
      { msg: `Demande de déplacement pour diagnostic : ${ticket.titre}`, type: "message_sent" },
    ]);

    // Simulate artisan response after 3 seconds
    setTimeout(() => {
      const replyMsg: TicketMessage = {
        id: `msg-${Date.now()}-reply`, from: "artisan",
        content: `Bonjour, suite à votre demande, je peux me déplacer pour un diagnostic au ${ticket.bien.adresse}.\n\nJe suis disponible demain matin. Je vous enverrai mon devis après le diagnostic sur place.\n\nCordialement,\n${artisan.nom}`,
        timestamp: new Date().toISOString(),
      };
      setTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t, messages: { ...t.messages, [artisanId]: [...(t.messages[artisanId] || []), replyMsg] }
      } : t));
      simulateAI(ticketId, [
        { msg: `📩 Réponse reçue de ${artisan.nom}`, type: "notification" },
        { msg: `L'artisan accepte de se déplacer pour un diagnostic sur place`, type: "notification" },
        { msg: "En attente du devis après diagnostic…", type: "notification" },
      ]);
    }, 3000);
  }, [artisans, tickets, simulateAI]);

  const receiveQuote = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.artisanId) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    if (!artisan) return;
    const montant = Math.floor(200 + Math.random() * 600);
    const delais = ["2 jours", "3 jours", "5 jours", "1 semaine"];
    const delai = delais[Math.floor(Math.random() * delais.length)];
    const quote: Quote = { id: `q-${Date.now()}`, artisanId: ticket.artisanId, artisanNom: artisan.nom, montant, delai, description: `${categoryLabels[ticket.categorie]} — ${ticket.bien.adresse}`, selected: true };
    const replyMsg: TicketMessage = {
      id: `msg-${Date.now()}-devis`, from: "artisan",
      content: `Bonjour, suite à mon passage sur place, voici mon devis pour les travaux au ${ticket.bien.adresse}.\n\nMontant : ${montant} €\nDélai estimé : ${delai}\n\n📎 Devis_${artisan.nom.replace(/\s/g, "_")}_${ticket.reference}.pdf\n\nCordialement,\n${artisan.nom}`,
      timestamp: new Date().toISOString(),
    };
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      status: "reception_devis" as const,
      quotes: [quote],
      selectedQuoteId: quote.id,
      messages: { ...t.messages, [ticket.artisanId!]: [...(t.messages[ticket.artisanId!] || []), replyMsg] }
    } : t));
    simulateAI(ticketId, [
      { msg: `📩 Devis reçu de ${artisan.nom} après diagnostic sur place`, type: "notification" },
      { msg: `Montant : ${montant} € — Délai : ${delai}`, type: "notification" },
      { msg: "Passage à l'étape Réception devis", type: "action" },
    ]);
  }, [tickets, artisans, simulateAI]);

  const validateQuote = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const quote = ticket.quotes.find(q => q.id === ticket.selectedQuoteId);
    if (!quote) return;
    const requiresOwner = needsOwnerApproval(quote.montant);
    if (!requiresOwner) {
      simulateAI(ticketId, [
        { msg: `Montant du devis : ${quote.montant} € — sous le seuil de délégation (${settings.delegation_threshold} €)`, type: "validation" },
        { msg: "Validé automatiquement par l'agence — propriétaire non sollicité", type: "validation" },
        { msg: `Confirmation envoyée à ${quote.artisanNom}`, type: "message_sent" },
        { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
        { msg: "Passage à l'étape Intervention", type: "action" },
      ], () => {
        update(ticketId, { status: "intervention", validationStatus: "approuve" });
      });
    } else {
      const reason = settings.always_ask_owner
        ? "Accord propriétaire systématique (règle agence)"
        : `Montant du devis : ${quote.montant} € — au-dessus du seuil (${settings.delegation_threshold} €)`;
      simulateAI(ticketId, [
        { msg: reason, type: "validation" },
        { msg: `Demande d'accord envoyée à ${ticket.bien.proprietaire} (${ticket.bien.emailProprio})`, type: "message_sent" },
        { msg: "En attente de la réponse du propriétaire…", type: "notification" },
      ]);
      update(ticketId, { status: "validation_proprio", validationStatus: "en_attente" });

      // Simulate owner approval after 3 seconds
      setTimeout(() => {
        update(ticketId, { validationStatus: "approuve" });
        const artisanObj = artisans.find(a => a.id === ticket.artisanId);
        simulateAI(ticketId, [
          { msg: `✅ ${ticket.bien.proprietaire} a approuvé le devis`, type: "validation" },
          { msg: `Confirmation envoyée à ${artisanObj?.nom}`, type: "message_sent" },
          { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
          { msg: "Passage à l'étape Intervention", type: "action" },
        ], () => {
          setTimeout(() => {
            update(ticketId, { status: "intervention" });
          }, 2000);
        });
      }, 3000);
    }
  }, [tickets, artisans, settings, needsOwnerApproval, simulateAI, update]);

  const ownerRespond = useCallback((ticketId: string, approved: boolean) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const artisan = artisans.find(a => a.id === ticket.artisanId);
    if (approved) {
      simulateAI(ticketId, [
        { msg: `✅ ${ticket.bien.proprietaire} a approuvé le devis`, type: "validation" },
        { msg: `Confirmation envoyée à ${artisan?.nom}`, type: "message_sent" },
        { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
        { msg: "Passage à l'étape Intervention", type: "action" },
      ], () => {
        update(ticketId, { status: "intervention", validationStatus: "approuve" });
      });
    } else {
      simulateAI(ticketId, [
        { msg: `❌ ${ticket.bien.proprietaire} a refusé le devis`, type: "validation" },
        { msg: "Retour à l'étape Contact artisan — possibilité de contacter un autre artisan", type: "notification" },
      ], () => {
        update(ticketId, { validationStatus: "refuse", status: "contact_artisan", selectedQuoteId: undefined, artisanId: undefined, quotes: [] });
      });
    }
  }, [tickets, artisans, simulateAI, update]);

  const confirmPassage = useCallback((ticketId: string, confirmed: boolean) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const quote = ticket.quotes.find(q => q.selected);
    if (confirmed) {
      simulateAI(ticketId, [
        { msg: "✅ Passage de l'artisan confirmé par le gestionnaire", type: "validation" },
        { msg: "Passage à l'étape Facturation", type: "action" },
      ], () => {
        update(ticketId, {
          status: "facturation", passageConfirme: true,
          facture: {
            montant: quote?.montant || 0, payee: false,
            refFacture: `FAC-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
            dateFacture: new Date().toISOString().slice(0, 10),
            prestation: quote?.description || "",
          },
        });
      });
    } else {
      simulateAI(ticketId, [
        { msg: "❌ L'artisan n'est pas intervenu — retour à l'étape Intervention", type: "notification" },
      ], () => {
        update(ticketId, { status: "intervention", passageConfirme: false });
      });
    }
  }, [tickets, simulateAI, update]);

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

  const contactSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.syndic) return;
    simulateAI(ticketId, [
      { msg: `Mail envoyé au syndic ${ticket.syndic.nom} (${ticket.syndic.email})`, type: "message_sent" },
      { msg: `Objet : Signalement incident parties communes — ${ticket.bien.adresse}`, type: "message_sent" },
      { msg: `Description : ${ticket.description.slice(0, 80)}…`, type: "message_sent" },
      { msg: "En attente de réponse du syndic…", type: "notification" },
    ], () => {
      update(ticketId, { status: "relance_syndic", syndicRelances: [] });
    });
  }, [tickets, simulateAI, update]);

  const relanceSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.syndic) return;
    const relances = ticket.syndicRelances || [];
    const numero = relances.length + 1;
    const date = new Date().toISOString().slice(0, 10);
    const isEscalade = numero >= 3;
    simulateAI(ticketId, [
      { msg: `Relance automatique #${numero} envoyée à ${ticket.syndic.nom} le ${date}`, type: "message_sent" },
      { msg: numero >= 2 ? "Toujours sans réponse du syndic" : "En attente de réponse…", type: "notification" },
      ...(isEscalade ? [{ msg: "Seuil de relances atteint — passage en escalade", type: "action" as const }] : []),
    ], () => {
      if (isEscalade) {
        update(ticketId, { status: "escalade_syndic", syndicRelances: [...relances, { date, numero }], syndicEscalade: true });
      } else {
        update(ticketId, { syndicRelances: [...relances, { date, numero }] });
      }
    });
  }, [tickets, simulateAI, update]);

  const escaladeSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    simulateAI(ticketId, [
      { msg: "Escalade : recommandation de mise en demeure", type: "action" },
      { msg: `Projet de mise en demeure généré pour ${ticket.syndic?.nom}`, type: "action" },
    ], () => {
      update(ticketId, { syndicEscalade: true });
    });
  }, [tickets, simulateAI, update]);

  const resolveSyndic = useCallback((ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    simulateAI(ticketId, [
      { msg: `Le syndic ${ticket.syndic?.nom} a répondu / est intervenu`, type: "validation" },
      { msg: `Notification envoyée à ${ticket.locataire.nom}`, type: "message_sent" },
      { msg: "Passage à la clôture", type: "action" },
    ], () => {
      update(ticketId, { status: "cloture" });
    });
  }, [tickets, simulateAI, update]);

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
      receiveQuote, validateQuote, ownerRespond,
      confirmPassage, validateFacture, closeTicket,
      contactSyndic, relanceSyndic, escaladeSyndic, resolveSyndic,
      addMessage,
      getTicket, getArtisan,
    }}>
      {children}
    </TicketContext.Provider>
  );
}
