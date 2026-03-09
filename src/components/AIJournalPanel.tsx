import { useTickets } from "@/contexts/TicketContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, CheckCircle2, Loader2, Send, Brain, Zap, Search } from "lucide-react";
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

  return (
    <Sheet open={showJournal} onOpenChange={setShowJournal}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-base">Agent IA — Journal d'actions</SheetTitle>
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
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${entry.status === "done" ? "bg-success/15" : "bg-primary/10"}`}>
                    {entry.status === "in_progress" ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Icon className={`h-4 w-4 ${entry.status === "done" ? "text-success" : "text-primary"}`} />
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
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
