import { useEffect, useRef, useState, useCallback } from "react";
import { TicketDocument, TicketDocumentType } from "@/data/types";
import { useTickets } from "@/contexts/TicketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Image, File, Download, Paperclip, Plus, Upload, Loader2, X, Save, Calendar } from "lucide-react";
import { USE_SUPABASE } from "@/lib/supabase";

async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Fallback : ouvrir dans un nouvel onglet
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const TYPE_LABELS: Record<TicketDocumentType, string> = {
  devis: "Devis",
  facture: "Facture",
  photo: "Photo",
  autre: "Autre",
};

const TYPE_COLORS: Record<TicketDocumentType, string> = {
  devis:   "bg-primary/10  text-primary          border-0",
  facture: "bg-success/10  text-success           border-0",
  photo:   "bg-accent      text-accent-foreground border-0",
  autre:   "bg-muted       text-muted-foreground  border-0",
};

const TYPE_ICON_COLORS: Record<TicketDocumentType, string> = {
  devis:   "text-primary",
  facture: "text-success",
  photo:   "text-accent-foreground",
  autre:   "text-muted-foreground",
};

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

function formatBytes(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isImage(doc: TicketDocument) {
  if (doc.mime_type) return doc.mime_type.startsWith("image/");
  const ext = doc.file_name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext);
}

function isPdf(doc: TicketDocument) {
  if (doc.mime_type) return doc.mime_type === "application/pdf";
  return doc.file_name.toLowerCase().endsWith(".pdf");
}

function DocIcon({ doc, className = "h-4 w-4 shrink-0" }: { doc: TicketDocument; className?: string }) {
  const color = TYPE_ICON_COLORS[doc.document_type];
  if (isImage(doc)) return <Image className={`${className} ${color}`} />;
  if (isPdf(doc))   return <FileText className={`${className} ${color}`} />;
  return <File className={`${className} ${color}`} />;
}

interface Props {
  ticketId: string;
  documents: TicketDocument[];
}

export function TicketDocuments({ ticketId, documents }: Props) {
  const { fetchTicketDocuments, uploadTicketDocument, updateTicketDocument } = useTickets();
  const [preview, setPreview]       = useState<TicketDocument | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType]       = useState<TicketDocumentType>("autre");
  const [description, setDescription] = useState("");
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Viewer edit state
  const [editName, setEditName]     = useState("");
  const [editType, setEditType]     = useState<TicketDocumentType>("autre");
  const [editNote, setEditNote]     = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const openPreview = useCallback((doc: TicketDocument) => {
    setPreview(doc);
    setEditName(doc.file_name);
    setEditType(doc.document_type);
    setEditNote(doc.description ?? "");
  }, []);

  const hasChanges = preview
    ? editName.trim() !== preview.file_name || editType !== preview.document_type || editNote !== (preview.description ?? "")
    : false;

  const handleSaveMeta = async () => {
    if (!preview || !hasChanges) return;
    setSavingMeta(true);
    const patch = {
      file_name:     editName.trim() || preview.file_name,
      document_type: editType,
      description:   editNote || undefined,
    };
    await updateTicketDocument(ticketId, preview.id, patch);
    setPreview(null);
    setSavingMeta(false);
  };

  // Fetch documents on mount
  useEffect(() => {
    if (USE_SUPABASE) {
      void fetchTicketDocuments(ticketId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadTicketDocument(ticketId, selectedFile, docType, description || undefined);
      setShowUpload(false);
      setSelectedFile(null);
      setDocType("autre");
      setDescription("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setShowUpload(false);
    setSelectedFile(null);
    setDocType("autre");
    setDescription("");
    setUploadError(null);
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Documents
              {documents.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {documents.length} fichier{documents.length > 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-5 px-4">
              Aucun document joint à ce dossier
            </p>
          ) : (
            <ScrollArea className={documents.length > 5 ? "h-[280px]" : undefined}>
              {documents.map((doc, i) => (
                <div key={doc.id}>
                  {i > 0 && <Separator />}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => openPreview(doc)}
                  >
                    <DocIcon doc={doc} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{doc.file_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge className={`text-[9px] px-1.5 py-0 h-4 ${TYPE_COLORS[doc.document_type]}`}>
                          {TYPE_LABELS[doc.document_type]}
                        </Badge>
                        {formatBytes(doc.file_size) && (
                          <span className="text-[10px] text-muted-foreground">{formatBytes(doc.file_size)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      tabIndex={-1}
                      onClick={e => { e.stopPropagation(); void downloadFile(doc.file_url, doc.file_name); }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Modale upload */}
      <Dialog open={showUpload} onOpenChange={open => { if (!open) resetUpload(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4" /> Ajouter un document
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            {/* Zone de dépôt */}
            <div
              className="relative border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                  <button
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Cliquer pour sélectionner</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WEBP — 50 Mo max</p>
                </>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type de document</label>
              <Select value={docType} onValueChange={v => setDocType(v as TicketDocumentType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as TicketDocumentType[]).map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description optionnelle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Note (optionnel)</label>
              <Textarea
                placeholder="ex : Devis plombier Martin du 14/04"
                className="text-sm min-h-[60px] resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={resetUpload} disabled={uploading}>
                Annuler
              </Button>
              <Button
                size="sm"
                disabled={!selectedFile || uploading}
                onClick={handleUpload}
                className="gap-1.5"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        {preview && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2 pr-8">
                <DocIcon doc={preview} />
                <span className="truncate">{preview.file_name}</span>
              </DialogTitle>
            </DialogHeader>

            {/* Aperçu */}
            <div className="rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[360px]">
              {isImage(preview) ? (
                <img src={preview.file_url} alt={preview.file_name} className="max-h-[60vh] max-w-full object-contain" />
              ) : isPdf(preview) ? (
                <iframe src={preview.file_url} title={preview.file_name} className="w-full h-[60vh] border-0" />
              ) : (
                <div className="text-center space-y-2 p-8">
                  <File className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Aperçu non disponible pour ce type de fichier.</p>
                </div>
              )}
            </div>

            {/* Métadonnées éditables */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nom du fichier</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select value={editType} onValueChange={v => setEditType(v as TicketDocumentType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as TicketDocumentType[]).map(t => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Note</label>
                <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Note sur ce document…" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Ajouté le
                </label>
                <p className="h-8 flex items-center text-sm text-muted-foreground">
                  {new Date(preview.uploaded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void downloadFile(preview.file_url, editName || preview.file_name)}>
                <Download className="h-3.5 w-3.5" /> Télécharger
              </Button>
              <Button size="sm" className="gap-1.5" disabled={!hasChanges || savingMeta} onClick={handleSaveMeta}>
                {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
