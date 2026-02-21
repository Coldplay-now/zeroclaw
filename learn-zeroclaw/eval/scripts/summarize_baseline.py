#!/usr/bin/env python3
import argparse
import json
from collections import defaultdict


def read_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def avg(values):
    values = [v for v in values if isinstance(v, (int, float))]
    if not values:
        return None
    return sum(values) / len(values)


def p95(values):
    values = sorted([v for v in values if isinstance(v, (int, float))])
    if not values:
        return None
    idx = int(0.95 * (len(values) - 1))
    return values[idx]


def fmt_num(v, digits=2):
    if v is None:
        return "n/a"
    return f"{v:.{digits}f}"


def main():
    parser = argparse.ArgumentParser(description="Summarize baseline raw results.")
    parser.add_argument("--input", required=True, help="Raw JSONL path")
    parser.add_argument("--output", required=True, help="Markdown summary output path")
    args = parser.parse_args()

    rows = read_jsonl(args.input)
    total = len(rows)
    success = sum(1 for r in rows if r.get("result", {}).get("ok") is True)

    latency = [r.get("result", {}).get("latency_ms") for r in rows]
    iterations = [r.get("result", {}).get("iterations") for r in rows]
    tool_calls = [r.get("result", {}).get("tool_calls") for r in rows]

    by_task = defaultdict(list)
    for row in rows:
        by_task[row.get("task_id")].append(row)

    lines = []
    lines.append("# Baseline Eval Summary")
    lines.append("")
    lines.append("## Overall")
    lines.append("")
    lines.append(f"- Total runs: {total}")
    lines.append(f"- Success runs: {success}")
    lines.append(f"- Success rate: {fmt_num((success / total * 100) if total else None)}%")
    lines.append(f"- Avg latency: {fmt_num(avg(latency))} ms")
    lines.append(f"- P95 latency: {fmt_num(p95(latency))} ms")
    lines.append(f"- Avg iterations: {fmt_num(avg(iterations))}")
    lines.append(f"- Avg tool calls: {fmt_num(avg(tool_calls))}")
    lines.append("")
    lines.append("## Per Task")
    lines.append("")
    lines.append("| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |")
    lines.append("|---|---:|---:|---:|---:|---:|")

    for task_id in sorted(by_task.keys()):
        task_rows = by_task[task_id]
        t_total = len(task_rows)
        t_success = sum(1 for r in task_rows if r.get("result", {}).get("ok") is True)
        t_latency = [r.get("result", {}).get("latency_ms") for r in task_rows]
        t_iter = [r.get("result", {}).get("iterations") for r in task_rows]
        t_tools = [r.get("result", {}).get("tool_calls") for r in task_rows]
        lines.append(
            f"| {task_id} | {t_total} | {fmt_num((t_success / t_total * 100) if t_total else None)} | "
            f"{fmt_num(avg(t_latency))} | {fmt_num(avg(t_iter))} | {fmt_num(avg(t_tools))} |"
        )

    lines.append("")
    lines.append("## Notes")
    lines.append("")
    lines.append("- 本报告只统计自动可采集指标。")
    lines.append("- `score_quality` 建议按 `learn-zeroclaw/eval/rubric.md` 人工补充。")
    lines.append("- 引入 RE-TRAC-lite 后请复用同一任务集与参数再跑一轮。")

    with open(args.output, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"Wrote summary: {args.output}")


if __name__ == "__main__":
    main()
