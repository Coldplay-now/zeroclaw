# Baseline Eval Summary

## Overall

- Total runs: 20
- Success runs: 19
- Success rate: 95.00%
- Avg latency: 34092.80 ms
- P95 latency: 67778.00 ms
- Avg iterations: 1.74
- Avg tool calls: 1.20
- Failure distribution: http_error=1

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 1 | 100.00 | 36243.00 | 1.00 | 0.00 |
| baseline-007 | 1 | 100.00 | 44935.00 | 6.00 | 5.00 |
| baseline-008 | 1 | 100.00 | 25689.00 | 1.00 | 0.00 |
| baseline-009 | 1 | 100.00 | 33312.00 | 4.00 | 8.00 |
| baseline-010 | 1 | 0.00 | 120004.00 | n/a | 0.00 |
| baseline-011 | 1 | 100.00 | 20044.00 | 1.00 | 0.00 |
| baseline-012 | 1 | 100.00 | 20650.00 | 1.00 | 0.00 |
| baseline-013 | 1 | 100.00 | 16566.00 | 3.00 | 6.00 |
| baseline-014 | 1 | 100.00 | 13679.00 | 2.00 | 1.00 |
| baseline-015 | 1 | 100.00 | 67778.00 | 1.00 | 0.00 |
| baseline-016 | 1 | 100.00 | 22013.00 | 1.00 | 0.00 |
| baseline-017 | 1 | 100.00 | 30419.00 | 1.00 | 0.00 |
| baseline-018 | 1 | 100.00 | 25734.00 | 2.00 | 1.00 |
| baseline-019 | 1 | 100.00 | 60083.00 | 1.00 | 0.00 |
| baseline-020 | 1 | 100.00 | 14740.00 | 1.00 | 0.00 |
| smoke-001 | 1 | 100.00 | 11919.00 | 2.00 | 1.00 |
| smoke-002 | 1 | 100.00 | 28016.00 | 1.00 | 0.00 |
| smoke-003 | 1 | 100.00 | 38807.00 | 1.00 | 0.00 |
| smoke-004 | 1 | 100.00 | 26202.00 | 2.00 | 2.00 |
| smoke-005 | 1 | 100.00 | 25023.00 | 1.00 | 0.00 |

## Category Coverage

| Category | Runs |
|---|---:|
| cost | 3 |
| ops | 2 |
| planning | 3 |
| qa | 2 |
| scheduler | 3 |
| security | 2 |
| tools | 3 |
| trace | 2 |

## Notes

- 本报告只统计自动可采集指标。
- `score_quality` 建议按 `learn-zeroclaw/eval/rubric.md` 人工补充。
- 引入 RE-TRAC-lite 后请复用同一任务集与参数再跑一轮。
