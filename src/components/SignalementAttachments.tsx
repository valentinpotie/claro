import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SignalementAttachment } from "@/data/types";
import { FileText, Paperclip } from "lucide-react";

interface Props {
  attachments: SignalementAttachment[];
}

type Resolved = SignalementAttachment & { url: string | null };

export function SignalementAttachments({ attachments }: Props) {
  const [resolved, setResolved] = useState<Resolved[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await Promise.all(
        attachments.map(async (a) => {
          try {
            const { data } = await supabase.storage.from("ticket-documents").createSignedUrl(a.storage_path, 3600);
            return { ...a, url: data?.signedUrl ?? null };
          } catch {
            return { ...a, url: null };
          }
        }),
      );
      if (!cancelled) setResolved(next);
    })();
    return () => { cancelled = true; };
  }, [attachments]);

  if (resolved.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {resolved.map((a, i) => {
        const isImage = (a.content_type ?? "").startsWith("image/");
        if (isImage && a.url) {
          return (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              title={a.filename}
              className="block h-14 w-14 overflow-hidden rounded border border-border/60 hover:border-primary transition-colors"
            >
              <img src={a.url} alt={a.filename} className="h-full w-full object-cover" />
            </a>
          );
        }
        return (
          <a
            key={i}
            href={a.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border/60 hover:border-primary text-xs text-primary hover:underline max-w-full"
          >
            {isImage ? <Paperclip className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
            <span className="truncate max-w-[180px]">{a.filename}</span>
          </a>
        );
      })}
    </div>
  );
}
