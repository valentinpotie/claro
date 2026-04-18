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
  // ── Artisan ─────────────────────────────────────────────────────────────────
  { id: "t1", name: "Demande de devis", target: "artisan" as const, useCase: "Demande de devis suite à un signalement", subject: "Demande de devis — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous avons un besoin d'intervention pour un problème de {{categorie}} au {{adresse}} ({{lot}}).\n\nDescription : {{description}}\n\nMerci de nous adresser votre devis dans les meilleurs délais.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t2", name: "Confirmation intervention", target: "artisan" as const, useCase: "Confirmation de la date d'intervention", subject: "Confirmation d'intervention — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous confirmons votre intervention prévue le {{date_intervention}} au {{adresse}} ({{lot}}).\n\nLocataire : {{nom_locataire}} — {{telephone_locataire}}\n\nMerci.\n\n{{nom_agence}}" },
  { id: "t8", name: "Devis validé — confirmation artisan", target: "artisan" as const, useCase: "auto:artisan_devis_valide", subject: "Devis validé — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nLe devis de {{montant}} € concernant le bien au {{adresse}} a été validé. Merci de confirmer votre disponibilité pour l'intervention.\n\nLocataire : {{nom_locataire}} — {{telephone_locataire}}\n\nCordialement,\n{{nom_agence}}" },
  { id: "t9", name: "Paiement facture", target: "artisan" as const, useCase: "auto:artisan_facture_payee", subject: "Paiement transmis — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous avons bien reçu et validé votre facture de {{montant}} €. Le paiement vous a été transmis.\n\nMerci pour votre intervention au {{adresse}}.\n\nCordialement,\n{{nom_agence}}" },
  // ── Locataire ────────────────────────────────────────────────────────────────
  { id: "t3", name: "Notification intervention", target: "locataire" as const, useCase: "Prévenir le locataire d'une intervention", subject: "Intervention prévue — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nUn artisan interviendra le {{date_intervention}} à votre domicile ({{adresse}}, {{lot}}) pour résoudre le problème signalé.\n\nArtisan : {{nom_artisan}} — {{telephone_artisan}}\n\nMerci de prévoir votre présence ou de nous indiquer un créneau.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t10", name: "Artisan en route (devis auto-validé)", target: "locataire" as const, useCase: "auto:locataire_artisan_vient", subject: "Votre demande avance — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nVotre demande est en cours de traitement. Le devis a été validé et l'artisan {{nom_artisan}} va prochainement prendre contact avec vous pour convenir d'une date d'intervention au {{adresse}}.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t18", name: "Intervention confirmée par le propriétaire", target: "locataire" as const, useCase: "auto:locataire_proprio_approuve", subject: "Intervention confirmée — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nL'intervention au {{adresse}} a été confirmée par le propriétaire. L'artisan {{nom_artisan}} va prochainement prendre contact avec vous pour convenir d'une date de passage.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t11", name: "Demande de preuve de passage", target: "locataire" as const, useCase: "auto:locataire_preuve_passage", subject: "Confirmation d'intervention — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nL'artisan nous a transmis sa facture suite à son intervention au {{adresse}}. Pourriez-vous nous faire parvenir une photo ou une vidéo confirmant que l'intervention a bien eu lieu à votre domicile ?\n\nMerci.\n\n{{nom_agence}}" },
  { id: "t12", name: "Clôture dossier (locataire)", target: "locataire" as const, useCase: "auto:locataire_cloture", subject: "Dossier clôturé — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nL'intervention à votre domicile est terminée et votre dossier est désormais clôturé. N'hésitez pas à nous contacter pour tout nouveau problème.\n\nCordialement,\n{{nom_agence}}" },
  // ── Propriétaire ─────────────────────────────────────────────────────────────
  { id: "t4", name: "Demande d'accord", target: "proprietaire" as const, useCase: "auto:proprietaire_accord_devis", subject: "Devis à approuver — {{adresse}}", body: "Bonjour {{nom_proprietaire}},\n\nSuite au signalement au {{adresse}} ({{lot}}), nous avons reçu un devis de {{nom_artisan}} pour un montant de {{montant}} €.\n\nDescription : {{description}}\n\nMerci de nous confirmer votre accord dans les meilleurs délais.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t5", name: "Clôture dossier (propriétaire)", target: "proprietaire" as const, useCase: "auto:proprietaire_cloture", subject: "Dossier clôturé — {{adresse}}", body: "Bonjour {{nom_proprietaire}},\n\nLe dossier concernant le problème signalé au {{adresse}} ({{lot}}) a été clôturé suite à l'intervention de {{nom_artisan}}.\n\nMontant facturé : {{montant}} €.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t13", name: "Compte-rendu facture", target: "proprietaire" as const, useCase: "auto:proprietaire_facture", subject: "Compte-rendu travaux — {{adresse}}", body: "Bonjour {{nom_proprietaire}},\n\nVoici le compte-rendu d'intervention pour votre bien au {{adresse}} ({{lot}}). La facture de {{montant}} € a été réglée.\n\nCordialement,\n{{nom_agence}}" },
  // ── Intervention ─────────────────────────────────────────────────────────────
  { id: "t14", name: "Relance artisan — date d'intervention", target: "artisan" as const, useCase: "auto:artisan_relance_date", subject: "Relance — Date d'intervention {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous attendons que vous preniez contact avec le locataire {{nom_locataire}} ({{telephone_locataire}}) pour fixer une date d'intervention au {{adresse}}.\n\nMerci de nous confirmer la date retenue dans les meilleurs délais.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t15", name: "Contact locataire — confirmation artisan", target: "locataire" as const, useCase: "auto:locataire_contact_artisan", subject: "Votre dossier — {{adresse}}", body: "Bonjour {{nom_locataire}},\n\nL'artisan chargé de votre intervention au {{adresse}} devrait vous avoir contacté pour convenir d'une date de passage. Avez-vous été contacté ?\n\nSi oui, pourriez-vous nous indiquer la date et l'heure convenues ?\n\nCordialement,\n{{nom_agence}}" },
  { id: "t16", name: "Demande de preuves — artisan", target: "artisan" as const, useCase: "auto:artisan_demande_preuve", subject: "Preuves d'intervention — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nSuite à votre intervention au {{adresse}}, pourriez-vous nous transmettre des photos attestant de la réalisation des travaux ?\n\nMerci de répondre à ce message en joignant les éléments demandés.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t17", name: "Relance facture — artisan", target: "artisan" as const, useCase: "auto:artisan_relance_facture", subject: "Facture en attente — {{adresse}}", body: "Bonjour {{nom_artisan}},\n\nNous n'avons pas encore reçu votre facture concernant l'intervention au {{adresse}}. Pourriez-vous nous la transmettre dans les meilleurs délais ?\n\nCelle-ci est nécessaire pour finaliser le dossier.\n\nCordialement,\n{{nom_agence}}" },
  // ── Syndic ───────────────────────────────────────────────────────────────────
  { id: "t6", name: "Signalement syndic", target: "syndic" as const, useCase: "auto:contact_syndic", subject: "Signalement incident — {{adresse}}", body: "Bonjour,\n\nNous vous signalons un incident dans les parties communes de la résidence au {{adresse}}.\n\nDescription : {{description}}\n\nMerci de bien vouloir prendre en charge ce problème dans les meilleurs délais.\n\nCordialement,\n{{nom_agence}}" },
  { id: "t7", name: "Relance syndic", target: "syndic" as const, useCase: "auto:relance_syndic", subject: "Relance — Incident {{adresse}}", body: "Bonjour,\n\nSans réponse de votre part depuis notre précédent contact concernant l'incident au {{adresse}}, nous nous permettons de vous relancer.\n\nMerci de bien vouloir traiter ce signalement dans les meilleurs délais.\n\nCordialement,\n{{nom_agence}}" },
];

