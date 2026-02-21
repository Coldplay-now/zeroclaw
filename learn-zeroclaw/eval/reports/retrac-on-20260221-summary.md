# Baseline Eval Summary

## Overall

- Total runs: 60
- Success runs: 40
- Success rate: 66.67%
- Avg latency: 22562.00 ms
- P95 latency: 30005.00 ms
- Avg iterations: 1.27
- Avg tool calls: 0.52
- Failure distribution: http_error=20

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 3 | 66.67 | 25088.00 | 1.00 | 0.00 |
| baseline-007 | 3 | 66.67 | 22052.00 | 2.00 | 2.33 |
| baseline-008 | 3 | 66.67 | 21289.67 | 1.00 | 0.00 |
| baseline-009 | 3 | 0.00 | 30002.67 | n/a | 0.00 |
| baseline-010 | 3 | 66.67 | 23877.33 | 2.00 | 1.33 |
| baseline-011 | 3 | 100.00 | 23829.00 | 1.00 | 0.00 |
| baseline-012 | 3 | 100.00 | 23206.33 | 1.00 | 0.00 |
| baseline-013 | 3 | 100.00 | 10694.67 | 2.00 | 3.33 |
| baseline-014 | 3 | 66.67 | 22249.67 | 1.00 | 0.00 |
| baseline-015 | 3 | 0.00 | 30005.33 | n/a | 0.00 |
| baseline-016 | 3 | 66.67 | 19896.67 | 2.00 | 2.00 |
| baseline-017 | 3 | 100.00 | 18259.67 | 1.00 | 0.00 |
| baseline-018 | 3 | 100.00 | 20694.67 | 1.33 | 0.67 |
| baseline-019 | 3 | 0.00 | 30004.00 | n/a | 0.00 |
| baseline-020 | 3 | 100.00 | 13268.33 | 1.00 | 0.00 |
| smoke-001 | 3 | 66.67 | 17121.00 | 1.00 | 0.00 |
| smoke-002 | 3 | 33.33 | 27787.00 | 1.00 | 0.00 |
| smoke-003 | 3 | 33.33 | 29475.67 | 1.00 | 0.00 |
| smoke-004 | 3 | 100.00 | 17158.00 | 1.33 | 0.67 |
| smoke-005 | 3 | 100.00 | 25280.33 | 1.00 | 0.00 |

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
