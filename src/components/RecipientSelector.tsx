import { useState, useMemo, KeyboardEvent } from "react";
import { Ticket, Artisan } from "@/data/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Send } from "lucide-react";

export interface Recipient {
  role: "tenant" | "owner" | "artisan" | "syndic" | "accountant" | "custom";
  name: string;
  email: string;
}

interface Props {
  ticket: Ticket;
  artisans: Artisan[];
  accountantEmail?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSend: (recipients: Recipient[], subject: string, body: string) => void;
}

const roleLabel: Record<Recipient["role"], string> = {
  tenant:     "Locataire",
  owner:      "Propriétaire",
  artisan:    "Artisan",
  syndic:     "Syndic",
  accountant: "Comptabilité",
  custom:     "Autre",
};

export function RecipientSelector({ ticket, artisans, accountantEmail, defaultSubject = "", defaultBody = "", onSend }: Props) {
  const artisan = ticket.artisanId ? artisans.find(a => a.id === ticket.artisanId) : null;

  const staticRecipients = useMemo((): (Recipient & { defaultChecked: boolean })[] => {
    const rows: (Recipient & { defaultChecked: boolean })[] = [];
    if (ticket.locataire.email)   rows.push({ role: "tenant",     name: ticket.locataire.nom || "Locataire",         email: ticket.locataire.email,      defaultChecked: true });
    if (ticket.bien.emailProprio) rows.push({ role: "owner",      name: ticket.bien.proprietaire || "Propriétaire",  email: ticket.bien.emailProprio,     defaultChecked: true });
    if (artisan?.email)           rows.push({ role: "artisan",    name: artisan.nom,                                 email: artisan.email,                defaultChecked: false });
    if (ticket.syndic?.email && ticket.syndic?.nom)
                                  rows.push({ role: "syndic",     name: ticket.syndic.nom,                           email: ticket.syndic.email,          defaultChecked: false });
    if (accountantEmail)          rows.push({ role: "accountant", name: "Comptabilité",                              email: accountantEmail,              defaultChecked: true });
    return rows;
  }, [ticket, artisan, accountantEmail]);

  const [checked, setChecked]       = useState<Record<string, boolean>>(() => Object.fromEntries(staticRecipients.map(r => [r.role, r.defaultChecked])));
  const [customInput, setCustomInput] = useState("");
  const [customs, setCustoms]         = useState<{ email: string; checked: boolean }[]>([]);
  const [subject, setSubject]         = useState(defaultSubject);
  const [body, setBody]               = useState(defaultBody);

  const toggle = (role: string) => setChecked(prev => ({ ...prev, [role]: !prev[role] }));
  const toggleCustom = (idx: number) => setCustoms(prev => prev.map((c, i) => i === idx ? { ...c, checked: !c.checked } : c));

  const addCustom = () => {
    const email = customInput.trim();
    if (!email.includes("@")) return;
    setCustoms(prev => [...prev, { email, checked: true }]);
    setCustomInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
  };

  const selectedRecipients: Recipient[] = [
    ...staticRecipients.filter(r => checked[r.role]).map(({ defaultChecked: _dc, ...r }) => r),
    ...customs.filter(c => c.checked).map(c => ({ role: "custom" as const, name: c.email, email: c.email })),
  ];

  return (
    <div className="space-y-4">
      {/* Destinataires */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Destinataires</Label>
          <span className="text-xs text-muted-foreground">{selectedRecipients.length} sélectionné{selectedRecipients.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="space-y-1.5">
          {staticRecipients.map(r => {
            const isChecked = checked[r.role] ?? false;
            return (
              <div
                key={r.role}
                onClick={() => toggle(r.role)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${isChecked ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}
              >
                <Checkbox checked={isChecked} onCheckedChange={() => toggle(r.role)} onClick={e => e.stopPropagation()} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{roleLabel[r.role]}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.name} · {r.email}</p>
                </div>
              </div>
            );
          })}

          {customs.map((c, i) => (
            <div key={i} onClick={() => toggleCustom(i)} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${c.checked ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}>
              <Checkbox checked={c.checked} onCheckedChange={() => toggleCustom(i)} onClick={e => e.stopPropagation()} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">Autre</p>
                <p className="text-xs text-muted-foreground truncate">{c.email}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-1.5">
            <Input type="email" placeholder="Ajouter un autre destinataire..." value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />
            <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" disabled={!customInput.includes("@")} onClick={addCustom}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Prévisualisation */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Message envoyé</Label>
        <div className="rounded-lg border overflow-hidden">
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Objet du message..."
            className="border-0 rounded-none h-9 px-3 text-sm focus-visible:ring-0 bg-transparent border-b"
          />
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Contenu du message..."
            className="border-0 rounded-none text-sm resize-none px-3 py-2 focus-visible:ring-0 bg-transparent"
            rows={5}
          />
        </div>
      </div>

      <Button
        className="w-full gap-2"
        disabled={selectedRecipients.length === 0 || !body.trim()}
        onClick={() => onSend(selectedRecipients, subject.trim(), body.trim())}
      >
        Envoyer le récapitulatif et clôturer le ticket <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
