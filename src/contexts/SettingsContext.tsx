import React, { createContext, useContext, useState, useCallback } from "react";
import { AgencySettings, TicketPriority } from "@/data/types";

const STORAGE_KEY = "claro_settings";

const defaultTemplates = [
  { id: "t1", name: "Demande de devis", target: "artisan" as const, useCase: "Demande de devis suite à un signalement", subject: "Demande de devis — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous avons un besoin d'intervention pour un problème de {{categorie}} au {{adresse}} ({{lot}}).\n\nDescription : {{description}}\n\nMerci de nous adresser votre devis dans les meilleurs délais.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t2", name: "Confirmation intervention", target: "artisan" as const, useCase: "Confirmation de la date d'intervention", subject: "Confirmation d'intervention — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous confirmons votre intervention prévue le {{date_intervention}} au {{adresse}} ({{lot}}).\n\nLocataire : {{nom_locataire}} — {{telephone_locataire}}\n\nMerci.\n\n{{nom_agence}}" },
  { id: "t3", name: "Notification intervention", target: "locataire" as const, useCase: "Prévenir le locataire d'une intervention", subject: "Intervention prévue — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nUn artisan interviendra le {{date_intervention}} à votre domicile ({{adresse}}, {{lot}}) pour résoudre le problème signalé.\n\nArtisan : {{nom_artisan}} — {{telephone_artisan}}\n\nMerci de prévoir votre présence ou de nous indiquer un créneau.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t4", name: "Demande d'accord", target: "proprietaire" as const, useCase: "Envoi du devis pour accord", subject: "Devis à approuver — {{adresse}}", body: "Bonjour {{nom_proprietaire}},\n\nSuite au signalement au {{adresse}} ({{lot}}), nous avons reçu un devis de {{nom_artisan}} pour un montant de {{montant}} €.\n\nDescription : {{description}}\n\nMerci de nous confirmer votre accord.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t5", name: "Clôture dossier", target: "proprietaire" as const, useCase: "Informer le propriétaire de la clôture", subject: "Dossier clôturé — {{adresse}}", body: "Bonjour {{nom_proprietaire}},\n\nLe dossier concernant le problème signalé au {{adresse}} ({{lot}}) a été clôturé suite à l'intervention de {{nom_artisan}}.\n\nMontant facturé : {{montant}} €.\n\nCordialement,\n{{nom_agence}}" },
];

const defaultSettings: AgencySettings = {
  id: "1",
  agency_id: "agence-durand",
  agency_name: "Agence Durand",
  delegation_threshold: 250,
  always_ask_owner: false,
  escalation_delay_days: 15,
  escalation_reminders_count: 3,
  onboarding_completed: false,
  enabled_priorities: ["urgente", "haute", "normale", "basse"] as TicketPriority[],
  tour_completed: false,
  accountant_email: "",
  email_templates: defaultTemplates,
};

function loadSettings(): AgencySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return defaultSettings;
}

function saveSettings(s: AgencySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

interface SettingsContextType {
  settings: AgencySettings;
  updateSettings: (data: Partial<AgencySettings>) => void;
  needsOwnerApproval: (montant: number) => boolean;
  completeOnboarding: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(loadSettings);

  const updateSettings = useCallback((data: Partial<AgencySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...data };
      saveSettings(next);
      return next;
    });
  }, []);

  const needsOwnerApproval = useCallback((montant: number) => {
    if (settings.always_ask_owner) return true;
    return montant > settings.delegation_threshold;
  }, [settings.always_ask_owner, settings.delegation_threshold]);

  const completeOnboarding = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, onboarding_completed: true };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, needsOwnerApproval, completeOnboarding }}>
      {children}
    </SettingsContext.Provider>
  );
}
