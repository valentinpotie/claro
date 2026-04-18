import { useEffect, useRef, useState } from "react";
import { TicketMessage, EmailTemplate } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Send, Settings } from "lucide-react";

interface Props {
  messages: TicketMessage[];
  templates: EmailTemplate[];
  onSend: (content: string, subject: string, templateId?: string) => void;
  onManageTemplates: () => void;
  senderLabel?: string;
  receiverLabel?: string;
  defaultSubject?: string;
}

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function DiscussionThread({
  messages,
  templates,
  onSend,
  onManageTemplates,
  senderLabel = "Vous",
  receiverLabel = "Interlocuteur",
  defaultSubject = "",
}: Props) {
  const [body, setBody]                     = useState("");
  const [subject, setSubject]               = useState(defaultSubject);
  const [activeTemplate, setActiveTemplate] = useState<string | undefined>();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset compose fields when the thread changes (e.g. switching artisans)
  useEffect(() => {
    setSubject(defaultSubject);
    setBody("");
    setActiveTemplate(undefined);
  }, [defaultSubject]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  // Auto-resize: triggered by useEffect so it also catches programmatic body changes (template fill)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  }, [body]);

  // True once the thread has at least one prior message → we reuse its subject to keep
  // Gmail/Outlook threading intact instead of exposing a subject field to the user.
  const hasExistingThread = messages.length > 0 && defaultSubject.trim().length > 0;

  const handlePickTemplate = (tpl: EmailTemplate) => {
    // In an existing thread, ignore the template's subject (would break threading).
    // Only the body is applied; the subject stays locked to the thread's subject.
    if (!hasExistingThread) setSubject(tpl.subject);
    setBody(tpl.body);
    setActiveTemplate(tpl.id);
  };

  const handleSend = () => {
    if (!body.trim()) return;
    // In an existing thread, the subject input is hidden — always send with defaultSubject.
    // In a new thread, use what the user typed, fall back to default if left blank.
    const effectiveSubject = hasExistingThread
      ? defaultSubject.trim()
      : (subject.trim() || defaultSubject.trim());
    onSend(body.trim(), effectiveSubject, activeTemplate);
    setBody("");
    setSubject(defaultSubject);
    setActiveTemplate(undefined);
  };

  return (
    <div className="space-y-3">
      {/* Message list */}
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-5">
          Aucun échange pour l'instant
        </p>
      ) : (
        <div ref={scrollRef} className="space-y-3 max-h-64 overflow-y-auto pr-0.5">
          {messages.map(msg => {
            const isOut = msg.direction ? msg.direction === "outbound" : msg.from === "agence";
            return (
              <div key={msg.id} className={`flex flex-col gap-1 ${isOut ? "items-end" : "items-start"}`}>
                {/* Meta row */}
                <p className="text-xs text-muted-foreground px-1">
                  <span className="font-medium">{isOut ? senderLabel : receiverLabel}</span>
                  {" · "}
                  {fmt(msg.timestamp)}
                </p>
                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                    isOut ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  {msg.subject && (
                    <p className="text-xs text-muted-foreground italic mb-1.5 truncate">
                      {msg.subject}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose — background-only separation, no visible borders */}
      <div className="rounded-lg bg-muted/40 overflow-hidden shadow-[0_0_0_1px_hsl(var(--border)/0.25)]">
        {hasExistingThread ? (
          // Thread already has messages → hide the subject field and show the locked subject
          // discreetly, so the user knows where their reply is going and threading stays intact.
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground/80 truncate"
               title={`Votre réponse sera envoyée dans la conversation « ${defaultSubject} »`}>
            Re: <span className="italic">{defaultSubject}</span>
          </div>
        ) : (
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={defaultSubject || "Objet..."}
            className="border-0 rounded-none h-9 px-3 text-sm focus-visible:ring-0 bg-transparent"
          />
        )}
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Votre message..."
          className="border-0 rounded-none text-sm resize-none px-3 py-2 focus-visible:ring-0 bg-transparent overflow-y-auto"
          style={{ minHeight: "36px", height: "36px", maxHeight: "280px" }}
          rows={1}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        {/* Footer — slightly darker bg for visual separation, no border */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                Modèles de réponse <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 flex flex-col p-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 max-h-60 p-1">
                {templates.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Aucun modèle configuré
                  </div>
                )}
                {templates.map(tpl => (
                  <DropdownMenuItem
                    key={tpl.id}
                    onSelect={() => handlePickTemplate(tpl)}
                    className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
                  >
                    <span className="text-sm font-medium">{tpl.name}</span>
                    {tpl.useCase && (
                      <span className="text-[11px] text-muted-foreground">{tpl.useCase}</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
              <div className="border-t p-1 bg-background sticky bottom-0">
              <DropdownMenuItem
                onSelect={onManageTemplates}
                className="gap-2 text-xs text-muted-foreground cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                Gérer les modèles
              </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleSend}
            disabled={!body.trim()}
          >
            Envoyer <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
