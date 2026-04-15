import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppLoader } from "@/components/AppLoader";
import { AgencySettings, TicketPriority } from "@/data/types";
import { USE_SUPABASE, supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/hooks/useAgency";
import { mapAgencySettings, mapTemplateTargetToDb } from "@/lib/supabaseData";

const logSettings = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log("[SETTINGS]", ...args);
  }
};

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
  email_inbound: "",
  delegation_threshold: 250,
  always_ask_owner: false,
  escalation_delay_days: 3,
  escalation_reminders_count: 3,
  onboarding_completed: false,
  enabled_priorities: ["urgente", "haute", "normale", "basse"] as TicketPriority[],
  tour_completed: false,
  accountant_email: "",
  email_templates: defaultTemplates,
};

export function loadSettings(): AgencySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return defaultSettings;
}

export function saveSettings(s: AgencySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

interface SettingsContextType {
  settings: AgencySettings;
  loading: boolean;
  updateSettings: (data: Partial<AgencySettings>) => void;
  needsOwnerApproval: (montant: number) => boolean;
  completeOnboarding: () => Promise<string>; // resolves to the agency UUID
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildInboundEmail(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const safeSlug = slug || "agence";
  return `${safeSlug}@mail.claroimmo.fr`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(loadSettings);
  const [loading, setLoading] = useState<boolean>(USE_SUPABASE);
  const { profile, updateProfile, user, loading: authLoading } = useAuth();

  // agency_id comes from the authenticated user's profile (set by Supabase Auth).
  // In mock mode profile.agency_id is "agence-durand", which won't be used by the hook.
  const agencyId = USE_SUPABASE ? (profile?.agency_id ?? null) : undefined;

  const { bundle, loading: remoteLoading, error: remoteError } = useAgency(agencyId);

  // Compute remote settings only when the DB bundle changes (stable: defaultSettings is a const).
  // Only use remote settings if the DB actually has a settings row — otherwise we'd overwrite
  // local state (e.g. onboarding_completed=true) with default values (false).
  const remoteSettings = useMemo(() => {
    if (!bundle || !bundle.settings) return null;
    return mapAgencySettings(bundle.agency, bundle.settings, bundle.templates, defaultSettings);
  }, [bundle]);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }
    setLoading(remoteLoading);
  }, [remoteLoading]);

  // One-time sync: when remote data arrives, merge it into local state (with real agency UUID).
  useEffect(() => {
    if (!USE_SUPABASE || !remoteSettings) return;
    setSettings((prev) => {
      const merged: AgencySettings = {
        ...prev,
        ...remoteSettings,
        // Use the real UUID from the user's profile.
        agency_id: agencyId ?? bundle?.agency?.id ?? prev.agency_id,
      };
      saveSettings(merged);
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSettings]); // remoteSettings only changes when bundle changes — no loop

  // New account with no linked agency: ignore stale local state from previous sessions.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    // Wait for auth to finish — don't reset while profile is still loading
    if (authLoading) return;
    // If profile has an agency, settings are valid
    if (profile?.agency_id) return;

    setSettings((prev) => {
      // Only reset if settings claim onboarding is done but profile contradicts it
      if (!prev.onboarding_completed) return prev;

      logSettings("Resetting stale settings — onboarding_completed=true but profile has no agency", {
        profile_agency_id: profile?.agency_id ?? null,
        settings_agency_id: prev.agency_id,
      });
      const reset: AgencySettings = {
        ...defaultSettings,
        agency_name: prev.agency_name || defaultSettings.agency_name,
        agency_id: "",
        onboarding_completed: false,
        email_inbound: "",
      };
      saveSettings(reset);
      return reset;
    });
  }, [profile?.agency_id, authLoading]);

  // Stable settings row ID — once assigned, never changes. Prevents duplicate rows.
  const settingsRowId = useMemo(() => {
    if (bundle?.settings?.id) return bundle.settings.id;
    return crypto.randomUUID();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.settings?.id]);

  const persistSettings = useCallback(async (next: AgencySettings, data: Partial<AgencySettings>) => {
    if (!USE_SUPABASE) return;

    const targetAgencyId = next.agency_id;
    // Don't attempt writes if agency_id is not a real UUID (e.g. mock "agence-durand")
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetAgencyId);
    if (!isValidUuid) return;
    const settingsPayload: Record<string, unknown> = {
      id: settingsRowId,
      agency_id: targetAgencyId,
    };

    if ("delegation_threshold" in data) settingsPayload.delegation_threshold = next.delegation_threshold;
    if ("always_ask_owner" in data) settingsPayload.always_ask_owner = next.always_ask_owner;
    if ("escalation_delay_days" in data) settingsPayload.escalation_delay_days = next.escalation_delay_days;
    if ("escalation_reminders_count" in data) settingsPayload.escalation_reminders_count = next.escalation_reminders_count;
    if ("accountant_email" in data) settingsPayload.accountant_email = next.accountant_email;
    if ("enabled_priorities" in data) settingsPayload.enabled_priorities = next.enabled_priorities;
    if ("onboarding_completed" in data) settingsPayload.onboarding_completed = next.onboarding_completed;
    if ("tour_completed" in data) settingsPayload.tour_completed = next.tour_completed;

    if (Object.keys(settingsPayload).length > 2) {
      await supabase.from("agency_settings").upsert(settingsPayload, { onConflict: "id" });
    }

    if ("agency_name" in data && targetAgencyId) {
      await supabase.from("agencies").update({ name: next.agency_name }).eq("id", targetAgencyId);
    }

    if ("email_templates" in data && targetAgencyId) {
      const payload = next.email_templates.map((template) => ({
        id: isUuid(template.id) ? template.id : crypto.randomUUID(),
        agency_id: targetAgencyId,
        name: template.name,
        target: mapTemplateTargetToDb(template.target),
        use_case: template.useCase,
        subject: template.subject,
        body: template.body,
        is_active: true,
      }));
      if (payload.length > 0) {
        await supabase.from("email_templates").upsert(payload, { onConflict: "id" });
      }
    }
  }, [settingsRowId]);

  const updateSettings = useCallback((data: Partial<AgencySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...data };
      saveSettings(next);
      void persistSettings(next, data).catch((error) => {
        console.error("Failed to persist settings", error);
      });
      return next;
    });
  }, [persistSettings]);

  const needsOwnerApproval = useCallback((montant: number) => {
    if (settings.always_ask_owner) return true;
    return montant > settings.delegation_threshold;
  }, [settings.always_ask_owner, settings.delegation_threshold]);

  const completeOnboarding = useCallback(async () => {
    const current = settings;
    const needsNewAgency = USE_SUPABASE && !bundle?.agency;
    const newAgencyId = needsNewAgency ? crypto.randomUUID() : null;
    let resolvedAgencyId = agencyId ?? current.agency_id;
    let emailInbound = current.email_inbound;

    if (newAgencyId) {
      resolvedAgencyId = newAgencyId;
      emailInbound = buildInboundEmail(current.agency_name || "agence");
    }

    // --- Set ALL local state synchronously BEFORE any async DB writes ---
    // React 18 batches these updates — guards/effects will see them together.
    const next: AgencySettings = {
      ...current,
      onboarding_completed: true,
      ...(newAgencyId && { agency_id: newAgencyId, email_inbound: emailInbound }),
    };
    setSettings(next);
    saveSettings(next);

    if (newAgencyId) {
      // Update in-memory profile so guards see the new agency_id immediately.
      updateProfile({ agency_id: newAgencyId });
    }

    logSettings("completeOnboarding: local state set", {
      onboarding_completed: true,
      agency_id: resolvedAgencyId,
      needsNewAgency,
    });

    if (!USE_SUPABASE) return;

    // --- Now do all async DB writes ---
    try {
      if (newAgencyId) {
        const slug = (current.agency_name || "agence")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const { error: agencyError } = await supabase.from("agencies").insert({
          id: newAgencyId,
          name: current.agency_name,
          code: slug || "agence",
          email_inbound: emailInbound,
        });

        if (agencyError) {
          console.warn("Failed to create agency in DB (RLS?)", agencyError.message);
        }

        // Link the current user's profile to this new agency.
        const userId = profile?.id ?? user?.id;
        if (userId) {
          await supabase
            .from("profiles")
            .upsert({ id: userId, agency_id: newAgencyId }, { onConflict: "id" });
        }
      }

      // Upsert agency settings.
      const settingsId =
        next.id && next.id !== "1" ? next.id : crypto.randomUUID();
      await supabase.from("agency_settings").upsert(
        {
          id: settingsId,
          agency_id: resolvedAgencyId,
          delegation_threshold: next.delegation_threshold,
          always_ask_owner: next.always_ask_owner,
          escalation_delay_days: next.escalation_delay_days,
          escalation_reminders_count: next.escalation_reminders_count,
          accountant_email: next.accountant_email,
          enabled_priorities: next.enabled_priorities,
          onboarding_completed: true,
          tour_completed: next.tour_completed,
        },
        { onConflict: "id" },
      );

      // Upsert email templates.
      if (next.email_templates.length > 0) {
        const payload = next.email_templates.map((t) => ({
          id: isUuid(t.id) ? t.id : crypto.randomUUID(),
          agency_id: resolvedAgencyId,
          name: t.name,
          target: mapTemplateTargetToDb(t.target),
          use_case: t.useCase,
          subject: t.subject,
          body: t.body,
          is_active: true,
        }));
        await supabase
          .from("email_templates")
          .upsert(payload, { onConflict: "id" });
      }

      logSettings("completeOnboarding: DB writes done");
    } catch (error) {
      console.error("Failed to persist onboarding completion", error);
      throw error;
    }

    return resolvedAgencyId;
  }, [settings, bundle, agencyId, profile, user, updateProfile]);

  const value = useMemo(
    () => ({ settings, loading, updateSettings, needsOwnerApproval, completeOnboarding }),
    [settings, loading, updateSettings, needsOwnerApproval, completeOnboarding],
  );

  // Block rendering only when we're loading settings for an *already-linked* agency
  // on a fresh device (no local data yet). Never block when onboarding was just completed
  // locally — the AgencySetupLoader animation would be unmounted mid-play otherwise.
  if (USE_SUPABASE && loading && !remoteSettings && !remoteError && !settings.onboarding_completed) {
    return <AppLoader />;
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
