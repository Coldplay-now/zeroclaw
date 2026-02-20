import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getMetrics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Activity,
  Clock,
  Brain,
  Wrench,
  Timer,
  Heart,
  RotateCcw,
  Server,
} from "lucide-react";

export function Metrics() {
  const { t } = useTranslation("metrics");

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: getMetrics,
    refetchInterval: 30_000,
  });

  if (metricsQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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

  if (metricsQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{metricsQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = metricsQuery.data;
  if (!data) return null;

  const uptimeFormatted = formatUptime(data.uptime_seconds);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          PID {data.pid} · {data.observer}
        </span>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          label={t("uptime")}
          value={uptimeFormatted}
        />
        <MetricCard
          icon={Activity}
          label={t("components")}
          value={`${data.components.ok} / ${data.components.total}`}
          sub={
            data.components.error > 0
              ? `${data.components.error} ${t("errors")}`
              : t("allHealthy")
          }
          subColor={data.components.error > 0 ? "text-destructive" : "text-green-600"}
        />
        <MetricCard
          icon={RotateCcw}
          label={t("restarts")}
          value={data.components.total_restarts.toLocaleString()}
        />
        <MetricCard
          icon={Server}
          label={t("observer")}
          value={data.observer}
        />
      </div>

      {/* Subsystem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Memory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              {t("memorySection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("backend")}</span>
              <span className="font-medium">{data.memory.backend}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("entries")}</span>
              <span className="font-medium">{data.memory.count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("health")}</span>
              <span className={`font-medium flex items-center gap-1 ${data.memory.healthy ? "text-green-600" : "text-destructive"}`}>
                <Heart className="h-3 w-3" />
                {data.memory.healthy ? t("healthy") : t("unhealthy")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tools */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {t("toolsSection")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("registered")}</span>
              <span className="font-medium">{data.tools.registered}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cron */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4" />
              {t("cronSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cron ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("totalJobs")}</span>
                  <span className="font-medium">{data.cron.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("active")}</span>
                  <span className="font-medium text-green-600">{data.cron.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("paused")}</span>
                  <span className="font-medium text-orange-500">{data.cron.paused}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hint */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>{t("otelHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-medium">{value}</p>
          {sub && <p className={`text-xs ${subColor || "text-muted-foreground"}`}>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
