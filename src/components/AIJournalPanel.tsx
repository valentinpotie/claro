import { useState, useEffect, useRef } from "react";
import { useTickets } from "@/contexts/TicketContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, CheckCircle2, Loader2, Send, Brain, Zap, Search, MousePointerClick, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const typeIcons: Record<string, React.ElementType> = {
  analysis: Brain, message_sent: Send, notification: Zap,
  action: CheckCircle2, validation: CheckCircle2, matching: Search,
};

const typeLabels: Record<string, string> = {
  analysis: "Analyse", message_sent: "Message", notification: "Notification",
  action: "Action", validation: "Validation", matching: "Matching",
};

export function AIJournalPanel() {
  const { journalEntries, showJournal, setShowJournal, activeTicketId, getTicket } = useTickets();
  const ticket = activeTicketId ? getTicket(activeTicketId) : null;
  const entries = journalEntries.filter(e => e.ticketId === activeTicketId);
  const allDone = entries.length > 0 && entries.every(e => e.status === "done");
  const [settled, setSettled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const endRef = useRef<HTMLDivElement>(null);

  // Wait 1.8s after allDone stays true to confirm no more entries are coming
  useEffect(() => {
    clearTimeout(settleTimer.current);
    if (allDone && showJournal) {
      settleTimer.current = setTimeout(() => setSettled(true), 1800);
    } else {
      setSettled(false);
    }
    return () => clearTimeout(settleTimer.current);
  }, [allDone, showJournal, entries.length]);

  // Show overlay hint after settled
  useEffect(() => {
    if (settled) {
      const timer = setTimeout(() => setShowHint(true), 400);
      return () => clearTimeout(timer);
    }
    setShowHint(false);
  }, [settled]);

  useEffect(() => {
    if (showJournal) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  }, [showJournal, entries.length]);

  return (
    <Sheet open={showJournal} onOpenChange={setShowJournal}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 bg-primary/10 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[4px] bg-primary/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Agent Claro — Journal d'actions</SheetTitle>
              {ticket && <p className="text-xs text-muted-foreground mt-0.5">{ticket.reference} · {ticket.titre}</p>}
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-3">
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune action pour ce ticket</p>
            )}
            {entries.map((entry, i) => {
              const Icon = typeIcons[entry.type] || Zap;
              return (
                <div key={entry.id} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`h-8 w-8 rounded-[4px] flex items-center justify-center shrink-0 bg-primary/10`}>
                    {entry.status === "in_progress" ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Icon className={`h-4 w-4 text-primary`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 bg-muted">
                        {typeLabels[entry.type]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{entry.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </ScrollArea>
        {settled && (
          <div className="px-6 py-4 border-t bg-muted/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={() => setShowJournal(false)}
              className="w-full flex items-center justify-center gap-2 rounded-[4px] bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[hsl(var(--primary-hover))]"
            >
              Accéder au ticket <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </SheetContent>
      {showHint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ right: "480px" }}
        >
          <div className="flex items-center gap-2.5 rounded-full bg-white/95 backdrop-blur px-5 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-500">
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Cliquez ici pour continuer</span>
          </div>
        </div>
      )}
    </Sheet>
  );
}
