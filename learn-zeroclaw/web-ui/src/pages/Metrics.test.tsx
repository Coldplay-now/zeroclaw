import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Metrics } from "./Metrics";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getMetrics: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getMetrics } from "@/lib/api";

const mockMetrics = {
  uptime_seconds: 7265,
  pid: 12345,
  observer: "log",
  components: {
    total: 5,
    ok: 4,
    error: 1,
    total_restarts: 3,
  },
  memory: {
    backend: "sqlite",
    count: 128,
    healthy: true,
  },
  tools: {
    registered: 15,
  },
  cron: {
    total: 4,
    active: 2,
    paused: 2,
  },
  hint: "Configure otel for time-series charts.",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getMetrics).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Metrics />);
    expect(screen.getByText("Metrics")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getMetrics).mockRejectedValue(new Error("Server error"));
    renderWithProviders(<Metrics />);
    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });

  it("成功渲染系统概览", async () => {
    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);
    renderWithProviders(<Metrics />);
    expect(await screen.findByText("2h 1m")).toBeInTheDocument();
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
  });

  it("显示子系统详情", async () => {
    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);
    renderWithProviders(<Metrics />);
    expect(await screen.findByText("sqlite")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });
});
