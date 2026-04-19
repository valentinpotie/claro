/** Entity display name resolution — single source of truth for UI rendering.
 *  Owners were extended with legal_type / company_name / display_name to support SCI,
 *  SARL and indivisions. Tenants will follow in a later migration. */

import type { Lease, LeaseTenant, Owner, Tenant } from "@/data/types";

export function ownerDisplayName(o: Partial<Owner>): string {
  if (o.display_name) return o.display_name;
  if (o.company_name) return o.company_name;
  const parts = [o.civility, o.first_name, o.last_name].filter(Boolean).join(" ").trim();
  return parts || "Sans nom";
}

export function tenantDisplayName(t: Partial<Tenant>): string {
  // Tenants keep the classic first+last for now. Extended when leases/colocation land.
  const parts = [t.first_name, t.last_name].filter(Boolean).join(" ").trim();
  return parts || "Sans nom";
}

/** Returns the primary tenant of a lease (is_primary=true). Falls back to the first
 *  lease_tenants row if no explicit primary is set (shouldn't happen post-backfill). */
export function resolveLeasePrimaryTenant(lease: Pick<Lease, "tenants">): LeaseTenant | null {
  const list = lease.tenants ?? [];
  if (list.length === 0) return null;
  return list.find((lt) => lt.is_primary) ?? list[0];
}
