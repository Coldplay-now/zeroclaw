# Baseline Eval Summary

## Overall

- Total runs: 60
- Success runs: 33
- Success rate: 55.00%
- Avg latency: 24483.15 ms
- P95 latency: 30005.00 ms
- Avg iterations: 1.36
- Avg tool calls: 0.27
- Failure distribution: http_error=27

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 3 | 33.33 | 29167.00 | 1.00 | 0.00 |
| baseline-007 | 3 | 33.33 | 28044.33 | 3.00 | 1.00 |
| baseline-008 | 3 | 66.67 | 20120.33 | 1.00 | 0.00 |
| baseline-009 | 3 | 33.33 | 25916.00 | 3.00 | 1.67 |
| baseline-010 | 3 | 0.00 | 30002.33 | n/a | 0.00 |
| baseline-011 | 3 | 100.00 | 20547.00 | 1.00 | 0.00 |
| baseline-012 | 3 | 0.00 | 30004.33 | n/a | 0.00 |
| baseline-013 | 3 | 33.33 | 29951.67 | 5.00 | 1.33 |
| baseline-014 | 3 | 66.67 | 24959.67 | 2.00 | 0.67 |
| baseline-015 | 3 | 33.33 | 28713.67 | 1.00 | 0.00 |
| baseline-016 | 3 | 0.00 | 30005.00 | n/a | 0.00 |
| baseline-017 | 3 | 100.00 | 18659.00 | 1.00 | 0.00 |
| baseline-018 | 3 | 100.00 | 16030.00 | 1.00 | 0.00 |
| baseline-019 | 3 | 33.33 | 28863.67 | 1.00 | 0.00 |
| baseline-020 | 3 | 66.67 | 25901.67 | 1.00 | 0.00 |
| smoke-001 | 3 | 100.00 | 11036.00 | 1.00 | 0.00 |
| smoke-002 | 3 | 100.00 | 19360.00 | 1.00 | 0.00 |
| smoke-003 | 3 | 33.33 | 28342.33 | 1.00 | 0.00 |
| smoke-004 | 3 | 66.67 | 21442.67 | 2.00 | 0.67 |
| smoke-005 | 3 | 100.00 | 22596.33 | 1.00 | 0.00 |

## Category Coverage

| Category | Runs |
|---|---:|
| cost | 9 |
| ops | 6 |
| planning | 9 |
| qa | 6 |
| scheduler | 9 |
| security | 6 |
| tools | 9 |
| trace | 6 |

## Notes

- 本报告只统计自动可采集指标。
- `score_quality` 建议按 `learn-zeroclaw/eval/rubric.md` 人工补充。
- 引入 RE-TRAC-lite 后请复用同一任务集与参数再跑一轮。
