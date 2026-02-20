import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Audit } from "./Audit";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getAuditLogs: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getAuditLogs } from "@/lib/api";

const mockAuditResponse = {
  entries: [
    {
      timestamp: "2024-01-15T10:30:00Z",
      event_id: "evt_1",
      event_type: "command_execution",
      actor: { type: "agent" },
      action: { command: "ls -la", risk_level: "low" },
      result: { success: true },
      security: null,
    },
    {
      timestamp: "2024-01-15T10:25:00Z",
      event_id: "evt_2",
      event_type: "policy_violation",
      actor: { type: "agent" },
      action: { command: "rm -rf /", risk_level: "high" },
      result: { success: false },
      security: { violation: "blocked_command" },
    },
  ],
  count: 2,
  total: 2,
  offset: 0,
  limit: 50,
  enabled: true,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getAuditLogs).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Audit />);
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getAuditLogs).mockRejectedValue(new Error("Connection refused"));
    renderWithProviders(<Audit />);
    expect(await screen.findByText("Connection refused")).toBeInTheDocument();
  });

  it("成功渲染审计条目列表", async () => {
    vi.mocked(getAuditLogs).mockResolvedValue(mockAuditResponse);
    renderWithProviders(<Audit />);
    const commandExecElements = await screen.findAllByText("Command Execution");
    expect(commandExecElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Policy Violation").length).toBeGreaterThanOrEqual(1);
  });

  it("显示事件类型筛选器", async () => {
    vi.mocked(getAuditLogs).mockResolvedValue(mockAuditResponse);
    renderWithProviders(<Audit />);
    expect(await screen.findByText("All Types")).toBeInTheDocument();
  });
});
