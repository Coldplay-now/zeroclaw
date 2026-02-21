# RE-TRAC 质量人工复核模板（v1）

> 用途：对 `compare-on-timeout120-raw.jsonl` 与 `compare-off-timeout120-raw.jsonl` 做人工质量复核。  
> 评分规范：`learn-zeroclaw/eval/rubric.md`。

---

## 1. 复核目标

- 验证 ON/OFF 在“答案质量”上的真实差异（不只看成功率与时延）。
- 输出可追溯结论：哪些任务提升、哪些任务回退、是否可接受。

---

## 2. 抽样策略（建议）

- 全量 20 个任务都至少复核 1 条 ON + 1 条 OFF（最小覆盖）。
- 对差异敏感任务增加复核到 3 条：
  - `baseline-010`
  - `baseline-013`
  - `baseline-018`
  - `smoke-005`
  - `baseline-011`
  - `baseline-008`

---

## 3. 优先复核清单

## 3.1 重点确认“提升是否真实”

- `baseline-010`（调度模板）
- `baseline-013`（认证流程）
- `baseline-018`（幂等/重复执行验证）

## 3.2 重点确认“是否有质量回退”

- `smoke-005`（降工具调用策略）
- `baseline-011`（降 token 工程策略）
- `baseline-008`（工具失败熔断）

---

## 4. 单条样本评分表

> 每条样本填一行。分值范围 1-5（见 rubric）。

| task_id | run_index | mode(ON/OFF) | pass/partial/fail | score_quality(1-5) | 关键缺陷 | 备注 |
|---|---:|---|---|---:|---|---|
| 示例：baseline-010 | 2 | ON | pass | 4 | 无 | 覆盖频率+异常处理+重试 |

---

## 5. 任务级汇总表

| task_id | ON平均分 | OFF平均分 | 差值(ON-OFF) | 结论 |
|---|---:|---:|---:|---|
| baseline-010 |  |  |  | 提升/持平/回退 |

---

## 6. 结论模板

### 6.1 总体结论

- 平均质量分：ON = `__`，OFF = `__`，差值 = `__`
- 质量显著提升任务：`__`
- 质量回退任务：`__`
- 是否建议保持 `trajectory_compression_enabled=true`：`是/否`

### 6.2 风险与后续动作

- 风险 1：`__`
- 风险 2：`__`
- 后续优化任务：
  - [ ] 优化 `__` 任务提示词/策略
  - [ ] 增补 `__` 类型回归样例
  - [ ] 复跑对照确认修复效果

---

## 7. 执行记录

- 复核人：`__`
- 日期：`__`
- 参考数据：
  - `compare-on-timeout120-raw.jsonl`
  - `compare-off-timeout120-raw.jsonl`
  - `compare-on-off-timeout120.md`
