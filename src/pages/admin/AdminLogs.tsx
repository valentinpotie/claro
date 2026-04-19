import { useMemo, useState } from "react";
import { useFunctionLogs, FunctionLogLevel, FunctionLog } from "@/hooks/useFunctionLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Bug, Building2, ChevronRight, Info, RefreshCcw, Ticket as TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusLabels, TicketStatus } from "@/data/types";
import { useAdminResolvers } from "@/hooks/useAdminResolvers";

const LEVEL_META: Record<FunctionLogLevel, { label: string; color: string; icon: typeof Info }> = {
  info:  { label: "Info",  color: "text-foreground bg-muted",                   icon: Info },
  warn:  { label: "Warn",  color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300", icon: AlertTriangle },
  error: { label: "Error", color: "text-destructive bg-destructive/10",        icon: AlertCircle },
  debug: { label: "Debug", color: "text-muted-foreground bg-muted/50",         icon: Bug },
};

type RangeKey = "1h" | "24h" | "7d" | "all";
const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "1h", label: "Dernière heure" },
  { value: "24h", label: "Dernières 24 h" },
  { value: "7d", label: "7 derniers jours" },
  { value: "all", label: "Tout" },
];
const sinceFor = (r: RangeKey): string | undefined => {
  const now = Date.now();
  if (r === "1h") return new Date(now - 3600_000).toISOString();
  if (r === "24h") return new Date(now - 24 * 3600_000).toISOString();
  if (r === "7d") return new Date(now - 7 * 24 * 3600_000).toISOString();
  return undefined;
};

/** Viewer des logs edge functions cross-agences. Filtre par agence, période,
 *  fonction, niveau, ticket (CLR-XX ou UUID). Groupe par correlation_id. */
