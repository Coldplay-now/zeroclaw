# Baseline Eval Summary

## Overall

- Total runs: 60
- Success runs: 56
- Success rate: 93.33%
- Avg latency: 31348.20 ms
- P95 latency: 120003.00 ms
- Avg iterations: 1.62
- Avg tool calls: 0.82
- Failure distribution: http_error=4

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 3 | 100.00 | 18127.67 | 1.00 | 0.00 |
| baseline-007 | 3 | 100.00 | 33489.33 | 3.00 | 3.00 |
| baseline-008 | 3 | 100.00 | 19961.67 | 1.00 | 0.00 |
| baseline-009 | 3 | 100.00 | 59297.00 | 2.67 | 2.67 |
| baseline-010 | 3 | 33.33 | 91692.00 | 3.00 | 0.67 |
| baseline-011 | 3 | 100.00 | 9650.00 | 1.00 | 0.00 |
| baseline-012 | 3 | 100.00 | 16989.00 | 1.00 | 0.00 |
| baseline-013 | 3 | 66.67 | 68711.67 | 5.00 | 4.67 |
| baseline-014 | 3 | 100.00 | 12297.00 | 1.00 | 0.00 |
| baseline-015 | 3 | 100.00 | 30804.67 | 1.67 | 0.67 |
| baseline-016 | 3 | 100.00 | 38371.33 | 2.33 | 1.67 |
| baseline-017 | 3 | 100.00 | 13685.33 | 1.00 | 0.00 |
| baseline-018 | 3 | 66.67 | 52898.33 | 2.00 | 1.00 |
| baseline-019 | 3 | 100.00 | 20169.33 | 1.00 | 0.00 |
| baseline-020 | 3 | 100.00 | 21050.67 | 1.00 | 0.00 |
| smoke-001 | 3 | 100.00 | 10558.33 | 1.00 | 0.00 |
| smoke-002 | 3 | 100.00 | 46553.33 | 2.00 | 1.00 |
| smoke-003 | 3 | 100.00 | 27170.00 | 2.00 | 1.00 |
| smoke-004 | 3 | 100.00 | 14249.67 | 1.00 | 0.00 |
| smoke-005 | 3 | 100.00 | 21237.67 | 1.00 | 0.00 |

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
