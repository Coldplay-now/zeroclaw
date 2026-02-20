import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getToolsList, getToolDetail, type ToolDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Wrench, Search, X, ChevronRight } from "lucide-react";

export function Tools() {
  const { t } = useTranslation("tools");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const listQuery = useQuery({
    queryKey: ["tools-list"],
    queryFn: getToolsList,
  });

  const detailQuery = useQuery({
    queryKey: ["tool-detail", selectedTool],
    queryFn: () => getToolDetail(selectedTool!),
    enabled: !!selectedTool,
  });

  if (listQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (listQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{listQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tools = listQuery.data?.tools ?? [];
  const filtered = searchFilter
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          t.description.toLowerCase().includes(searchFilter.toLowerCase()),
      )
    : tools;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          {tools.length} {t("registered")}
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {searchFilter && (
          <Button variant="ghost" size="sm" onClick={() => setSearchFilter("")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tool) => (
          <Card
            key={tool.name}
            className={`cursor-pointer transition-colors hover:bg-accent/50 ${
              selectedTool === tool.name ? "ring-2 ring-ring" : ""
            }`}
            onClick={() => setSelectedTool(selectedTool === tool.name ? null : tool.name)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 shrink-0" />
                <span className="font-mono">{tool.name}</span>
                <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {tool.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {searchFilter ? t("noSearchResults") : t("noTools")}
          </CardContent>
        </Card>
      )}

      {/* Detail Panel */}
      {selectedTool && (
        <ToolDetailPanel
          name={selectedTool}
          detail={detailQuery.data ?? null}
          isLoading={detailQuery.isLoading}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
}

function ToolDetailPanel({
  name,
  detail,
  isLoading,
  onClose,
}: {
  name: string;
  detail: ToolDetail | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("tools");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="font-mono">{name}</span>
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded" />
        ) : detail ? (
          <>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                {t("description")}
              </h3>
              <p className="text-sm">{detail.description}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                {t("parameters")}
              </h3>
              <pre className="text-xs font-mono bg-muted/50 rounded p-3 overflow-x-auto">
                {JSON.stringify(detail.parameters, null, 2)}
              </pre>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
