import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchMemory } from "@/lib/api";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Brain,
  Wrench,
  Puzzle,
  Clock,
  Shield,
  BarChart3,
  Radio,
  Settings,
  Search,
} from "lucide-react";

interface NavResult {
  type: "nav";
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavResult[] = [
  { type: "nav", label: "Dashboard", path: "/", icon: LayoutDashboard },
  { type: "nav", label: "Chat", path: "/chat", icon: MessageSquare },
  { type: "nav", label: "Prompts", path: "/prompts", icon: FileText },
  { type: "nav", label: "Memory", path: "/memory", icon: Brain },
  { type: "nav", label: "Tools", path: "/tools", icon: Wrench },
  { type: "nav", label: "Skills", path: "/skills", icon: Puzzle },
  { type: "nav", label: "Scheduler", path: "/scheduler", icon: Clock },
  { type: "nav", label: "Audit", path: "/audit", icon: Shield },
  { type: "nav", label: "Metrics", path: "/metrics", icon: BarChart3 },
  { type: "nav", label: "Channels", path: "/channels", icon: Radio },
  { type: "nav", label: "Settings", path: "/settings", icon: Settings },
];

interface MemoryResult {
  type: "memory";
  key: string;
  content: string;
  category: string;
}

type SearchResult = NavResult | MemoryResult;

export function GlobalSearch() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Memory search (debounced via query key)
  const memoryQuery = useQuery({
    queryKey: ["global-search-memory", query],
    queryFn: () => searchMemory(query, 5),
    enabled: isOpen && query.length >= 2,
    staleTime: 10_000,
  });

  // Build results
  const navResults: NavResult[] = query
    ? NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      )
    : NAV_ITEMS;

  const memoryResults: MemoryResult[] =
    memoryQuery.data?.entries.map((e) => ({
      type: "memory" as const,
      key: e.key,
      content: e.content,
      category: e.category,
    })) ?? [];

  const results: SearchResult[] = [...navResults, ...memoryResults];

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      if (result.type === "nav") {
        navigate(result.path);
      } else {
        navigate("/memory");
      }
    },
    [navigate],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) setIsOpen(false);
      }}
    >
      <div className="w-full max-w-lg bg-background border rounded-lg shadow-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("search.placeholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("search.noResults")}
            </p>
          ) : (
            <>
              {/* Nav results */}
              {navResults.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground px-4 py-1">
                    {t("search.pages")}
                  </p>
                  {navResults.map((result, i) => {
                    const Icon = result.icon;
                    const globalIndex = i;
                    return (
                      <button
                        key={result.path}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-muted/50 ${
                          globalIndex === selectedIndex ? "bg-muted" : ""
                        }`}
                        onClick={() => handleSelect(result)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{result.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Memory results */}
              {memoryResults.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground px-4 py-1 mt-1">
                    {t("search.memory")}
                  </p>
                  {memoryResults.map((result, i) => {
                    const globalIndex = navResults.length + i;
                    return (
                      <button
                        key={result.key}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-muted/50 ${
                          globalIndex === selectedIndex ? "bg-muted" : ""
                        }`}
                        onClick={() => handleSelect(result)}
                      >
                        <Brain className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">{result.key}</span>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.content}
                          </p>
                        </div>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                          {result.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-[10px] text-muted-foreground">
          <span>
            <kbd className="px-1 py-0.5 rounded border bg-muted">↑↓</kbd>{" "}
            {t("search.navigate")}{" "}
            <kbd className="px-1 py-0.5 rounded border bg-muted">↵</kbd>{" "}
            {t("search.select")}
          </span>
        </div>
      </div>
    </div>
  );
}
