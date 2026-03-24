import React, { createContext, useContext, useState, useCallback } from "react";
import { AgencySettings } from "@/data/types";

const STORAGE_KEY = "claro_settings";

const defaultSettings: AgencySettings = {
  id: "1",
  agency_id: "agence-durand",
  agency_name: "Agence Durand",
  delegation_threshold: 250,
  always_ask_owner: false,
  escalation_delay_days: 15,
  escalation_reminders_count: 3,
  onboarding_completed: false,
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
