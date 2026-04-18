import { useMemo, useState } from "react";
import { useFunctionLogs, FunctionLogLevel } from "@/hooks/useFunctionLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, RefreshCcw, Terminal, AlertCircle, AlertTriangle, Info, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVEL_META: Record<FunctionLogLevel, { label: string; color: string; icon: typeof Info }> = {
  info:  { label: "Info",  color: "text-foreground bg-muted",                   icon: Info },
  warn:  { label: "Warn",  color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300", icon: AlertTriangle },
  error: { label: "Error", color: "text-destructive bg-destructive/10",        icon: AlertCircle },
  debug: { label: "Debug", color: "text-muted-foreground bg-muted/50",         icon: Bug },
};

export default function DebugLogs() {
  const [functionName, setFunctionName] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [ticketId, setTicketId] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filters = useMemo(() => ({
    functionName: functionName === "all" ? undefined : functionName,
    level: level === "all" ? undefined : (level as FunctionLogLevel),
    ticketId: ticketId.trim() || undefined,
    limit: 300,
  }), [functionName, level, ticketId]);

  const { logs, loading, error, refetch } = useFunctionLogs(filters, autoRefresh);

  const grouped = useMemo(() => {
    const byCorrelation = new Map<string, typeof logs>();
    const orphans: typeof logs = [];
    for (const log of logs) {
      if (!log.correlation_id) {
        orphans.push(log);
        continue;
      }
      const arr = byCorrelation.get(log.correlation_id) ?? [];
      arr.push(log);
      byCorrelation.set(log.correlation_id, arr);
    }
    const groups = Array.from(byCorrelation.entries()).map(([id, entries]) => ({
      id,
      entries: entries.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }));
    groups.sort((a, b) => b.entries[0].created_at.localeCompare(a.entries[0].created_at));
    return { groups, orphans };
  }, [logs]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Debug — Edge Functions</h1>
          <Badge variant="outline" className="text-[10px]">{logs.length} logs</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto" className="text-xs">Auto-refresh (5s)</Label>
          </div>
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={loading} className="gap-1.5">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Actualiser
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 flex gap-3 flex-wrap">
          <Select value={functionName} onValueChange={setFunctionName}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Toutes les fonctions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les fonctions</SelectItem>
              <SelectItem value="inbound-email">inbound-email</SelectItem>
              <SelectItem value="send-ticket-email">send-ticket-email</SelectItem>
              <SelectItem value="classify-reply">classify-reply</SelectItem>
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tous niveaux" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Filtrer par ticket_id (UUID)"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="flex-1 min-w-[240px] max-w-md"
          />
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
            Aucun log pour ces critères. Les edge functions alimenteront cette vue dès leur premier appel.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {grouped.groups.map((group) => {
          const first = group.entries[0];
          const hasError = group.entries.some((e) => e.level === "error");
          const isExpanded = expanded.has(group.id);
          return (
            <Card key={group.id} className={cn("border-0 shadow-sm transition-colors", hasError && "ring-1 ring-destructive/30")}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpanded(group.id)}>
                <div className="flex items-center gap-3">
                  <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", isExpanded && "rotate-90")} />
                  <CardTitle className="text-sm font-mono flex-1 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{new Date(first.created_at).toLocaleTimeString("fr-FR")}</span>
                    <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">{first.function_name}</Badge>
                    <span className="text-sm font-medium">{first.action}</span>
                    <span className="text-xs text-muted-foreground">— {group.entries.length} étape{group.entries.length > 1 ? "s" : ""}</span>
                    {hasError && <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">erreur</Badge>}
                  </CardTitle>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-l-2 border-muted ml-2 pl-4 space-y-2">
                    {group.entries.map((entry) => <LogRow key={entry.id} entry={entry} />)}
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
              {grouped.orphans.map((entry) => <LogRow key={entry.id} entry={entry} />)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: ReturnType<typeof useFunctionLogs>["logs"][number] }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_META[entry.level];
  const Icon = meta.icon;
  const hasPayload = entry.payload && Object.keys(entry.payload).length > 0;
  return (
    <div className="rounded-[4px] border border-border/60 bg-card/50 text-xs">
      <button
        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
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
