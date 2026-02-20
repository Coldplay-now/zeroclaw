import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCronJobs,
  getCronRuns,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  type CronJob,
  type CronRun,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  X,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";

export function Scheduler() {
  const { t } = useTranslation("scheduler");
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [runsJobId, setRunsJobId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["cron-jobs"],
    queryFn: getCronJobs,
    refetchInterval: 30_000,
  });

  const runsQuery = useQuery({
    queryKey: ["cron-runs", runsJobId],
    queryFn: () => getCronRuns(runsJobId!, 20),
    enabled: !!runsJobId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateCronJob(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCronJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cron-jobs"] });
      setConfirmDelete(null);
    },
  });

  if (jobsQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (jobsQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{jobsQuery.error?.message || t("loadError")}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = jobsQuery.data?.jobs ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("createJob")}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">{t("totalJobs")}</p>
              <p className="font-medium">{jobs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Play className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">{t("activeJobs")}</p>
              <p className="font-medium">{jobs.filter((j) => j.enabled).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Pause className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("pausedJobs")}</p>
              <p className="font-medium">{jobs.filter((j) => !j.enabled).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <CreateJobForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["cron-jobs"] });
          }}
        />
      )}

      {/* Job List */}
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {t("noJobs")}
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isExpanded={expandedJob === job.id}
              onToggleExpand={() =>
                setExpandedJob(expandedJob === job.id ? null : job.id)
              }
              onToggleEnabled={() =>
                toggleMutation.mutate({ id: job.id, enabled: !job.enabled })
              }
              onShowRuns={() =>
                setRunsJobId(runsJobId === job.id ? null : job.id)
              }
              confirmDelete={confirmDelete === job.id}
              onRequestDelete={() => setConfirmDelete(job.id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onConfirmDelete={() => deleteMutation.mutate(job.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Runs Panel */}
      {runsJobId && (
        <RunsPanel
          jobId={runsJobId}
          runs={runsQuery.data?.runs ?? []}
          isLoading={runsQuery.isLoading}
          onClose={() => setRunsJobId(null)}
        />
      )}
    </div>
  );
}

function JobCard({
  job,
  isExpanded,
  onToggleExpand,
  onToggleEnabled,
  onShowRuns,
  confirmDelete,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  isDeleting,
}: {
  job: CronJob;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: () => void;
  onShowRuns: () => void;
  confirmDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const { t } = useTranslation("scheduler");

  const scheduleLabel =
    job.schedule.kind === "cron"
      ? job.schedule.expr
      : job.schedule.kind === "every"
        ? `${t("every")} ${((job.schedule.every_ms ?? 0) / 1000).toFixed(0)}s`
        : job.schedule.at ?? "?";

  return (
    <Card className={!job.enabled ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={onToggleExpand}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {job.name || job.id.slice(0, 8)}
              </span>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">
                {job.job_type}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {scheduleLabel}
              </span>
              {job.last_status && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    job.last_status === "ok"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {job.last_status}
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {job.job_type === "agent" ? job.prompt : job.command}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onShowRuns}>
              <History className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleEnabled}
            >
              {job.enabled ? (
                <Pause className="h-3.5 w-3.5 text-orange-500" />
              ) : (
                <Play className="h-3.5 w-3.5 text-green-600" />
              )}
            </Button>
            {confirmDelete ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onConfirmDelete}
                  disabled={isDeleting}
                >
                  {t("confirm")}
                </Button>
                <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                  {t("cancel")}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onRequestDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-2">
              <span>ID: {job.id}</span>
              <span>{t("nextRun")}: {new Date(job.next_run).toLocaleString()}</span>
              {job.last_run && (
                <span>{t("lastRun")}: {new Date(job.last_run).toLocaleString()}</span>
              )}
              <span>{t("session")}: {job.session_target}</span>
              {job.model && <span>{t("model")}: {job.model}</span>}
              <span>{t("delivery")}: {job.delivery.mode}</span>
            </div>
            {job.last_output && (
              <div className="mt-2">
                <p className="font-medium mb-1">{t("lastOutput")}:</p>
                <pre className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap max-h-32 overflow-auto">
                  {job.last_output}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateJobForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation("scheduler");
  const [jobType, setJobType] = useState<"shell" | "agent">("agent");
  const [name, setName] = useState("");
  const [cronExpr, setCronExpr] = useState("0 * * * *");
  const [command, setCommand] = useState("");
  const [prompt, setPrompt] = useState("");

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createCronJob(body),
    onSuccess: () => onCreated(),
  });

  const handleCreate = () => {
    const body: Record<string, unknown> = {
      schedule: { kind: "cron", expr: cronExpr },
      job_type: jobType,
      name: name || undefined,
    };
    if (jobType === "shell") body.command = command;
    else body.prompt = prompt;

    createMutation.mutate(body);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          {t("createJob")}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder={t("jobName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value as "shell" | "agent")}
            className="p-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="agent">{t("typeAgent")}</option>
            <option value="shell">{t("typeShell")}</option>
          </select>
        </div>
        <input
          type="text"
          placeholder={t("cronExpression")}
          value={cronExpr}
          onChange={(e) => setCronExpr(e.target.value)}
          className="w-full p-2 rounded border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {jobType === "shell" ? (
          <input
            type="text"
            placeholder={t("commandPlaceholder")}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="w-full p-2 rounded border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <textarea
            placeholder={t("promptPlaceholder")}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-20 p-2 rounded border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={
              createMutation.isPending ||
              (!command && jobType === "shell") ||
              (!prompt && jobType === "agent")
            }
          >
            {createMutation.isPending ? "..." : t("create")}
          </Button>
        </div>
        {createMutation.isError && (
          <p className="text-sm text-destructive">{t("createError")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RunsPanel({
  jobId,
  runs,
  isLoading,
  onClose,
}: {
  jobId: string;
  runs: CronRun[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("scheduler");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t("recentRuns")} — {jobId.slice(0, 8)}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 bg-muted animate-pulse rounded" />
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noRuns")}
          </p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex items-start justify-between p-2 rounded border text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        run.status === "ok"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {run.status}
                    </span>
                    {run.duration_ms != null && (
                      <span className="text-muted-foreground">
                        {run.duration_ms}ms
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(run.started_at).toLocaleString()}
                  </p>
                </div>
                {run.output && (
                  <pre className="ml-2 text-[10px] bg-muted/50 rounded p-1 max-w-[50%] truncate">
                    {run.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
