import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./Dashboard";
import "@/i18n";

// 模拟 API
vi.mock("@/lib/api", () => ({
  getStatus: vi.fn(),
}));

import { getStatus } from "@/lib/api";

const mockStatus = {
  version: "0.1.0",
  uptime_seconds: 3661,
  pid: 12345,
  provider: "openai",
  model: "openai/gpt-4o",
  temperature: 0.7,
  autonomy_level: "supervised",
  memory_backend: "sqlite",
  components: {
    gateway: {
      status: "ok",
      last_ok: "2025-01-01T00:00:00Z",
      last_error: null,
      restart_count: 0,
    },
    memory: {
      status: "ok",
      last_ok: "2025-01-01T00:00:00Z",
      last_error: null,
      restart_count: 1,
    },
  },
  workspace: {
    path: "/workspace",
    disk_free_mb: 1024,
  },
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    // getStatus 永远 pending
    vi.mocked(getStatus).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("ZeroClaw Dashboard")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getStatus).mockRejectedValue(new Error("Network error"));
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("成功渲染状态数据", async () => {
    vi.mocked(getStatus).mockResolvedValue(mockStatus);
    renderWithProviders(<Dashboard />);
    // 等待数据加载完成
    expect(await screen.findByText("v0.1.0")).toBeInTheDocument();
    // 模型名称（取最后一段）
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    // 内存后端
    expect(screen.getByText("sqlite")).toBeInTheDocument();
    // 自治级别
    expect(screen.getByText("supervised")).toBeInTheDocument();
    // 组件健康状态
    expect(screen.getByText("gateway")).toBeInTheDocument();
    expect(screen.getByText("memory")).toBeInTheDocument();
    // 运行时间：1h 1m
    expect(screen.getByText(/1h 1m/)).toBeInTheDocument();
    // 磁盘空间
    expect(screen.getByText("1,024 MB free")).toBeInTheDocument();
  });
});
