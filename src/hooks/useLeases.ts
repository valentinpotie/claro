import { useCallback, useEffect, useState } from "react";
import type { Lease, LeaseTenant, Owner, Property, Tenant } from "@/data/types";
import { USE_SUPABASE, supabase } from "@/lib/supabase";

const mockLeases: Lease[] = [];

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeForDb<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

type LeaseRow = Omit<Lease, "tenants" | "property"> & {
  property: (Property & { owner: Owner | null }) | null;
  lease_tenants: Array<{
    is_primary: boolean;
    exited_at: string | null;
    tenant: Tenant | null;
  }>;
};

function mapRow(row: LeaseRow): Lease {
  const prop = row.property
    ? { ...row.property, owner: row.property.owner ?? null }
    : undefined;
  return {
    ...row,
    property: prop,
    tenants: (row.lease_tenants ?? []).map<LeaseTenant>((lt) => ({
      lease_id: row.id,
      tenant_id: lt.tenant?.id ?? "",
      is_primary: lt.is_primary,
      exited_at: lt.exited_at,
      tenant: lt.tenant ?? undefined,
    })),
  };
}

export function useLeases(agencyId?: string | null) {
  const [leases, setLeases] = useState<Lease[]>(USE_SUPABASE ? [] : mockLeases);
  const [loading, setLoading] = useState(USE_SUPABASE);

  const fetchAll = useCallback(async () => {
    if (!USE_SUPABASE) { setLeases(mockLeases); setLoading(false); return; }
    if (!isUuid(agencyId)) { setLeases([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          property:properties(*, owner:owners!properties_owner_id_fkey(*)),
          lease_tenants(is_primary, exited_at, tenant:tenants(*))
        `)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeases(((data ?? []) as LeaseRow[]).map(mapRow));
    } catch (e) {
      console.error("Failed to fetch leases", e);
      setLeases([]);
    }
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Realtime — refetch on any change of the agency's leases.
  useEffect(() => {
    if (!USE_SUPABASE || !isUuid(agencyId)) return;
    const channel = supabase
      .channel(`leases:${agencyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leases", filter: `agency_id=eq.${agencyId}` }, () => { void fetchAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "lease_tenants" }, () => { void fetchAll(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [agencyId, fetchAll]);

  const createLease = useCallback(async (data: {
    property_id: string;
    start_date: string;
    end_date?: string | null;
    lease_type?: Lease["lease_type"];
    external_ref?: string | null;
    rent_amount?: number | null;
    notes?: string | null;
    is_active?: boolean;
    tenant_ids?: Array<{ id: string; is_primary: boolean }>;
  }) => {
    if (!USE_SUPABASE || !isUuid(agencyId)) return null;
    const payload = sanitizeForDb({
      agency_id: agencyId,
      property_id: data.property_id,
      lease_type: data.lease_type ?? "residential",
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      external_ref: data.external_ref ?? null,
      rent_amount: data.rent_amount ?? null,
      notes: data.notes ?? null,
      is_active: data.is_active ?? true,
    });
    const { data: inserted, error } = await supabase.from("leases").insert(payload).select("id").single();
    if (error) throw error;
    if (data.tenant_ids && data.tenant_ids.length > 0) {
      await supabase.from("lease_tenants").insert(data.tenant_ids.map(t => ({
        lease_id: inserted.id, tenant_id: t.id, is_primary: t.is_primary,
      })));
    }
    await fetchAll();
    return inserted.id as string;
  }, [agencyId, fetchAll]);

  const updateLease = useCallback(async (id: string, data: Partial<Omit<Lease, "id" | "agency_id" | "tenants" | "property" | "created_at" | "updated_at">>) => {
    if (!USE_SUPABASE) return;
    const payload = sanitizeForDb({ ...data, updated_at: new Date().toISOString() });
    const { error } = await supabase.from("leases").update(payload).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteLease = useCallback(async (id: string) => {
    if (!USE_SUPABASE) return;
    setLeases(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from("leases").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete lease", error);
      await fetchAll();
      throw error;
    }
  }, [fetchAll]);

  const addTenantToLease = useCallback(async (leaseId: string, tenantId: string, isPrimary = false) => {
    if (!USE_SUPABASE) return;
    if (isPrimary) {
      // Only one primary at a time: demote previous primary first.
      await supabase.from("lease_tenants").update({ is_primary: false }).eq("lease_id", leaseId).eq("is_primary", true);
    }
    const { error } = await supabase.from("lease_tenants").insert({ lease_id: leaseId, tenant_id: tenantId, is_primary: isPrimary });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const removeTenantFromLease = useCallback(async (leaseId: string, tenantId: string) => {
    if (!USE_SUPABASE) return;
    const { error } = await supabase.from("lease_tenants").delete().eq("lease_id", leaseId).eq("tenant_id", tenantId);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const setPrimaryTenant = useCallback(async (leaseId: string, tenantId: string) => {
    if (!USE_SUPABASE) return;
    await supabase.from("lease_tenants").update({ is_primary: false }).eq("lease_id", leaseId);
    const { error } = await supabase.from("lease_tenants").update({ is_primary: true }).eq("lease_id", leaseId).eq("tenant_id", tenantId);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return {
    leases, loading,
    createLease, updateLease, deleteLease,
    addTenantToLease, removeTenantFromLease, setPrimaryTenant,
    refetch: fetchAll,
  };
}
