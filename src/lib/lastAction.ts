/** Utilities around ticket.lastActionAt — the staleness clock used by Phase 1 tracking
 *  (UI chip + urgent-to-call badge) and later by the Phase 2 auto-reminder cron. */

export function daysSince(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Short chip label: "aujourd'hui", "hier", "il y a 3 j" */
export function formatLastAction(iso: string | undefined | null): string | null {
  const n = daysSince(iso);
  if (n == null) return null;
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "hier";
  return `il y a ${n} j`;
}
