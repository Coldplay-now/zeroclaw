import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, type AuditEntry } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Shield,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const EVENT_TYPES = [
  "command_execution",
  "file_access",
  "config_change",
  "auth_success",
  "auth_failure",
  "policy_violation",
  "security_event",
] as const;

const PAGE_SIZE = 50;

export function Audit() {
  const { t } = useTranslation("audit");
  const [filterType, setFilterType] = useState<string>("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const logsQuery = useQuery({
    queryKey: ["audit-logs", filterType, page],
    queryFn: () =>
      getAuditLogs(filterType || undefined, PAGE_SIZE, page * PAGE_SIZE),
    refetchInterval: 30_000,
  });

  const data = logsQuery.data;

  if (logsQuery.isLoading && !data) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (logsQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{logsQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          {total.toLocaleString()} {t("totalEntries")}
        </span>
      </div>

      {/* Disabled notice */}
      {data && !data.enabled && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{data.message || t("disabled")}</span>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(0);
          }}
          className="p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t("allTypes")}</option>
          {EVENT_TYPES.map((et) => (
            <option key={et} value={et}>
              {t(`eventType.${et}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Entry List */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {t("noEntries")}
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <AuditEntryCard
              key={entry.event_id}
              entry={entry}
              isExpanded={expandedId === entry.event_id}
              onToggle={() =>
                setExpandedId(
                  expandedId === entry.event_id ? null : entry.event_id,
                )
              }
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}{" "}
            / {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AuditEntryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: AuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation("audit");

  const isPolicyViolation = entry.event_type === "policy_violation";
  const isAuthFailure = entry.event_type === "auth_failure";
  const isHighlighted = isPolicyViolation || isAuthFailure;

  return (
    <Card
      className={
        isHighlighted
          ? "border-destructive/50 bg-destructive/5"
          : ""
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <EventIcon eventType={entry.event_type} />
              <span className="text-sm font-medium">
                {t(`eventType.${entry.event_type}`)}
              </span>
              {entry.action?.risk_level && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    entry.action.risk_level === "high"
                      ? "bg-red-100 text-red-700"
                      : entry.action.risk_level === "medium"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {entry.action.risk_level}
                </span>
              )}
              {entry.result && (
                entry.result.success ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )
              )}
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            {entry.action?.command && (
              <p className="text-xs font-mono text-muted-foreground mt-1 truncate max-w-lg">
                {entry.action.command}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t">
            <pre className="text-xs font-mono bg-muted/50 rounded p-3 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventIcon({ eventType }: { eventType: string }) {
  switch (eventType) {
    case "policy_violation":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "auth_failure":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "auth_success":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "security_event":
      return <Shield className="h-4 w-4 text-orange-500" />;
    default:
      return <Shield className="h-4 w-4 text-muted-foreground" />;
  }
}
