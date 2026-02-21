const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("zeroclaw_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (res.status === 401) {
    localStorage.removeItem("zeroclaw_token");
    window.location.href = "/pair";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export async function healthCheck() {
  return apiFetch<{ status: string; paired: boolean }>("/health");
}

export async function pair(
  code: string,
): Promise<{ paired: boolean; token?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/pair`, {
    method: "POST",
    headers: { "X-Pairing-Code": code },
  });
  return res.json();
}

// ── Chat / Webhook ─────────────────────────────────────────────────────────

export interface AgentStep {
  type: "LlmRequest" | "ToolCall";
  // LlmRequest fields
  provider?: string;
  model?: string;
  messages_count?: number;
  duration_ms: number;
  success: boolean;
  error?: string | null;
  response_preview?: string | null;
  // ToolCall fields
  tool?: string;
  arguments?: Record<string, unknown>;
  output_preview?: string;
  is_duplicate?: boolean | null;
}

export interface TrajectoryState {
  round: number;
  objective: string;
  evidence: string[];
  uncertainties: string[];
  failures: string[];
  next_plan: string[];
  tool_calls: number;
}

export interface AgentTrace {
  steps: AgentStep[];
  total_duration_ms: number;
  iterations: number;
  trajectory_states?: TrajectoryState[];
  early_stop_reason?: string | null;
}

export interface MessageResponse {
  response?: string;
  model?: string;
  tool_calls?: string[];
  duration_ms?: number;
  error?: string;
  trace?: AgentTrace;
}

export async function sendMessage(message: string): Promise<MessageResponse> {
  return apiFetch("/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ message }),
  });
}

// ── Status ─────────────────────────────────────────────────────────────────

export interface StatusResponse {
  version: string;
  uptime_seconds: number;
  pid: number;
  provider: string;
  model: string;
  temperature: number;
  autonomy_level: string;
  memory_backend: string;
  components: Record<
    string,
    {
      status: string;
      last_ok: string | null;
      last_error: string | null;
      restart_count: number;
    }
  >;
  workspace: {
    path: string;
    disk_free_mb: number | null;
  };
}

export async function getStatus(): Promise<StatusResponse> {
  return apiFetch("/status", {
    headers: { ...authHeaders() },
  });
}

// ── Prompts ────────────────────────────────────────────────────────────────

export interface PromptFile {
  filename: string;
  exists: boolean;
  role: string;
  chars: number;
  bytes: number;
  updated_epoch: number | null;
}

export interface PromptsListResponse {
  files: PromptFile[];
  total_chars: number;
  max_chars_per_file: number;
}

export interface PromptContentResponse {
  filename: string;
  content: string | null;
  chars: number;
  exists?: boolean;
}

export interface PromptPreviewResponse {
  preview: string;
  chars: number;
}

export async function getPrompts(): Promise<PromptsListResponse> {
  return apiFetch("/prompts", {
    headers: { ...authHeaders() },
  });
}

export async function getPromptFile(
  filename: string,
): Promise<PromptContentResponse> {
  return apiFetch(`/prompts/${encodeURIComponent(filename)}`, {
    headers: { ...authHeaders() },
  });
}

export async function updatePromptFile(
  filename: string,
  content: string,
): Promise<{ filename: string; chars: number; saved: boolean }> {
  return apiFetch(`/prompts/${encodeURIComponent(filename)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ content }),
  });
}

export async function getPromptsPreview(): Promise<PromptPreviewResponse> {
  return apiFetch("/prompts/preview", {
    headers: { ...authHeaders() },
  });
}

// ── Memory ────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  key: string;
  content: string;
  category: string;
  timestamp: string;
  session_id: string | null;
  score: number | null;
}

export interface MemoryListResponse {
  entries: MemoryEntry[];
  count: number;
}

export interface MemoryStatsResponse {
  backend: string;
  count: number;
  healthy: boolean;
}

export async function getMemoryList(
  category?: string,
  sessionId?: string,
): Promise<MemoryListResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sessionId) params.set("session_id", sessionId);
  const qs = params.toString();
  return apiFetch(`/memory${qs ? `?${qs}` : ""}`, {
    headers: { ...authHeaders() },
  });
}

