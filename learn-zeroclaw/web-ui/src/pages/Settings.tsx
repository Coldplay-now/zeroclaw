import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getConfig, patchConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Save,
  Lock,
  CheckCircle,
} from "lucide-react";

export function Settings() {
  const { t } = useTranslation("settings");
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saveResult, setSaveResult] = useState<{
    updated: string[];
    rejected: string[];
  } | null>(null);

  const patchMutation = useMutation({
    mutationFn: patchConfig,
    onSuccess: (data) => {
      setSaveResult({ updated: data.updated, rejected: data.rejected });
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setTimeout(() => setSaveResult(null), 3000);
    },
  });

  if (configQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="space-y-4">
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

  if (configQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{configQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = configQuery.data;
  if (!config) return null;

  const hasDraft = Object.keys(draft).length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          {saveResult && saveResult.updated.length > 0 && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {t("saved")}
            </span>
          )}
          {hasDraft && (
            <Button
              size="sm"
              onClick={() => patchMutation.mutate(draft)}
              disabled={patchMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {t("save")}
            </Button>
          )}
        </div>
      </div>

      {/* Editable: Model */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("modelSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingField
            label={t("defaultModel")}
            value={
              draft.default_model !== undefined
                ? String(draft.default_model)
                : config.default_model || ""
            }
            onChange={(v) =>
              setDraft({ ...draft, default_model: v || null })
            }
          />
          <SettingField
            label={t("temperature")}
            value={
              draft.default_temperature !== undefined
                ? String(draft.default_temperature)
                : String(config.default_temperature)
            }
            onChange={(v) =>
              setDraft({ ...draft, default_temperature: parseFloat(v) || 0 })
            }
            type="number"
          />
        </CardContent>
      </Card>

      {/* Editable: Autonomy */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("autonomySection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingSelect
            label={t("autonomyLevel")}
            value={
              draft.autonomy_level !== undefined
                ? String(draft.autonomy_level)
                : config.autonomy.level
            }
            options={["readonly", "supervised", "full"]}
            onChange={(v) => setDraft({ ...draft, autonomy_level: v })}
          />
          <ReadOnlyField
            label={t("workspaceOnly")}
            value={config.autonomy.workspace_only ? "true" : "false"}
          />
          <ReadOnlyField
            label={t("maxActionsPerHour")}
            value={String(config.autonomy.max_actions_per_hour)}
          />
        </CardContent>
      </Card>

      {/* Editable: Memory */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("memorySection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadOnlyField
            label={t("memoryBackend")}
            value={config.memory.backend}
          />
          <SettingToggle
            label={t("autoSave")}
            checked={
              draft.memory_auto_save !== undefined
                ? Boolean(draft.memory_auto_save)
                : config.memory.auto_save
            }
            onChange={(v) => setDraft({ ...draft, memory_auto_save: v })}
          />
        </CardContent>
      </Card>

      {/* Editable: Heartbeat */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("heartbeatSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingToggle
            label={t("heartbeatEnabled")}
            checked={
              draft.heartbeat_enabled !== undefined
                ? Boolean(draft.heartbeat_enabled)
                : config.heartbeat.enabled
            }
            onChange={(v) => setDraft({ ...draft, heartbeat_enabled: v })}
          />
          <SettingField
            label={t("intervalMinutes")}
            value={
              draft.heartbeat_interval_minutes !== undefined
                ? String(draft.heartbeat_interval_minutes)
                : String(config.heartbeat.interval_minutes)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                heartbeat_interval_minutes: parseInt(v, 10) || 30,
              })
            }
            type="number"
          />
        </CardContent>
      </Card>

      {/* Read-only: Gateway */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-3 w-3" />
            {t("gatewaySection")}
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal">
              {t("requiresRestart")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadOnlyField label={t("port")} value={String(config.gateway.port)} />
          <ReadOnlyField label={t("host")} value={config.gateway.host} />
          <ReadOnlyField
            label={t("requirePairing")}
            value={config.gateway.require_pairing ? "true" : "false"}
          />
        </CardContent>
      </Card>

      {/* Read-only: Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("costSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadOnlyField
            label={t("costEnabled")}
            value={config.cost.enabled ? "true" : "false"}
          />
          <ReadOnlyField
            label={t("dailyLimit")}
            value={`$${config.cost.daily_limit_usd}`}
          />
          <ReadOnlyField
            label={t("monthlyLimit")}
            value={`$${config.cost.monthly_limit_usd}`}
          />
        </CardContent>
      </Card>

      {/* Read-only: API Key */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-3 w-3" />
            {t("credentialsSection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadOnlyField
            label={t("apiKey")}
            value={config.api_key || t("notSet")}
          />
          <ReadOnlyField
            label={t("apiUrl")}
            value={config.api_url || t("default")}
          />
          <ReadOnlyField
            label={t("provider")}
            value={config.default_provider || t("auto")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground shrink-0">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 px-3 py-1.5 rounded border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function SettingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 px-3 py-1.5 rounded border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground shrink-0">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground shrink-0">{label}</label>
      <span className="text-sm font-mono">{value}</span>
    </div>
  );
}
