import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMemoryList,
  getMemoryStats,
  searchMemory,
  storeMemory,
  deleteMemory,
  type MemoryEntry,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Brain,
  Search,
  Plus,
  Trash2,
  X,
  Database,
  Heart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CATEGORIES = ["core", "daily", "conversation"] as const;

export function Memory() {
  const { t } = useTranslation("memory");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [newKey, setNewKey] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("core");

  const statsQuery = useQuery({
    queryKey: ["memory-stats"],
    queryFn: getMemoryStats,
  });

  const listQuery = useQuery({
    queryKey: ["memory-list", filterCategory],
    queryFn: () => getMemoryList(filterCategory || undefined),
  });

  const searchMutation = useMutation({
    mutationFn: (q: string) => searchMemory(q, 20),
  });

  const storeMutation = useMutation({
    mutationFn: (data: { key: string; content: string; category: string }) =>
      storeMemory(data.key, data.content, data.category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-list"] });
      queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
      setShowAddForm(false);
      setNewKey("");
      setNewContent("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteMemory(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-list"] });
      queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
      setConfirmDelete(null);
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const handleStore = () => {
    if (newKey.trim() && newContent.trim()) {
      storeMutation.mutate({
        key: newKey.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
    }
  };

  const entries: MemoryEntry[] = searchMutation.data?.entries ?? listQuery.data?.entries ?? [];
  const isSearchMode = !!searchMutation.data;

  if (listQuery.error && !listQuery.data) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addEntry")}
        </Button>
      </div>

      {/* Stats */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("backend")}</p>
                <p className="font-medium">{statsQuery.data.backend}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("totalEntries")}</p>
                <p className="font-medium">{statsQuery.data.count.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("health")}</p>
                <p className={`font-medium ${statsQuery.data.healthy ? "text-green-600" : "text-destructive"}`}>
                  {statsQuery.data.healthy ? t("healthy") : t("unhealthy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("addEntry")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder={t("keyPlaceholder")}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              placeholder={t("contentPlaceholder")}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full h-24 p-2 rounded border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </select>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleStore}
                disabled={!newKey.trim() || !newContent.trim() || storeMutation.isPending}
              >
                {storeMutation.isPending ? "..." : t("save")}
              </Button>
            </div>
            {storeMutation.isError && (
              <p className="text-sm text-destructive">{t("storeError")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={handleSearch} disabled={searchMutation.isPending}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            searchMutation.reset();
          }}
          className="p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t("allCategories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`category.${c}`)}
            </option>
          ))}
        </select>
        {isSearchMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => searchMutation.reset()}
          >
            <X className="h-4 w-4 mr-1" />
            {t("clearSearch")}
          </Button>
        )}
      </div>

      {/* Results */}
      {isSearchMode && (
        <p className="text-sm text-muted-foreground">
          {entries.length} {t("resultsFor")} "{searchQuery}"
        </p>
      )}

      {/* Entry List */}
      <div className="space-y-2">
        {listQuery.isLoading && !listQuery.data ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {isSearchMode ? t("noSearchResults") : t("noEntries")}
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() =>
                      setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{entry.key}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {entry.category}
                      </span>
                      {entry.score != null && (
                        <span className="text-[10px] text-muted-foreground">
                          score: {entry.score.toFixed(2)}
                        </span>
                      )}
                      {expandedEntry === entry.id ? (
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expandedEntry === entry.id
                        ? entry.content
                        : entry.content.length > 120
                          ? entry.content.slice(0, 120) + "..."
                          : entry.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {confirmDelete === entry.key ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(entry.key)}
                          disabled={deleteMutation.isPending}
                        >
                          {t("confirmDelete")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          {t("cancel")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDelete(entry.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {expandedEntry === entry.id && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex gap-4">
                    <span>ID: {entry.id}</span>
                    <span>{entry.timestamp}</span>
                    {entry.session_id && <span>Session: {entry.session_id}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
