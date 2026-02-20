import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Skills } from "./Skills";
import "@/i18n";

vi.mock("@/lib/api", () => ({
  getSkillsList: vi.fn(),
  getSkillDetail: vi.fn(),
  getPrompts: vi.fn(),
  getPromptFile: vi.fn(),
  updatePromptFile: vi.fn(),
  getPromptsPreview: vi.fn(),
}));

import { getSkillsList } from "@/lib/api";

const mockSkillsResponse = {
  skills: [
    {
      name: "web-search",
      description: "Search the web using various engines",
      version: "1.0.0",
      author: "zeroclaw",
      tags: ["search", "web"],
      tools_count: 2,
      prompts_count: 1,
    },
    {
      name: "code-review",
      description: "Automated code review assistant",
      version: "0.2.0",
      author: null,
      tags: ["dev"],
      tools_count: 1,
      prompts_count: 0,
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

describe("Skills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载骨架屏", () => {
    vi.mocked(getSkillsList).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Skills />);
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("显示错误状态", async () => {
    vi.mocked(getSkillsList).mockRejectedValue(new Error("Network error"));
    renderWithProviders(<Skills />);
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("成功渲染技能列表", async () => {
    vi.mocked(getSkillsList).mockResolvedValue(mockSkillsResponse);
    renderWithProviders(<Skills />);
    expect(await screen.findByText("web-search")).toBeInTheDocument();
    expect(screen.getByText("code-review")).toBeInTheDocument();
  });

  it("显示技能标签", async () => {
    vi.mocked(getSkillsList).mockResolvedValue(mockSkillsResponse);
    renderWithProviders(<Skills />);
    expect(await screen.findByText("search")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
  });
});