export default function AdminLogs() {
  const { agencies, tickets, agenciesById, ticketsById } = useAdminResolvers();
  const [functionName, setFunctionName] = useState("all");
  const [level, setLevel] = useState("all");
  const [agencyId, setAgencyId] = useState("all");
  const [range, setRange] = useState<RangeKey>("24h");
  const [ticketQuery, setTicketQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const resolvedTicketId = useMemo(() => {
    const q = ticketQuery.trim();
    if (!q) return undefined;
    if (/^[0-9a-f]{8}-/i.test(q)) return q;
    return tickets.find(t => t.reference && t.reference.toLowerCase() === q.toLowerCase())?.id;
  }, [ticketQuery, tickets]);

  const ticketQueryInvalid = !!ticketQuery.trim() && !resolvedTicketId;

  const filters = useMemo(() => ({
    functionName: functionName === "all" ? undefined : functionName,
    level: level === "all" ? undefined : (level as FunctionLogLevel),
    agencyId: agencyId === "all" ? undefined : agencyId,
    ticketId: resolvedTicketId,
    since: sinceFor(range),
    limit: 500,
  }), [functionName, level, agencyId, resolvedTicketId, range]);

  const { logs, loading, error, refetch } = useFunctionLogs(filters, autoRefresh);

  const kpi = useMemo(() => ({
    total: logs.length,
    errors: logs.filter(l => l.level === "error").length,
    warns: logs.filter(l => l.level === "warn").length,
    agencies: new Set(logs.map(l => l.agency_id).filter(Boolean)).size,
    tickets: new Set(logs.map(l => l.ticket_id).filter(Boolean)).size,
  }), [logs]);

  const grouped = useMemo(() => {
    const byCorrelation = new Map<string, FunctionLog[]>();
    const orphans: FunctionLog[] = [];
    for (const log of logs) {
      if (!log.correlation_id) { orphans.push(log); continue; }
      const arr = byCorrelation.get(log.correlation_id) ?? [];
      arr.push(log);
      byCorrelation.set(log.correlation_id, arr);
    }
    const groups = Array.from(byCorrelation.entries()).map(([id, entries]) => {
      const sorted = entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const first = sorted[0];
      const ticketIdFromLogs = sorted.map(e => e.ticket_id).find(Boolean) ?? null;
      const agencyIdFromLogs = sorted.map(e => e.agency_id).find(Boolean) ?? null;
      const ticket = ticketIdFromLogs ? ticketsById[ticketIdFromLogs] : null;
      const agency = agencyIdFromLogs ? agenciesById[agencyIdFromLogs] : (ticket?.agency_id ? agenciesById[ticket.agency_id] : null);
      return { id, entries: sorted, first, ticket, agency };
    });
    groups.sort((a, b) => b.first.created_at.localeCompare(a.first.created_at));
    return { groups, orphans };
  }, [logs, agenciesById, ticketsById]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Edge functions — filtrage cross-agences et corrélation par run.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto" className="text-xs">Auto-refresh 5s</Label>
          </div>
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={loading} className="gap-1.5">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Logs", value: kpi.total, color: "text-foreground" },
          { label: "Erreurs", value: kpi.errors, color: kpi.errors > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Warnings", value: kpi.warns, color: kpi.warns > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground" },
          { label: "Agences actives", value: kpi.agencies, color: "text-foreground" },
          { label: "Tickets touchés", value: kpi.tickets, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-[4px] px-4 py-3 flex flex-col gap-1" style={{ boxShadow: "0 20px 60px -10px hsl(180 5% 11% / 0.06)" }}>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
            <span className={cn("text-2xl font-bold font-display leading-none tabular-nums", color)}>{value}</span>
          </div>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 flex gap-3 flex-wrap">
          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger className="w-52">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes agences</SelectItem>
              {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name ?? a.id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={functionName} onValueChange={setFunctionName}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Toutes les fonctions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les fonctions</SelectItem>
              <SelectItem value="inbound-email">inbound-email</SelectItem>
              <SelectItem value="send-ticket-email">send-ticket-email</SelectItem>
              <SelectItem value="classify-reply">classify-reply</SelectItem>
              <SelectItem value="send-reminders">send-reminders</SelectItem>
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tous niveaux" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 min-w-[220px] max-w-md relative">
            <TicketIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Référence CLR-XX ou UUID ticket"
              value={ticketQuery}
              onChange={(e) => setTicketQuery(e.target.value)}
              className={cn("pl-8", ticketQueryInvalid && "border-destructive/50")}
            />
            {ticketQueryInvalid && (
              <p className="text-[10px] text-destructive mt-1">Aucun ticket trouvé pour « {ticketQuery.trim()} »</p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-0 shadow-sm bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      )}

      {logs.length === 0 && !loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Aucun log pour ces critères. Ajustez la période ou les filtres.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {grouped.groups.map((group) => {
          const hasError = group.entries.some(e => e.level === "error");
          const hasWarn = group.entries.some(e => e.level === "warn");
          const isExpanded = expanded.has(group.id);
          return (
            <Card key={group.id} className={cn("border-0 shadow-sm transition-colors", hasError && "ring-1 ring-destructive/30")}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpanded(group.id)}>
                <div className="flex items-start gap-3">
                  <ChevronRight className={cn("h-4 w-4 shrink-0 mt-1 transition-transform", isExpanded && "rotate-90")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-muted-foreground tabular-nums">{new Date(group.first.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary font-mono">{group.first.function_name}</Badge>
                      <span className="text-sm font-medium truncate">{group.first.action}</span>
                      <span className="text-xs text-muted-foreground">— {group.entries.length} étape{group.entries.length > 1 ? "s" : ""}</span>
                      {hasError && <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">erreur</Badge>}
                      {!hasError && hasWarn && <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">warn</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {group.agency && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="font-medium text-foreground">{group.agency.name ?? group.agency.id.slice(0, 8)}</span>
                        </span>
                      )}
                      {group.ticket && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <TicketIcon className="h-3 w-3" />
                          <span className="font-mono text-foreground">{group.ticket.reference}</span>
                          {group.ticket.title && <span className="text-muted-foreground truncate max-w-[280px]">· {group.ticket.title}</span>}
                          {group.ticket.status && (
                            <Badge variant="secondary" className="text-[10px]">{statusLabels[group.ticket.status as TicketStatus] ?? group.ticket.status}</Badge>
                          )}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{group.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-l-2 border-muted ml-2 pl-4 space-y-2">
                    {group.entries.map(entry => <LogRow key={entry.id} entry={entry} />)}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {grouped.orphans.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Logs sans correlation_id</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.orphans.map(entry => <LogRow key={entry.id} entry={entry} />)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: FunctionLog }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_META[entry.level];
  const Icon = meta.icon;
  const hasPayload = entry.payload && Object.keys(entry.payload).length > 0;
  return (
    <div className="rounded-[4px] border border-border/60 bg-card/50 text-xs">
      <button
        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
        disabled={!hasPayload && !entry.message}
      >
        <span className={cn("rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] shrink-0 flex items-center gap-1", meta.color)}>
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        <span className="text-muted-foreground tabular-nums shrink-0">{new Date(entry.created_at).toLocaleTimeString("fr-FR", { hour12: false })}</span>
        <span className="flex-1 font-medium">{entry.action}</span>
        {entry.duration_ms != null && <span className="text-muted-foreground shrink-0">{entry.duration_ms}ms</span>}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {entry.message && <p className="text-muted-foreground whitespace-pre-wrap">{entry.message}</p>}
          {entry.ticket_id && <p className="text-muted-foreground">ticket_id: <span className="font-mono">{entry.ticket_id}</span></p>}
          {hasPayload && (
            <ScrollArea className="max-h-[300px]">
              <pre className="bg-muted/50 rounded-[3px] p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
