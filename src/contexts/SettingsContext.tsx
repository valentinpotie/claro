import React, { createContext, useContext, useState, useCallback } from "react";
import { AgencySettings } from "@/data/types";

const defaultSettings: AgencySettings = {
  id: "1",
  agency_id: "agence-durand",
  delegation_threshold: 250,
  always_ask_owner: false,
  escalation_delay_days: 15,
  escalation_reminders_count: 3,
};

interface SettingsContextType {
  settings: AgencySettings;
  updateSettings: (data: Partial<AgencySettings>) => void;
  needsOwnerApproval: (montant: number) => boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(defaultSettings);

  const updateSettings = useCallback((data: Partial<AgencySettings>) => {
    setSettings(prev => ({ ...prev, ...data }));
  }, []);

  const needsOwnerApproval = useCallback((montant: number) => {
    if (settings.always_ask_owner) return true;
    return montant > settings.delegation_threshold;
  }, [settings.always_ask_owner, settings.delegation_threshold]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, needsOwnerApproval }}>
      {children}
    </SettingsContext.Provider>
  );
}
