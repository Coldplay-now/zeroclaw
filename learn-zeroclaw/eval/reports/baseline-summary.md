# Baseline Eval Summary

## Overall

- Total runs: 15
- Success runs: 14
- Success rate: 93.33%
- Avg latency: 57486.27 ms
- P95 latency: 111941.00 ms
- Avg iterations: 2.50
- Avg tool calls: 1.13

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| smoke-001 | 3 | 100.00 | 22524.00 | 1.33 | 0.33 |
| smoke-002 | 3 | 100.00 | 63879.00 | 3.33 | 0.33 |
| smoke-003 | 3 | 66.67 | 78604.33 | 2.00 | 0.00 |
| smoke-004 | 3 | 100.00 | 86300.00 | 4.67 | 5.00 |
| smoke-005 | 3 | 100.00 | 36124.00 | 1.00 | 0.00 |

## Notes

- 本报告只统计自动可采集指标。
- `score_quality` 建议按 `learn-zeroclaw/eval/rubric.md` 人工补充。
- 引入 RE-TRAC-lite 后请复用同一任务集与参数再跑一轮。
