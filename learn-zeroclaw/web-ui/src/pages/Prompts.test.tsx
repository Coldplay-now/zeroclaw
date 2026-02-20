import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Prompts } from "./Prompts";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getPrompts } from "@/lib/api";

const mockPrompts = {
  files: [
    { filename: "AGENTS.md", exists: true, role: "Session bootstrap instructions", chars: 500, bytes: 600, updated_epoch: 1700000000 },
    { filename: "SOUL.md", exists: true, role: "Core personality and values", chars: 1200, bytes: 1400, updated_epoch: 1700000000 },
    { filename: "TOOLS.md", exists: true, role: "Tool usage guidance", chars: 300, bytes: 350, updated_epoch: 1700000000 },
    { filename: "IDENTITY.md", exists: true, role: "Agent identity definition", chars: 800, bytes: 900, updated_epoch: 1700000000 },
    { filename: "USER.md", exists: true, role: "User profile and preferences", chars: 200, bytes: 250, updated_epoch: 1700000000 },
    { filename: "HEARTBEAT.md", exists: true, role: "Periodic heartbeat tasks", chars: 400, bytes: 450, updated_epoch: 1700000000 },
    { filename: "BOOTSTRAP.md", exists: false, role: "Custom bootstrap instructions", chars: 0, bytes: 0, updated_epoch: null },
    { filename: "MEMORY.md", exists: true, role: "Long-term memory (agent-managed)", chars: 2000, bytes: 2200, updated_epoch: 1700000000 },
  ],
  total_chars: 5400,
  max_chars_per_file: 20000,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getPrompts).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Prompts />);
    expect(screen.getByText("System Prompts")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getPrompts).mockRejectedValue(new Error("Network error"));
    renderWithProviders(<Prompts />);
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("成功渲染提示词文件列表", async () => {
    vi.mocked(getPrompts).mockResolvedValue(mockPrompts);
    renderWithProviders(<Prompts />);
    // 等待数据加载
    expect(await screen.findByText("AGENTS.md")).toBeInTheDocument();
    expect(screen.getByText("SOUL.md")).toBeInTheDocument();
    expect(screen.getByText("TOOLS.md")).toBeInTheDocument();
    expect(screen.getByText("IDENTITY.md")).toBeInTheDocument();
    expect(screen.getByText("MEMORY.md")).toBeInTheDocument();
    // 未创建文件显示 Create 按钮
    expect(screen.getByText("Create")).toBeInTheDocument();
    // 已存在文件显示 Edit 按钮
    const editButtons = screen.getAllByText("Edit");
    expect(editButtons.length).toBe(7);
    // 总字符数
    expect(screen.getByText("5,400")).toBeInTheDocument();
  });

  it("显示角色说明", async () => {
    vi.mocked(getPrompts).mockResolvedValue(mockPrompts);
    renderWithProviders(<Prompts />);
    expect(await screen.findByText("Session bootstrap instructions")).toBeInTheDocument();
    expect(screen.getByText("Core personality and values")).toBeInTheDocument();
  });
});
