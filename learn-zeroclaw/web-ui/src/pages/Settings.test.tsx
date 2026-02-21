import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Settings } from "./Settings";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getConfig: vi.fn(),
  patchConfig: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getConfig } from "@/lib/api";

const mockConfig = {
  default_provider: "openai",
  default_model: "gpt-4o",
  default_temperature: 0.7,
  api_key: "***",
  api_url: null,
  autonomy: { level: "supervised", workspace_only: true, max_actions_per_hour: 60 },
  memory: { backend: "sqlite", auto_save: true },
  heartbeat: { enabled: false, interval_minutes: 30 },
  cron: { enabled: true, max_run_history: 50 },
  observability: { backend: "log" },
  gateway: { port: 3000, host: "127.0.0.1", require_pairing: true },
  cost: { enabled: true, daily_limit_usd: 10, monthly_limit_usd: 100, warn_at_percent: 80 },
  agent: { max_tool_iterations: 10, max_history_messages: 50, parallel_tools: true },
  channels_config: { message_timeout_secs: 300 },
  scheduler: { max_concurrent: 4, max_tasks: 64 },
  reliability: { scheduler_poll_secs: 15, scheduler_retries: 2 },
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getConfig).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getConfig).mockRejectedValue(new Error("Connection failed"));
    renderWithProviders(<Settings />);
    expect(await screen.findByText("Connection failed")).toBeInTheDocument();
  });

  it("成功渲染配置数据", async () => {
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    renderWithProviders(<Settings />);
    expect(await screen.findByDisplayValue("gpt-4o")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0.7")).toBeInTheDocument();
  });

  it("显示只读网关配置", async () => {
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    renderWithProviders(<Settings />);
    expect(await screen.findByText("3000")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
  });
});
