import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getChannelsList } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Radio,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react";

export function Channels() {
  const { t } = useTranslation("channels");

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: getChannelsList,
    refetchInterval: 30_000,
  });

  if (channelsQuery.isLoading) {
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

  if (channelsQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{channelsQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = channelsQuery.data;
  if (!data) return null;

  const configured = data.channels.filter((ch) => ch.configured);
  const unconfigured = data.channels.filter((ch) => !ch.configured);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-muted-foreground">
          {data.configured} / {data.total} {t("configured")}
        </span>
      </div>

      {/* Configured Channels */}
      {configured.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">{t("active")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configured.map((ch) => (
              <Card key={ch.name}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <StatusDot status={ch.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4" />
                        <span className="font-medium text-sm capitalize">
                          {ch.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {ch.status === "ok" ? (
                            <Wifi className="h-3 w-3 text-green-600" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-destructive" />
                          )}
                          {ch.status}
                        </span>
                        {ch.restart_count > 0 && (
                          <span className="flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {ch.restart_count} {t("restarts")}
                          </span>
                        )}
                      </div>
                      {ch.last_error && (
                        <p className="text-xs text-destructive mt-1 truncate">
                          {ch.last_error}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Unconfigured Channels */}
      {unconfigured.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3 text-muted-foreground">
            {t("unconfigured")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unconfigured.map((ch) => (
              <Card
                key={ch.name}
                className="border-dashed opacity-60"
              >
                <CardContent className="p-3 flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm capitalize text-muted-foreground">
                    {ch.name}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("configHint")}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-yellow-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}
