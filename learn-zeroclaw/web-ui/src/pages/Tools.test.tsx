import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Tools } from "./Tools";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getToolsList: vi.fn(),
  getToolDetail: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getToolsList } from "@/lib/api";

const mockTools = {
  tools: [
    { name: "shell", description: "Execute shell commands" },
    { name: "file_read", description: "Read file contents" },
    { name: "memory_store", description: "Store a memory entry" },
    { name: "http_request", description: "Make HTTP requests" },
  ],
  count: 4,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getToolsList).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Tools />);
    expect(screen.getByText("Tools")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getToolsList).mockRejectedValue(new Error("API error"));
    renderWithProviders(<Tools />);
    expect(await screen.findByText("API error")).toBeInTheDocument();
  });

  it("成功渲染工具列表", async () => {
    vi.mocked(getToolsList).mockResolvedValue(mockTools);
    renderWithProviders(<Tools />);
    expect(await screen.findByText("shell")).toBeInTheDocument();
    expect(screen.getByText("file_read")).toBeInTheDocument();
    expect(screen.getByText("memory_store")).toBeInTheDocument();
    expect(screen.getByText("http_request")).toBeInTheDocument();
    expect(screen.getByText("4 registered")).toBeInTheDocument();
  });

  it("显示工具描述", async () => {
    vi.mocked(getToolsList).mockResolvedValue(mockTools);
    renderWithProviders(<Tools />);
    expect(await screen.findByText("Execute shell commands")).toBeInTheDocument();
    expect(screen.getByText("Read file contents")).toBeInTheDocument();
  });
});