export async function getMemoryStats(): Promise<MemoryStatsResponse> {
  return apiFetch("/memory/stats", {
    headers: { ...authHeaders() },
  });
}

export async function searchMemory(
  q: string,
  limit?: number,
): Promise<MemoryListResponse & { query: string }> {
  const params = new URLSearchParams({ q });
  if (limit) params.set("limit", String(limit));
  return apiFetch(`/memory/search?${params}`, {
    headers: { ...authHeaders() },
  });
}

export async function getMemoryEntry(key: string): Promise<MemoryEntry> {
  return apiFetch(`/memory/${encodeURIComponent(key)}`, {
    headers: { ...authHeaders() },
  });
}

export async function storeMemory(
  key: string,
  content: string,
  category?: string,
): Promise<{ stored: boolean; key: string }> {
  return apiFetch("/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ key, content, category }),
  });
}

export async function deleteMemory(
  key: string,
): Promise<{ deleted: boolean; key: string }> {
  return apiFetch(`/memory/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
}

// ── Tools ─────────────────────────────────────────────────────────────────

export interface ToolSummary {
  name: string;
  description: string;
}

export interface ToolDetail {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolsListResponse {
  tools: ToolSummary[];
  count: number;
}

export async function getToolsList(): Promise<ToolsListResponse> {
  return apiFetch("/tools", {
    headers: { ...authHeaders() },
  });
}

export async function getToolDetail(name: string): Promise<ToolDetail> {
  return apiFetch(`/tools/${encodeURIComponent(name)}`, {
    headers: { ...authHeaders() },
  });
}

// ── Cron Jobs ─────────────────────────────────────────────────────────────

export interface CronJob {
  id: string;
  expression: string;
  schedule: { kind: string; expr?: string; at?: string; every_ms?: number };
  command: string;
  prompt: string | null;
  name: string | null;
  job_type: string;
  session_target: string;
  model: string | null;
  enabled: boolean;
  delivery: { mode: string; channel: string | null; to: string | null; best_effort: boolean };
  delete_after_run: boolean;
  created_at: string;
  next_run: string;
  last_run: string | null;
  last_status: string | null;
  last_output: string | null;
}

export interface CronRun {
  id: number;
  job_id: string;
  started_at: string;
  finished_at: string;
  status: string;
  output: string | null;
  duration_ms: number | null;
}

export interface CronJobsListResponse {
  jobs: CronJob[];
  count: number;
}

export interface CronRunsResponse {
  runs: CronRun[];
  count: number;
  job_id: string;
}

export async function getCronJobs(): Promise<CronJobsListResponse> {
  return apiFetch("/cron/jobs", {
    headers: { ...authHeaders() },
  });
}

export async function getCronJob(id: string): Promise<CronJob> {
  return apiFetch(`/cron/jobs/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  });
}

