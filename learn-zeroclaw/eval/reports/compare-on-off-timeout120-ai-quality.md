# RE-TRAC ON/OFF AI 规则化参考评估（timeout=120s）

> 基于 `compare-on-timeout120-raw.jsonl` 与 `compare-off-timeout120-raw.jsonl` 的自动参考评估。  
> 注意：该评估用于趋势判断，不替代人工质量评审。

---

## 评估方法（简版）

- 依据每个任务的 `expectation` 做关键词覆盖检查。
- 结合回答结构完整度（如步骤/清单）与可执行性信号（验证/检查/流程）。
- 输出 1-5 的参考分用于 ON/OFF 对比。

---

## 参考结果

| 指标 | ON（压缩开启） | OFF（压缩关闭） | 变化 |
|---|---:|---:|---:|
| 平均分 | 4.005 | 3.854 | **+0.152** |
| P25 | 3.267 | 3.267 | 0 |
| P50 | 4.133 | 4.133 | 0 |
| P75 | 5.000 | 5.000 | 0 |

---

## 任务层观察

### 提升最明显（参考）

- `baseline-010`（调度模板）
- `baseline-013`（认证流程）
- `baseline-018`（幂等验证）

### 可能回退（参考）

- `smoke-005`（降工具调用策略）
- `baseline-011`（降 token 工程策略）
- `baseline-008`（失败熔断策略）

---

## 与硬指标的一致性

该参考分趋势与硬指标一致：

- Success rate：ON 高于 OFF
- P95 latency：ON 显著低于 OFF
- Avg tool calls：ON 略低于 OFF

说明 RE-TRAC-lite 开启后，不仅“更容易完成”，在 expectation 贴合度上也呈现正向变化。

---

## 使用边界

- 这是 AI 规则化参考，不是人工金标准。
- 最终质量结论请结合 `quality-review-template.md` 的人工抽检评分。
