import { useCallback, useEffect, useState } from "react";
import type { Property } from "@/data/types";
import { USE_SUPABASE, supabase } from "@/lib/supabase";

const mockProperties: Property[] = [
  { id: "prop-1", address: "12 rue des Lilas", city: "Lyon", postal_code: "69003", unit_number: "Apt 2A", floor: "2", building_name: "Résidence Les Lilas", door_code: "A1234", external_ref: "P-001" },
  { id: "prop-2", address: "8 avenue Jean Jaurès", city: "Lyon", postal_code: "69007", unit_number: "Apt 5B", floor: "5", building_name: "", door_code: "B5678", external_ref: "P-002" },
  { id: "prop-3", address: "3 place Bellecour", city: "Lyon", postal_code: "69002", unit_number: "Studio 1", floor: "RDC", building_name: "Le Bellecour", door_code: "", external_ref: "P-003" },
];

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Postgres rejects "" for DATE / constrained columns → ghost rows. Convert "" → null before writes.
function sanitizeForDb<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === "" ? null : v;
  return out as T;
}

export function useProperties(agencyId?: string | null) {
  const [properties, setProperties] = useState<Property[]>(USE_SUPABASE ? [] : mockProperties);
  const [loading, setLoading] = useState(USE_SUPABASE);

  const fetchAll = useCallback(async () => {
    if (!USE_SUPABASE) { setProperties(mockProperties); setLoading(false); return; }
    if (!isUuid(agencyId)) { setProperties([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("properties").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false });
      if (error) throw error;
      setProperties((data ?? []) as Property[]);
    } catch (e) { console.error("Failed to fetch properties", e); setProperties([]); }
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const addProperty = useCallback(async (data: Omit<Property, "id">) => {
    const id = USE_SUPABASE ? crypto.randomUUID() : `prop-${Date.now()}`;
    const item: Property = { id, ...data };
    setProperties(prev => [item, ...prev]);
    if (USE_SUPABASE && isUuid(agencyId)) {
      const { error } = await supabase.from("properties").insert(sanitizeForDb({ ...item, agency_id: agencyId }));
      if (error) {
        console.error("Failed to insert property", error);
        setProperties(prev => prev.filter(p => p.id !== id));
        throw error;
      }
    }
    return item;
  }, [agencyId]);

  const updateProperty = useCallback(async (id: string, data: Partial<Omit<Property, "id">>) => {
    const prevSnapshot = properties;
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    if (USE_SUPABASE) {
      const { error } = await supabase.from("properties").update(sanitizeForDb({ ...data, updated_at: new Date().toISOString() })).eq("id", id);
      if (error) {
        console.error("Failed to update property", error);
        setProperties(prevSnapshot);
        throw error;
      }
    }
  }, [properties]);

  const removeProperty = useCallback(async (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    if (USE_SUPABASE) {
      try { await supabase.from("properties").delete().eq("id", id); } catch (e) { console.error("Failed to delete property", e); }
    }
  }, []);

  const bulkInsert = useCallback(async (rows: Omit<Property, "id">[]) => {
    const items = rows.map(r => ({ id: USE_SUPABASE ? crypto.randomUUID() : `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...r }));
    setProperties(prev => [...items, ...prev]);
    if (USE_SUPABASE && isUuid(agencyId)) {
      const payload = items.map(i => sanitizeForDb({ ...i, agency_id: agencyId }));
      const { error } = await supabase.from("properties").insert(payload);
      if (error) {
        console.error("Failed to bulk insert properties", error);
        const rejectedIds = new Set(items.map(i => i.id));
        setProperties(prev => prev.filter(p => !rejectedIds.has(p.id)));
        throw error;
      }
    }
    return items.length;
  }, [agencyId]);

  return { properties, loading, addProperty, updateProperty, removeProperty, bulkInsert, refetch: fetchAll };
}
