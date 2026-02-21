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

      {saveResult && saveResult.rejected.length > 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-amber-700">
            {t("saveRejected")}: {saveResult.rejected.join(", ")}
          </CardContent>
        </Card>
      )}

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

      {/* Editable: Limits (Phase 1) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {t("limitsSection")}
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal">
              {t("requiresRestart")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingField
            label={t("agentMaxToolIterations")}
            value={
              draft.agent_max_tool_iterations !== undefined
                ? String(draft.agent_max_tool_iterations)
                : String(config.agent.max_tool_iterations)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                agent_max_tool_iterations: parseInt(v, 10) || 10,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 1, max: 50 })}
          />
          <SettingField
            label={t("agentMaxHistoryMessages")}
            value={
              draft.agent_max_history_messages !== undefined
                ? String(draft.agent_max_history_messages)
                : String(config.agent.max_history_messages)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                agent_max_history_messages: parseInt(v, 10) || 50,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 10, max: 200 })}
          />
          <SettingToggle
            label={t("agentTrajectoryCompressionEnabled")}
            checked={
              draft.agent_trajectory_compression_enabled !== undefined
                ? Boolean(draft.agent_trajectory_compression_enabled)
                : config.agent.trajectory_compression_enabled
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                agent_trajectory_compression_enabled: v,
              })
            }
          />
          <SettingField
            label={t("agentTrajectoryStateMaxItems")}
            value={
              draft.agent_trajectory_state_max_items !== undefined
                ? String(draft.agent_trajectory_state_max_items)
                : String(config.agent.trajectory_state_max_items)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                agent_trajectory_state_max_items: parseInt(v, 10) || 6,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 1, max: 20 })}
          />
          <SettingField
            label={t("agentTrajectoryMaxRounds")}
            value={
              draft.agent_trajectory_max_rounds !== undefined
                ? String(draft.agent_trajectory_max_rounds)
                : String(config.agent.trajectory_max_rounds)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                agent_trajectory_max_rounds: parseInt(v, 10) || 8,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 1, max: 50 })}
          />
          <SettingField
            label={t("channelsMessageTimeoutSecs")}
            value={
              draft.channels_message_timeout_secs !== undefined
                ? String(draft.channels_message_timeout_secs)
                : String(config.channels_config.message_timeout_secs)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                channels_message_timeout_secs: parseInt(v, 10) || 300,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 30, max: 1800 })}
          />
          <SettingField
            label={t("schedulerMaxConcurrent")}
            value={
              draft.scheduler_max_concurrent !== undefined
                ? String(draft.scheduler_max_concurrent)
                : String(config.scheduler.max_concurrent)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                scheduler_max_concurrent: parseInt(v, 10) || 4,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 1, max: 32 })}
          />
          <SettingField
            label={t("schedulerMaxTasks")}
            value={
              draft.scheduler_max_tasks !== undefined
                ? String(draft.scheduler_max_tasks)
                : String(config.scheduler.max_tasks)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                scheduler_max_tasks: parseInt(v, 10) || 64,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 1, max: 1000 })}
          />
          <SettingField
            label={t("reliabilitySchedulerPollSecs")}
            value={
              draft.reliability_scheduler_poll_secs !== undefined
                ? String(draft.reliability_scheduler_poll_secs)
                : String(config.reliability.scheduler_poll_secs)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                reliability_scheduler_poll_secs: parseInt(v, 10) || 15,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 5, max: 300 })}
          />
          <SettingField
            label={t("reliabilitySchedulerRetries")}
            value={
              draft.reliability_scheduler_retries !== undefined
                ? String(draft.reliability_scheduler_retries)
                : String(config.reliability.scheduler_retries)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                reliability_scheduler_retries: parseInt(v, 10) || 2,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 0, max: 10 })}
          />
          <SettingField
            label={t("autonomyMaxActionsPerHour")}
            value={
              draft.autonomy_max_actions_per_hour !== undefined
                ? String(draft.autonomy_max_actions_per_hour)
                : String(config.autonomy.max_actions_per_hour)
            }
            onChange={(v) =>
              setDraft({
                ...draft,
                autonomy_max_actions_per_hour: parseInt(v, 10) || 20,
              })
            }
            type="number"
            hint={t("rangeHint", { min: 1, max: 1000 })}
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="shrink-0">
        <label className="text-sm text-muted-foreground">{label}</label>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
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