export async function createCronJob(
  body: Record<string, unknown>,
): Promise<CronJob> {
  return apiFetch("/cron/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
}

export async function updateCronJob(
  id: string,
  patch: Record<string, unknown>,
): Promise<CronJob> {
  return apiFetch(`/cron/jobs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
}

export async function deleteCronJob(
  id: string,
): Promise<{ deleted: boolean; id: string }> {
  return apiFetch(`/cron/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
}

export async function getCronRuns(
  jobId: string,
  limit?: number,
): Promise<CronRunsResponse> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return apiFetch(`/cron/jobs/${encodeURIComponent(jobId)}/runs${qs ? `?${qs}` : ""}`, {
    headers: { ...authHeaders() },
  });
}

// ── Audit Logs ────────────────────────────────────────────────────────────

export interface AuditEntry {
  timestamp: string;
  event_id: string;
  event_type: string;
  actor: { channel: string; user_id: string | null; username: string | null } | null;
  action: { command: string | null; risk_level: string | null; approved: boolean; allowed: boolean } | null;
  result: { success: boolean; exit_code: number | null; duration_ms: number | null; error: string | null } | null;
  security: { policy_violation: boolean; rate_limit_remaining: number | null; sandbox_backend: string | null };
}

export interface AuditLogsResponse {
  entries: AuditEntry[];
  count: number;
  total: number;
  offset: number;
  limit: number;
  enabled: boolean;
  message?: string;
}

export async function getAuditLogs(
  eventType?: string,
  limit?: number,
  offset?: number,
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  if (eventType) params.set("type", eventType);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return apiFetch(`/audit/logs${qs ? `?${qs}` : ""}`, {
    headers: { ...authHeaders() },
  });
}

// ── Metrics ───────────────────────────────────────────────────────────────

export interface MetricsResponse {
  uptime_seconds: number;
  pid: number;
  observer: string;
  components: {
    ok: number;
    error: number;
    total: number;
    total_restarts: number;
  };
  memory: {
    backend: string;
    count: number;
    healthy: boolean;
  };
  tools: {
    registered: number;
  };
  cron: {
    total: number;
    active: number;
    paused: number;
  } | null;
  hint: string;
}

export async function getMetrics(): Promise<MetricsResponse> {
  return apiFetch("/metrics", {
    headers: { ...authHeaders() },
  });
}

// ── Skills ────────────────────────────────────────────────────────────────

export interface SkillSummary {
  name: string;
  description: string;
  version: string;
  author: string | null;
  tags: string[];
  tools_count: number;
  prompts_count: number;
}

export interface SkillDetail {
  name: string;
  description: string;
  version: string;
  author: string | null;
  tags: string[];
  tools: { name: string; description: string; kind: string; command: string }[];
  prompts: string[];
}

export interface SkillsListResponse {
  skills: SkillSummary[];
  count: number;
}

export async function getSkillsList(): Promise<SkillsListResponse> {
  return apiFetch("/skills", {
    headers: { ...authHeaders() },
  });
}

export async function getSkillDetail(name: string): Promise<SkillDetail> {
  return apiFetch(`/skills/${encodeURIComponent(name)}`, {
    headers: { ...authHeaders() },
  });
}

// ── Config ────────────────────────────────────────────────────────────────

export interface ConfigResponse {
  default_provider: string | null;
  default_model: string | null;
  default_temperature: number;
  api_key: string | null;
  api_url: string | null;
  autonomy: { level: string; workspace_only: boolean; max_actions_per_hour: number };
  memory: { backend: string; auto_save: boolean };
  heartbeat: { enabled: boolean; interval_minutes: number };
  cron: { enabled: boolean; max_run_history: number };
  observability: { backend: string };
  gateway: { port: number; host: string; require_pairing: boolean };
  cost: { enabled: boolean; daily_limit_usd: number; monthly_limit_usd: number; warn_at_percent: number };
  agent: {
    max_tool_iterations: number;
    max_history_messages: number;
    parallel_tools: boolean;
    trajectory_compression_enabled: boolean;
    trajectory_state_max_items: number;
    trajectory_max_rounds: number;
    trajectory_stop_on_redundant_rounds: number;
    trajectory_tool_call_dedup_window: number;
  };
  channels_config: { message_timeout_secs: number };
  scheduler: { max_concurrent: number; max_tasks: number };
  reliability: { scheduler_poll_secs: number; scheduler_retries: number };
}

export interface ConfigPatchResponse {
  updated: string[];
  rejected: string[];
  rejected_reason: string | null;
}

export async function getConfig(): Promise<ConfigResponse> {
  return apiFetch("/config", {
    headers: { ...authHeaders() },
  });
}

export async function patchConfig(
  patch: Record<string, unknown>,
): Promise<ConfigPatchResponse> {
  return apiFetch("/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
}

// ── Channels ──────────────────────────────────────────────────────────────

export interface ChannelInfo {
  name: string;
  configured: boolean;
  status: string;
  restart_count: number;
  last_ok: string | null;
  last_error: string | null;
}

export interface ChannelsListResponse {
  channels: ChannelInfo[];
  total: number;
  configured: number;
}

export async function getChannelsList(): Promise<ChannelsListResponse> {
  return apiFetch("/channels", {
    headers: { ...authHeaders() },
  });
}
