# Baseline Eval Summary

## Overall

- Total runs: 5
- Success runs: 2
- Success rate: 40.00%
- Avg latency: 25075.20 ms
- P95 latency: 30004.00 ms
- Avg iterations: 1.50
- Avg tool calls: 0.20
- Failure distribution: http_error=3

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| smoke-001 | 1 | 100.00 | 9152.00 | 1.00 | 0.00 |
| smoke-002 | 1 | 100.00 | 26211.00 | 2.00 | 1.00 |
| smoke-003 | 1 | 0.00 | 30004.00 | n/a | 0.00 |
| smoke-004 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| smoke-005 | 1 | 0.00 | 30004.00 | n/a | 0.00 |

## Category Coverage

| Category | Runs |
|---|---:|
| cost | 1 |
| planning | 1 |
| qa | 1 |
| scheduler | 1 |
| tools | 1 |

## Notes

- 本报告只统计自动可采集指标。
- `score_quality` 建议按 `learn-zeroclaw/eval/rubric.md` 人工补充。
- 引入 RE-TRAC-lite 后请复用同一任务集与参数再跑一轮。
