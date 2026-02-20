import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getStatus, getMetrics, type StatusResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Cpu,
  Database,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusIndicator({ status }: { status: string }) {
  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-yellow-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export function Dashboard() {
  const { t } = useTranslation("dashboard");
  const { data, isLoading, error } = useQuery<StatusResponse>({
    queryKey: ["status"],
    queryFn: getStatus,
    refetchInterval: 10_000,
  });

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: getMetrics,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error?.message || "Failed to load status"}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const components = Object.entries(data.components);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">v{data.version}</span>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t("status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusIndicator status="ok" />
              <span className="text-2xl font-bold">OK</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatUptime(data.uptime_seconds)} {t("uptime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              {t("model")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold truncate" title={data.model}>
              {data.model.split("/").pop() || data.model}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.temperature} {t("temp")} · {data.provider}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t("memory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize">
              {data.memory_backend}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.workspace.disk_free_mb != null
                ? `${data.workspace.disk_free_mb.toLocaleString()} MB free`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t("autonomy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize">
              {data.autonomy_level}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t("componentHealth")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {components.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No components registered
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {components.map(([name, comp]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 p-2 rounded border"
                >
                  <StatusIndicator status={comp.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate capitalize">
                      {name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comp.restart_count} {t("restarts")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t("quickStats")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: t("memoryEntries"), value: metricsQuery.data ? String(metricsQuery.data.memory.count) : t("noData") },
              { label: t("toolsRegistered"), value: metricsQuery.data ? String(metricsQuery.data.tools.registered) : t("noData") },
              { label: t("cronJobs"), value: metricsQuery.data?.cron ? String(metricsQuery.data.cron.total) : t("noData") },
              { label: t("cronActive"), value: metricsQuery.data?.cron ? String(metricsQuery.data.cron.active) : t("noData") },
              { label: t("totalRestarts"), value: metricsQuery.data ? String(metricsQuery.data.components.total_restarts) : t("noData") },
              { label: t("observerBackend"), value: metricsQuery.data?.observer ?? t("noData") },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-2xl font-bold ${stat.value === t("noData") ? "text-muted-foreground/50" : ""}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
