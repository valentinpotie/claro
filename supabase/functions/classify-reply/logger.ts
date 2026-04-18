// Shared logger for all Claro edge functions.
// Writes to public.function_logs so the /debug/logs page can display them.
//
// Usage inside an edge function:
//
//   const log = createLogger("send-ticket-email", supabase);
//   await log.info("fetched-template", { templateId, useCase });
//   await log.error("resend-failed", { error: err.message }, { ticketId });
//   log.flush(); // optional — fire-and-forget batch at the end
//
// Every invocation gets a unique correlation_id so the debug UI can group the
// related logs together. Pass `correlationId` in the constructor if you want
// to link logs across functions (e.g. inbound-email -> classify-reply).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  correlation_id: string;
  function_name: string;
  level: LogLevel;
  action: string;
  message: string | null;
  ticket_id: string | null;
  agency_id: string | null;
  payload: Record<string, unknown> | null;
  duration_ms: number | null;
};

export type LogContext = {
  ticketId?: string | null;
  agencyId?: string | null;
  message?: string;
  durationMs?: number;
};

export function createLogger(
  functionName: string,
  supabase: SupabaseClient,
  correlationId?: string,
) {
  const corr = correlationId ?? crypto.randomUUID();
  const queue: LogEntry[] = [];
  const startedAt = Date.now();

  const write = (level: LogLevel, action: string, payload?: Record<string, unknown>, ctx: LogContext = {}) => {
    const entry: LogEntry = {
      correlation_id: corr,
      function_name: functionName,
      level,
      action,
      message: ctx.message ?? null,
      ticket_id: ctx.ticketId ?? null,
      agency_id: ctx.agencyId ?? null,
      payload: payload ?? null,
      duration_ms: ctx.durationMs ?? null,
    };
    queue.push(entry);
    // Best-effort console echo for edge function stdout
    const prefix = `[${functionName}/${corr.slice(0, 8)}] ${level.toUpperCase()} ${action}`;
    if (level === "error") console.error(prefix, payload ?? "");
    else if (level === "warn") console.warn(prefix, payload ?? "");
    else console.log(prefix, payload ?? "");
  };

  return {
    correlationId: corr,
    info:  (action: string, payload?: Record<string, unknown>, ctx?: LogContext) => write("info",  action, payload, ctx),
    warn:  (action: string, payload?: Record<string, unknown>, ctx?: LogContext) => write("warn",  action, payload, ctx),
    error: (action: string, payload?: Record<string, unknown>, ctx?: LogContext) => write("error", action, payload, ctx),
    debug: (action: string, payload?: Record<string, unknown>, ctx?: LogContext) => write("debug", action, payload, ctx),
    /**
     * Flushes the queued logs to Supabase. Safe to call multiple times
     * (subsequent calls with no new entries are no-ops).
     * Always await this at the end of your handler.
     */
    async flush() {
      if (queue.length === 0) return;
      const batch = queue.splice(0, queue.length);
      const { error } = await supabase.from("function_logs").insert(batch);
      if (error) {
        console.error(`[${functionName}] Failed to flush ${batch.length} logs:`, error.message);
        // On failure, re-queue so a later flush() can retry
        queue.unshift(...batch);
      }
    },
    elapsedMs() {
      return Date.now() - startedAt;
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
