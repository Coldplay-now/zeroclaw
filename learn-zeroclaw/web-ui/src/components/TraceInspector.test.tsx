import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { TraceInspector } from "./TraceInspector";
import type { AgentTrace } from "@/lib/api";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const baseTrace: AgentTrace = {
  total_duration_ms: 1240,
  iterations: 2,
  early_stop_reason: "redundant_rounds",
  trajectory_states: [
    {
      round: 1,
      objective: "Collect deployment status",
      tool_calls: 2,
      evidence: ["Status API reachable"],
      uncertainties: [],
      failures: [],
      next_plan: ["Summarize health check"],
    },
  ],
  steps: [
    {
      type: "LlmRequest",
      provider: "openai",
      model: "gpt-4o",
      messages_count: 4,
      duration_ms: 510,
      success: true,
      response_preview: "I will call a tool",
    },
    {
      type: "ToolCall",
      tool: "status_check",
      arguments: { url: "http://127.0.0.1:3000/health" },
      output_preview: "ok",
      duration_ms: 20,
      success: true,
      is_duplicate: true,
    },
  ],
};

describe("TraceInspector", () => {
  it("renders trajectory and early-stop summary", () => {
    render(<TraceInspector trace={baseTrace} model="gpt-4o" onClose={vi.fn()} />);
    expect(screen.getByText("Early stop: redundant_rounds")).toBeInTheDocument();
    expect(screen.getByText("Duplicates skipped: 1")).toBeInTheDocument();
    expect(screen.getByText("Round #1")).toBeInTheDocument();
  });

  it("expands tool step and shows duplicate status", async () => {
    const user = userEvent.setup();
    render(<TraceInspector trace={baseTrace} model="gpt-4o" onClose={vi.fn()} />);
    await user.click(screen.getByText("Tool: status_check"));
    expect(screen.getByText("Skipped duplicate")).toBeInTheDocument();
  });
});

