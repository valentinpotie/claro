import { useState } from "react";
import { TicketMessage } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";

interface Props {
  artisanNom: string;
  messages: TicketMessage[];
  onSend: (content: string) => void;
}

export function MessageThread({ artisanNom, messages, onSend }: Props) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <Card className="border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Échanges avec {artisanNom}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun message</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`p-2.5 rounded-[4px] text-sm ${msg.from === "agence" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {msg.from === "agence" ? "Vous" : artisanNom}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Décrivez votre demande à l'artisan…" className="min-h-[60px] text-sm"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
