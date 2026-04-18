import { useCallback, useEffect, useState } from "react";
import type { Tenant } from "@/data/types";
import { USE_SUPABASE, supabase } from "@/lib/supabase";

const mockTenants: Tenant[] = [
  { id: "ten-1", first_name: "Julie", last_name: "Petit", email: "j.petit@email.fr", phone: "06 34 56 78 90", is_active: true, lease_start: "2024-01-01", lease_end: "2026-12-31" },
  { id: "ten-2", first_name: "Sophie", last_name: "Martin", email: "s.martin@email.fr", phone: "06 12 34 56 78", is_active: true, lease_start: "2023-06-01" },
  { id: "ten-3", first_name: "Thomas", last_name: "Roche", email: "t.roche@email.fr", phone: "06 55 44 33 22", is_active: true, lease_start: "2025-03-01", lease_end: "2027-02-28" },
];

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Postgres rejects empty strings ("") for DATE / nullable typed columns → 400 Bad Request,
 * which silently fails the write and leaves the UI showing a ghost row that only lives in
 * local state. We convert empty strings to null before any write.
 */
function sanitizeForDb<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export function useTenants(agencyId?: string | null) {
  const [tenants, setTenants] = useState<Tenant[]>(USE_SUPABASE ? [] : mockTenants);
  const [loading, setLoading] = useState(USE_SUPABASE);

  const fetchAll = useCallback(async () => {
    if (!USE_SUPABASE) { setTenants(mockTenants); setLoading(false); return; }
    if (!isUuid(agencyId)) { setTenants([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("tenants").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false });
      if (error) throw error;
      setTenants((data ?? []) as Tenant[]);
    } catch (e) { console.error("Failed to fetch tenants", e); setTenants([]); }
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const addTenant = useCallback(async (data: Omit<Tenant, "id">) => {
    const id = USE_SUPABASE ? crypto.randomUUID() : `ten-${Date.now()}`;
    const item: Tenant = { id, ...data };
    setTenants(prev => [item, ...prev]);
    if (USE_SUPABASE && isUuid(agencyId)) {
      const payload = sanitizeForDb({ ...item, agency_id: agencyId });
      const { error } = await supabase.from("tenants").insert(payload);
      if (error) {
        console.error("Failed to insert tenant", error);
        // Rollback local optimistic insert so the UI matches the DB
        setTenants(prev => prev.filter(t => t.id !== id));
        throw error;
      }
    }
    return item;
  }, [agencyId]);

  const updateTenant = useCallback(async (id: string, data: Partial<Omit<Tenant, "id">>) => {
    const prevSnapshot = tenants;
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    if (USE_SUPABASE) {
      const payload = sanitizeForDb({ ...data, updated_at: new Date().toISOString() });
      const { error } = await supabase.from("tenants").update(payload).eq("id", id);
      if (error) {
        console.error("Failed to update tenant", error);
        setTenants(prevSnapshot);
        throw error;
      }
    }
  }, [tenants]);

  const removeTenant = useCallback(async (id: string) => {
    setTenants(prev => prev.filter(t => t.id !== id));
    if (USE_SUPABASE) {
      try { await supabase.from("tenants").delete().eq("id", id); } catch (e) { console.error("Failed to delete tenant", e); }
    }
  }, []);

  const bulkInsert = useCallback(async (rows: Omit<Tenant, "id">[]) => {
    const items = rows.map(r => ({ id: USE_SUPABASE ? crypto.randomUUID() : `ten-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...r }));
    setTenants(prev => [...items, ...prev]);
    if (USE_SUPABASE && isUuid(agencyId)) {
      const payload = items.map(i => sanitizeForDb({ ...i, agency_id: agencyId }));
      const { error } = await supabase.from("tenants").insert(payload);
      if (error) {
        console.error("Failed to bulk insert tenants", error);
        const rejectedIds = new Set(items.map(i => i.id));
        setTenants(prev => prev.filter(t => !rejectedIds.has(t.id)));
        throw error;
      }
    }
    return items.length;
  }, [agencyId]);

  return { tenants, loading, addTenant, updateTenant, removeTenant, bulkInsert, refetch: fetchAll };
}
