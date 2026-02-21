# Baseline Eval Summary

## Overall

- Total runs: 20
- Success runs: 9
- Success rate: 45.00%
- Avg latency: 26065.35 ms
- P95 latency: 30006.00 ms
- Avg iterations: 1.33
- Avg tool calls: 0.15
- Failure distribution: http_error=11

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| baseline-007 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| baseline-008 | 1 | 100.00 | 12485.00 | 1.00 | 0.00 |
| baseline-009 | 1 | 100.00 | 24837.00 | 2.00 | 1.00 |
| baseline-010 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| baseline-011 | 1 | 100.00 | 12763.00 | 1.00 | 0.00 |
| baseline-012 | 1 | 0.00 | 30004.00 | n/a | 0.00 |
| baseline-013 | 1 | 100.00 | 16762.00 | 2.00 | 1.00 |
| baseline-014 | 1 | 0.00 | 30006.00 | n/a | 0.00 |
| baseline-015 | 1 | 0.00 | 30006.00 | n/a | 0.00 |
| baseline-016 | 1 | 100.00 | 26452.00 | 2.00 | 1.00 |
| baseline-017 | 1 | 0.00 | 30001.00 | n/a | 0.00 |
| baseline-018 | 1 | 0.00 | 30004.00 | n/a | 0.00 |
| baseline-019 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| baseline-020 | 1 | 100.00 | 26353.00 | 1.00 | 0.00 |
| smoke-001 | 1 | 100.00 | 29516.00 | 1.00 | 0.00 |
| smoke-002 | 1 | 100.00 | 16497.00 | 1.00 | 0.00 |
| smoke-003 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| smoke-004 | 1 | 0.00 | 30005.00 | n/a | 0.00 |
| smoke-005 | 1 | 100.00 | 25591.00 | 1.00 | 0.00 |

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
