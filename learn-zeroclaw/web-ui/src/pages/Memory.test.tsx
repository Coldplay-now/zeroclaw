import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Memory } from "./Memory";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getMemoryList: vi.fn(),
  getMemoryStats: vi.fn(),
  searchMemory: vi.fn(),
  storeMemory: vi.fn(),
  deleteMemory: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getMemoryList, getMemoryStats } from "@/lib/api";

const mockStats = { backend: "sqlite", count: 42, healthy: true };
const mockEntries = {
  entries: [
    {
      id: "1",
      key: "greeting",
      content: "Hello world",
      category: "core",
      timestamp: "2024-01-01T00:00:00Z",
      session_id: null,
      score: null,
    },
    {
      id: "2",
      key: "daily_log",
      content: "Today was productive",
      category: "daily",
      timestamp: "2024-01-02T00:00:00Z",
      session_id: "sess_1",
      score: null,
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

describe("Memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getMemoryList).mockReturnValue(new Promise(() => {}));
    vi.mocked(getMemoryStats).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Memory />);
    expect(screen.getByText("Memory")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getMemoryList).mockRejectedValue(new Error("Connection refused"));
    vi.mocked(getMemoryStats).mockRejectedValue(new Error("Connection refused"));
    renderWithProviders(<Memory />);
    expect(await screen.findByText("Connection refused")).toBeInTheDocument();
  });

  it("成功渲染记忆条目列表", async () => {
    vi.mocked(getMemoryList).mockResolvedValue(mockEntries);
    vi.mocked(getMemoryStats).mockResolvedValue(mockStats);
    renderWithProviders(<Memory />);
    expect(await screen.findByText("greeting")).toBeInTheDocument();
    expect(screen.getByText("daily_log")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("显示统计信息", async () => {
    vi.mocked(getMemoryList).mockResolvedValue(mockEntries);
    vi.mocked(getMemoryStats).mockResolvedValue(mockStats);
    renderWithProviders(<Memory />);
    expect(await screen.findByText("sqlite")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
});
