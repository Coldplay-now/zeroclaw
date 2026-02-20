import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Scheduler } from "./Scheduler";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getCronJobs: vi.fn(),
  getCronRuns: vi.fn(),
  createCronJob: vi.fn(),
  updateCronJob: vi.fn(),
  deleteCronJob: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getCronJobs } from "@/lib/api";

const mockJobs = {
  jobs: [
    {
      id: "abc-123",
      expression: "0 * * * *",
      schedule: { kind: "cron", expr: "0 * * * *" },
      command: "",
      prompt: "Summarize the day",
      name: "Daily Summary",
      job_type: "agent",
      session_target: "isolated",
      model: null,
      enabled: true,
      delivery: { mode: "silent", channel: null, to: null, best_effort: true },
      delete_after_run: false,
      created_at: "2024-01-01T00:00:00Z",
      next_run: "2024-01-02T00:00:00Z",
      last_run: "2024-01-01T12:00:00Z",
      last_status: "ok",
      last_output: "Summary completed",
    },
    {
      id: "def-456",
      expression: "*/5 * * * *",
      schedule: { kind: "cron", expr: "*/5 * * * *" },
      command: "echo heartbeat",
      prompt: null,
      name: "Heartbeat",
      job_type: "shell",
      session_target: "isolated",
      model: null,
      enabled: false,
      delivery: { mode: "silent", channel: null, to: null, best_effort: true },
      delete_after_run: false,
      created_at: "2024-01-01T00:00:00Z",
      next_run: "2024-01-02T00:05:00Z",
      last_run: null,
      last_status: null,
      last_output: null,
    },
  ],
  count: 2,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getCronJobs).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Scheduler />);
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getCronJobs).mockRejectedValue(new Error("DB locked"));
    renderWithProviders(<Scheduler />);
    expect(await screen.findByText("DB locked")).toBeInTheDocument();
  });

  it("成功渲染任务列表", async () => {
    vi.mocked(getCronJobs).mockResolvedValue(mockJobs);
    renderWithProviders(<Scheduler />);
    expect(await screen.findByText("Daily Summary")).toBeInTheDocument();
    expect(screen.getByText("Heartbeat")).toBeInTheDocument();
  });

  it("显示统计摘要", async () => {
    vi.mocked(getCronJobs).mockResolvedValue(mockJobs);
    renderWithProviders(<Scheduler />);
    await screen.findByText("Daily Summary");
    // 1 active, 1 paused
    const activeCard = screen.getByText("Active");
    expect(activeCard).toBeInTheDocument();
    const pausedCard = screen.getByText("Paused");
    expect(pausedCard).toBeInTheDocument();
  });
});
