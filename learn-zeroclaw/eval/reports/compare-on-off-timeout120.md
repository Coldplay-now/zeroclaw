# RE-TRAC 开关对照结论（timeout=120s）

## 评测口径

- 任务集：`baseline_tasks_full.jsonl`（20 题）
- 重复次数：`repeats=3`（共 60 次）
- 网关超时：`REQUEST_TIMEOUT_SECS = 120`
- 对照组：
  - ON：`trajectory_compression_enabled = true`
  - OFF：`trajectory_compression_enabled = false`

数据来源：

- ON 汇总：`compare-on-timeout120-summary.md`
- OFF 汇总：`compare-off-timeout120-summary.md`

---

## 核心指标对比

| 指标 | ON（压缩开启） | OFF（压缩关闭） | 变化 |
|---|---:|---:|---:|
| Success rate | 100.00% | 93.33% | **+6.67pp** |
| Avg latency | 28013.73 ms | 31348.20 ms | **-3334.47 ms** |
| P95 latency | 53789 ms | 120003 ms | **显著下降** |
| Avg iterations | 1.63 | 1.62 | +0.01 |
| Avg tool calls | 0.78 | 0.82 | -0.04 |

---

## 结果解读

1. **成功率提升明显**：开启轨迹压缩后，在同口径下成功率从 93.33% 提升到 100%。
2. **长尾时延改善显著**：P95 从 120s 附近降到 53.8s，说明“超时长尾”明显减少。
3. **工具调用略下降**：平均工具调用从 0.82 降到 0.78，符合“更聚焦探索”的方向。
4. **迭代次数基本持平**：性能提升主要来自每轮决策质量/稳定性改善，而不是单纯减少迭代轮次。

---

## 结论

在当前 ZeroClaw 配置与任务集下，`RE-TRAC-lite`（trajectory compression）在 **稳定性、成功率、长尾时延** 三个维度均优于关闭状态，具备继续推进的工程价值。

---

## 下一步建议

1. 将该对照流程固化为标准回归评测（每次核心改动后复跑）。
2. 引入人工质量评分（`rubric.md`）补充自动指标，避免仅凭成功率判断质量。
3. 评估是否把 120s 超时策略参数化到配置，便于不同环境调优。