const defaultSettings: AgencySettings = {
  id: "1",
  agency_id: "agence-durand",
  agency_name: "Agence Durand",
  email_inbound: "",
  delegation_threshold: 250,
  always_ask_owner: false,
  escalation_delay_owner_days: 3,
  escalation_delay_artisan_days: 3,
  escalation_delay_tenant_days: 3,
  escalation_reminders_count: 3,
  onboarding_completed: false,
  enabled_priorities: ["urgente", "haute", "normale", "basse"] as TicketPriority[],
  tour_completed: false,
  accountant_email: "",
  email_templates: defaultTemplates,
  demo_mode: true,
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
  //
  // Guards (in order) — reset ONLY for the specific "signed in but no agency" case.
  // If we reset for any other null-profile state, a transient auth lock timeout or network
  // blip on page refresh would boot an authenticated user back to onboarding.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    if (authLoading) return;           // auth is still resolving → wait
    if (!user) return;                 // truly signed out → AuthGuard handles the redirect, don't touch settings
    if (!profile) return;              // signed in but profile fetch failed (e.g. lock timeout) → don't conclude "no agency"
    if (profile.agency_id) return;     // profile has an agency → settings are valid

    // Only now: user is signed in, profile is fully loaded, and it has no agency_id.
    setSettings((prev) => {
      if (!prev.onboarding_completed) return prev;

      logSettings("Resetting stale settings — profile loaded with no agency_id", {
        profile_agency_id: profile.agency_id,
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
  }, [user, profile, authLoading]);

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
    if ("escalation_delay_owner_days" in data) settingsPayload.escalation_delay_owner_days = next.escalation_delay_owner_days;
    if ("escalation_delay_artisan_days" in data) settingsPayload.escalation_delay_artisan_days = next.escalation_delay_artisan_days;
    if ("escalation_delay_tenant_days" in data) settingsPayload.escalation_delay_tenant_days = next.escalation_delay_tenant_days;
    if ("escalation_reminders_count" in data) settingsPayload.escalation_reminders_count = next.escalation_reminders_count;
    if ("accountant_email" in data) settingsPayload.accountant_email = next.accountant_email;
    if ("enabled_priorities" in data) settingsPayload.enabled_priorities = next.enabled_priorities;
    if ("onboarding_completed" in data) settingsPayload.onboarding_completed = next.onboarding_completed;
    if ("tour_completed" in data) settingsPayload.tour_completed = next.tour_completed;

    if (Object.keys(settingsPayload).length > 2) {
      await supabase.from("agency_settings").upsert(settingsPayload, { onConflict: "id" });
    }

    const agencyPayload: Record<string, unknown> = {};
    if ("agency_name" in data) agencyPayload.name = next.agency_name;
    if ("demo_mode" in data) agencyPayload.demo_mode = next.demo_mode;
    if (targetAgencyId && Object.keys(agencyPayload).length > 0) {
      await supabase.from("agencies").update(agencyPayload).eq("id", targetAgencyId);
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
        await supabase.from("email_templates").upsert(payload, { onConflict: "agency_id,use_case" });
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
          escalation_delay_owner_days: next.escalation_delay_owner_days,
          escalation_delay_artisan_days: next.escalation_delay_artisan_days,
          escalation_delay_tenant_days: next.escalation_delay_tenant_days,
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
