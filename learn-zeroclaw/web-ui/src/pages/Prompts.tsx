import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrompts,
  getPromptFile,
  updatePromptFile,
  getPromptsPreview,
  type PromptFile,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  FileText,
  Eye,
  Pencil,
  Plus,
  Copy,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

const MAX_CHARS = 20_000;

export function Prompts() {
  const { t } = useTranslation("prompts");
  const queryClient = useQueryClient();
  const [editFile, setEditFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["prompts"],
    queryFn: getPrompts,
  });

  const previewQuery = useQuery({
    queryKey: ["prompts-preview"],
    queryFn: getPromptsPreview,
    enabled: showPreview,
  });

  const saveMutation = useMutation({
    mutationFn: ({ filename, content }: { filename: string; content: string }) =>
      updatePromptFile(filename, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["prompts-preview"] });
      setEditFile(null);
      setShowConfirm(false);
    },
  });

  const handleEdit = async (filename: string) => {
    const fileData = await getPromptFile(filename);
    setEditContent(fileData.content ?? "");
    setEditFile(filename);
  };

  const handleSave = () => {
    if (!editFile) return;
    setShowConfirm(true);
  };

  const confirmSave = () => {
    if (!editFile) return;
    saveMutation.mutate({ filename: editFile, content: editContent });
  };

  const handleCopyPreview = () => {
    if (previewQuery.data) {
      navigator.clipboard.writeText(previewQuery.data.preview).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const charPercent = Math.min(100, (data.total_chars / (MAX_CHARS * 8)) * 100);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
          <Eye className="h-4 w-4 mr-2" />
          {t("preview")}
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span>
              {t("totalChars")}: <strong>{data.total_chars.toLocaleString()}</strong>
            </span>
            <span className="text-muted-foreground">
              {t("maxPerFile")}: {MAX_CHARS.toLocaleString()} {t("chars")}
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                charPercent > 80 ? "bg-orange-500" : "bg-primary"
              }`}
              style={{ width: `${charPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.files.map((file) => (
          <PromptCard
            key={file.filename}
            file={file}
            onEdit={() => handleEdit(file.filename)}
          />
        ))}
      </div>

      {/* Edit Modal */}
      {editFile && (
        <Modal onClose={() => { setEditFile(null); setShowConfirm(false); }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editFile}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setEditFile(null); setShowConfirm(false); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editFile === "MEMORY.md" && (
              <div className="flex items-center gap-2 p-3 rounded bg-orange-500/10 text-orange-600 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t("memoryWarning")}
              </div>
            )}

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-96 p-3 rounded border bg-background font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="flex items-center justify-between">
              <CharCounter count={editContent.length} max={MAX_CHARS} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditFile(null); setShowConfirm(false); }}>
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={editContent.length > MAX_CHARS || saveMutation.isPending}
                >
                  {t("save")}
                </Button>
              </div>
            </div>

            {/* Confirm Dialog */}
            {showConfirm && (
              <div className="border rounded p-4 bg-muted/50 space-y-3">
                <p className="font-medium">{t("saveConfirm", { filename: editFile })}</p>
                <p className="text-sm text-muted-foreground">{t("saveConfirmDesc")}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                    {t("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={confirmSave}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "..." : t("save")}
                  </Button>
                </div>
              </div>
            )}

            {saveMutation.isError && (
              <p className="text-sm text-destructive">{t("saveError")}</p>
            )}
          </div>
        </Modal>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Modal onClose={() => setShowPreview(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("previewTitle")}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyPreview}>
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                      {t("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {t("copyAll")}
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {previewQuery.isLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : previewQuery.data ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {previewQuery.data.chars.toLocaleString()} {t("chars")}
                </p>
                <pre className="w-full max-h-[60vh] overflow-auto p-4 rounded border bg-muted/50 text-xs font-mono whitespace-pre-wrap">
                  {previewQuery.data.preview}
                </pre>
              </>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}

function PromptCard({
  file,
  onEdit,
}: {
  file: PromptFile;
  onEdit: () => void;
}) {
  const { t } = useTranslation("prompts");
  const charPercent = Math.min(100, (file.chars / MAX_CHARS) * 100);

  return (
    <Card className={!file.exists ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {file.filename}
          </span>
          {file.exists ? (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {t("edit")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("create")}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{file.role}</p>
        <div className="flex items-center justify-between text-xs">
          <span>
            {file.exists
              ? `${file.chars.toLocaleString()} ${t("chars")}`
              : t("notCreated")}
          </span>
          {file.updated_epoch && (
            <span className="text-muted-foreground">
              {new Date(file.updated_epoch * 1000).toLocaleDateString()}
            </span>
          )}
        </div>
        {file.exists && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                charPercent > 80 ? "bg-orange-500" : "bg-primary"
              }`}
              style={{ width: `${charPercent}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CharCounter({ count, max }: { count: number; max: number }) {
  const { t } = useTranslation("prompts");
  const isWarning = count > max * 0.8;
  const isOver = count > max;

  return (
    <span
      className={`text-xs ${
        isOver
          ? "text-destructive font-medium"
          : isWarning
            ? "text-orange-500"
            : "text-muted-foreground"
      }`}
    >
      {count.toLocaleString()} / {max.toLocaleString()} {t("chars")}
      {isWarning && !isOver && ` - ${t("charWarning")}`}
    </span>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-background rounded-lg border shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4">
        {children}
      </div>
    </div>
  );
}
