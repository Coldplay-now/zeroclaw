import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentTrace, AgentStep } from "@/lib/api";
import {
  X,
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  Layers,
} from "lucide-react";

interface TraceInspectorProps {
  trace: AgentTrace;
  model?: string;
  onClose: () => void;
}

export function TraceInspector({ trace, model, onClose }: TraceInspectorProps) {
  const { t } = useTranslation("chat");

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {t("inspector.title", "Interaction Inspector")}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b space-y-1 shrink-0">
        {model && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Model:</span>
            <span className="font-mono">{model}</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {trace.total_duration_ms}ms
          </span>
          <span className="text-muted-foreground">
            {trace.iterations}{" "}
            {trace.iterations === 1
              ? t("inspector.iteration", "iteration")
              : t("inspector.iterations", "iterations")}
          </span>
          <span className="text-muted-foreground">
            {trace.steps.length}{" "}
            {trace.steps.length === 1
              ? t("inspector.step", "step")
              : t("inspector.steps", "steps")}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Timeline
          </div>
          <div className="space-y-1">
            {trace.steps.map((step, i) => (
              <StepItem key={i} step={step} index={i} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function StepItem({ step, index }: { step: AgentStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLlm = step.type === "LlmRequest";

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Step header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}

        {/* Step type icon */}
        {isLlm ? (
          <Brain className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0 text-orange-500" />
        )}

        {/* Step label */}
        <span className="text-xs font-medium truncate flex-1">
          {isLlm
            ? `LLM Request`
            : `Tool: ${step.tool ?? "unknown"}`}
        </span>

        {/* Success/fail badge */}
        {step.success ? (
          <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-3 w-3 shrink-0 text-destructive" />
        )}

        {/* Duration */}
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {step.duration_ms}ms
        </span>

        {/* Step number */}
        <span className="text-[10px] text-muted-foreground shrink-0">
          #{index + 1}
        </span>
      </button>

      {/* Step details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t bg-muted/30 space-y-2">
          {isLlm ? (
            <LlmStepDetail step={step} />
          ) : (
            <ToolStepDetail step={step} />
          )}
        </div>
      )}
    </div>
  );
}

function LlmStepDetail({ step }: { step: AgentStep }) {
  return (
    <>
      <DetailRow label="Provider" value={step.provider} />
      <DetailRow label="Model" value={step.model} />
      <DetailRow
        label="Messages"
        value={step.messages_count?.toString()}
      />
      <DetailRow label="Duration" value={`${step.duration_ms}ms`} />
      {step.error && <DetailRow label="Error" value={step.error} isError />}
      {step.response_preview && (
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            Response Preview
          </div>
          <pre className="text-xs font-mono bg-background rounded p-2 whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {step.response_preview}
          </pre>
        </div>
      )}
    </>
  );
}

function ToolStepDetail({ step }: { step: AgentStep }) {
  return (
    <>
      <DetailRow label="Tool" value={step.tool} />
      <DetailRow label="Duration" value={`${step.duration_ms}ms`} />
      <DetailRow
        label="Status"
        value={step.success ? "Success" : "Failed"}
        isError={!step.success}
      />
      {step.arguments && Object.keys(step.arguments).length > 0 && (
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            Arguments
          </div>
          <pre className="text-xs font-mono bg-background rounded p-2 whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {JSON.stringify(step.arguments, null, 2)}
          </pre>
        </div>
      )}
      {step.output_preview && (
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            Output
          </div>
          <pre className="text-xs font-mono bg-background rounded p-2 whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {step.output_preview}
          </pre>
        </div>
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  isError,
}: {
  label: string;
  value?: string | null;
  isError?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span
        className={`font-mono break-all ${isError ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
