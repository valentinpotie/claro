import { useCallback, useEffect, useState } from "react";
import { USE_SUPABASE, supabase } from "@/lib/supabase";

export type FunctionLogLevel = "info" | "warn" | "error" | "debug";

export type FunctionLog = {
  id: string;
  created_at: string;
  correlation_id: string | null;
  function_name: string;
  level: FunctionLogLevel;
  action: string;
  message: string | null;
  ticket_id: string | null;
  agency_id: string | null;
  payload: Record<string, unknown> | null;
  duration_ms: number | null;
};

export type LogFilters = {
  functionName?: string;
  level?: FunctionLogLevel;
  ticketId?: string;
  correlationId?: string;
  agencyId?: string;
  since?: string;
  limit?: number;
};

export function useFunctionLogs(filters: LogFilters = {}, autoRefresh = false) {
  const [logs, setLogs] = useState<FunctionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!USE_SUPABASE) {
      setLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("function_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 200);

      if (filters.functionName) query = query.eq("function_name", filters.functionName);
      if (filters.level) query = query.eq("level", filters.level);
      if (filters.ticketId) query = query.eq("ticket_id", filters.ticketId);
      if (filters.correlationId) query = query.eq("correlation_id", filters.correlationId);
      if (filters.agencyId) query = query.eq("agency_id", filters.agencyId);
      if (filters.since) query = query.gte("created_at", filters.since);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as FunctionLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [filters.functionName, filters.level, filters.ticketId, filters.correlationId, filters.agencyId, filters.since, filters.limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => void fetchLogs(), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}
