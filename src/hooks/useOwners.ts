import { useCallback, useEffect, useState } from "react";
import type { Owner } from "@/data/types";
import { USE_SUPABASE, supabase } from "@/lib/supabase";

const mockOwners: Owner[] = [
  { id: "own-1", first_name: "Bernard", last_name: "Dupont", email: "bernard.dupont@email.fr", phone: "06 11 22 33 44", validation_threshold: 500, prefers_phone: false },
  { id: "own-2", first_name: "Claire", last_name: "Perrin", email: "claire.perrin@email.fr", phone: "06 22 33 44 55", validation_threshold: 300, prefers_phone: true },
  { id: "own-3", first_name: "Marc", last_name: "Lefevre", email: "marc.lefevre@email.fr", phone: "06 99 88 77 66", validation_threshold: 1000, prefers_phone: false },
];

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function useOwners(agencyId?: string | null) {
  const [owners, setOwners] = useState<Owner[]>(USE_SUPABASE ? [] : mockOwners);
  const [loading, setLoading] = useState(USE_SUPABASE);

  const fetchAll = useCallback(async () => {
    if (!USE_SUPABASE) { setOwners(mockOwners); setLoading(false); return; }
    if (!isUuid(agencyId)) { setOwners([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("owners").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false });
      if (error) throw error;
      setOwners((data ?? []) as Owner[]);
    } catch (e) { console.error("Failed to fetch owners", e); setOwners([]); }
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const addOwner = useCallback(async (data: Omit<Owner, "id">) => {
    const id = USE_SUPABASE ? crypto.randomUUID() : `own-${Date.now()}`;
    const item: Owner = { id, ...data };
    setOwners(prev => [item, ...prev]);
    if (USE_SUPABASE && isUuid(agencyId)) {
      try { await supabase.from("owners").insert({ ...item, agency_id: agencyId }); } catch (e) { console.error("Failed to insert owner", e); }
    }
    return item;
  }, [agencyId]);

  const updateOwner = useCallback(async (id: string, data: Partial<Omit<Owner, "id">>) => {
    setOwners(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    if (USE_SUPABASE) {
      try { await supabase.from("owners").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id); } catch (e) { console.error("Failed to update owner", e); }
    }
  }, []);

  const removeOwner = useCallback(async (id: string) => {
    setOwners(prev => prev.filter(o => o.id !== id));
    if (USE_SUPABASE) {
      try { await supabase.from("owners").delete().eq("id", id); } catch (e) { console.error("Failed to delete owner", e); }
    }
  }, []);

  const bulkInsert = useCallback(async (rows: Omit<Owner, "id">[]) => {
    const items = rows.map(r => ({ id: USE_SUPABASE ? crypto.randomUUID() : `own-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...r }));
    setOwners(prev => [...items, ...prev]);
    if (USE_SUPABASE && isUuid(agencyId)) {
      try { await supabase.from("owners").insert(items.map(i => ({ ...i, agency_id: agencyId }))); } catch (e) { console.error("Failed to bulk insert owners", e); }
    }
    return items.length;
  }, [agencyId]);

  return { owners, loading, addOwner, updateOwner, removeOwner, bulkInsert, refetch: fetchAll };
}
