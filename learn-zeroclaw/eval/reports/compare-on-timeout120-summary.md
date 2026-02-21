# Baseline Eval Summary

## Overall

- Total runs: 60
- Success runs: 60
- Success rate: 100.00%
- Avg latency: 28013.73 ms
- P95 latency: 53789.00 ms
- Avg iterations: 1.63
- Avg tool calls: 0.78

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 3 | 100.00 | 17276.67 | 1.33 | 0.33 |
| baseline-007 | 3 | 100.00 | 39842.00 | 3.33 | 3.67 |
| baseline-008 | 3 | 100.00 | 19966.00 | 1.00 | 0.00 |
| baseline-009 | 3 | 100.00 | 43423.33 | 1.00 | 0.00 |
| baseline-010 | 3 | 100.00 | 56030.67 | 4.33 | 3.33 |
| baseline-011 | 3 | 100.00 | 11880.33 | 1.00 | 0.00 |
| baseline-012 | 3 | 100.00 | 31832.67 | 1.33 | 0.33 |
| baseline-013 | 3 | 100.00 | 20299.00 | 2.33 | 1.67 |
| baseline-014 | 3 | 100.00 | 16747.67 | 1.33 | 0.33 |
| baseline-015 | 3 | 100.00 | 25784.33 | 1.00 | 0.00 |
| baseline-016 | 3 | 100.00 | 34092.33 | 3.33 | 3.00 |
| baseline-017 | 3 | 100.00 | 23565.00 | 1.00 | 0.00 |
| baseline-018 | 3 | 100.00 | 23315.33 | 1.33 | 0.67 |
| baseline-019 | 3 | 100.00 | 21044.67 | 1.00 | 0.00 |
| baseline-020 | 3 | 100.00 | 20870.33 | 1.00 | 0.00 |
| smoke-001 | 3 | 100.00 | 15573.67 | 1.33 | 0.33 |
| smoke-002 | 3 | 100.00 | 53776.33 | 1.00 | 0.00 |
| smoke-003 | 3 | 100.00 | 20734.00 | 1.00 | 0.00 |
| smoke-004 | 3 | 100.00 | 31953.67 | 2.33 | 1.67 |
| smoke-005 | 3 | 100.00 | 32266.67 | 1.33 | 0.33 |

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
