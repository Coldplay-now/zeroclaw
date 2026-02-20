import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Channels } from "./Channels";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getChannelsList: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getChannelsList } from "@/lib/api";

const mockChannelsResponse = {
  channels: [
    { name: "telegram", configured: true, status: "ok", restart_count: 0, last_ok: "2024-01-01T00:00:00Z", last_error: null },
    { name: "discord", configured: true, status: "error", restart_count: 2, last_ok: null, last_error: "Connection lost" },
    { name: "slack", configured: false, status: "unknown", restart_count: 0, last_ok: null, last_error: null },
    { name: "cli", configured: true, status: "ok", restart_count: 0, last_ok: "2024-01-01T00:00:00Z", last_error: null },
  ],
  total: 4,
  configured: 3,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Channels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getChannelsList).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Channels />);
    expect(screen.getByText("Channels")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getChannelsList).mockRejectedValue(new Error("API error"));
    renderWithProviders(<Channels />);
    expect(await screen.findByText("API error")).toBeInTheDocument();
  });

  it("成功渲染已配置通道", async () => {
    vi.mocked(getChannelsList).mockResolvedValue(mockChannelsResponse);
    renderWithProviders(<Channels />);
    expect(await screen.findByText("telegram")).toBeInTheDocument();
    expect(screen.getByText("discord")).toBeInTheDocument();
  });

  it("显示配置统计", async () => {
    vi.mocked(getChannelsList).mockResolvedValue(mockChannelsResponse);
    renderWithProviders(<Channels />);
    expect(await screen.findByText(/3 \/ 4/)).toBeInTheDocument();
  });
});
