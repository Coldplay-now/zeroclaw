# Baseline Eval Summary

## Overall

- Total runs: 15
- Success runs: 11
- Success rate: 73.33%
- Avg latency: 22622.87 ms
- P95 latency: 30004.00 ms
- Avg iterations: 1.36
- Avg tool calls: 0.47
- Failure distribution: http_error=4

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| smoke-001 | 3 | 100.00 | 13042.33 | 1.67 | 1.67 |
| smoke-002 | 3 | 33.33 | 27472.33 | 1.00 | 0.00 |
| smoke-003 | 3 | 66.67 | 25430.33 | 1.00 | 0.00 |
| smoke-004 | 3 | 100.00 | 23618.00 | 1.67 | 0.67 |
| smoke-005 | 3 | 66.67 | 23551.33 | 1.00 | 0.00 |

## Category Coverage

| Category | Runs |
|---|---:|
| cost | 3 |
| planning | 3 |
| qa | 3 |
| scheduler | 3 |
| tools | 3 |

## Notes

- 本报告只统计自动可采集指标。
- `score_quality` 建议按 `learn-zeroclaw/eval/rubric.md` 人工补充。
- 引入 RE-TRAC-lite 后请复用同一任务集与参数再跑一轮。
