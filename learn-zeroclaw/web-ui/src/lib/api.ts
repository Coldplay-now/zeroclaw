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

export async function sendMessage(
  message: string,
): Promise<{ response?: string; model?: string; error?: string }> {
  return apiFetch("/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ message }),
  });
}

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
