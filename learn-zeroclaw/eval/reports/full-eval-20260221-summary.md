# Baseline Eval Summary

## Overall

- Total runs: 60
- Success runs: 43
- Success rate: 71.67%
- Avg latency: 20547.27 ms
- P95 latency: 30006.00 ms
- Avg iterations: 1.23
- Avg tool calls: 0.60
- Failure distribution: http_error=17

## Per Task

| Task ID | Runs | Success % | Avg Latency(ms) | Avg Iterations | Avg Tool Calls |
|---|---:|---:|---:|---:|---:|
| baseline-006 | 3 | 100.00 | 9878.33 | 1.00 | 0.00 |
| baseline-007 | 3 | 66.67 | 16187.67 | 2.00 | 2.67 |
| baseline-008 | 3 | 100.00 | 10066.00 | 1.00 | 0.00 |
| baseline-009 | 3 | 33.33 | 29261.00 | 1.00 | 0.00 |
| baseline-010 | 3 | 0.00 | 30005.33 | n/a | 0.00 |
| baseline-011 | 3 | 100.00 | 16664.00 | 1.00 | 0.00 |
| baseline-012 | 3 | 100.00 | 22272.33 | 1.00 | 0.00 |
| baseline-013 | 3 | 100.00 | 13099.00 | 2.00 | 3.00 |
| baseline-014 | 3 | 100.00 | 18248.00 | 1.33 | 1.67 |
| baseline-015 | 3 | 33.33 | 26695.00 | 1.00 | 0.00 |
| baseline-016 | 3 | 66.67 | 16326.00 | 2.00 | 2.00 |
| baseline-017 | 3 | 100.00 | 23665.33 | 1.00 | 0.00 |
| baseline-018 | 3 | 66.67 | 23285.33 | 1.00 | 0.00 |
| baseline-019 | 3 | 33.33 | 27258.67 | 1.00 | 0.00 |
| baseline-020 | 3 | 33.33 | 23635.67 | 1.00 | 0.00 |
| smoke-001 | 3 | 100.00 | 9918.33 | 1.00 | 0.00 |
| smoke-002 | 3 | 100.00 | 21190.00 | 1.33 | 2.33 |
| smoke-003 | 3 | 66.67 | 25394.33 | 1.00 | 0.00 |
| smoke-004 | 3 | 66.67 | 23836.33 | 1.50 | 0.33 |
| smoke-005 | 3 | 66.67 | 24058.67 | 1.00 | 0.00 |

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
