# RE-TRAC-lite Phase A 任务计划书

> 项目：ZeroClaw  
> 阶段：Phase A（最小可行实现）  
> 目标：在不引入模型训练和大规模架构改造的前提下，落地“轨迹压缩 + 跨轮注入”能力。

---

## 1. 背景与目标

当前系统已完成 RE-TRAC 前基线评估（`learn-zeroclaw/eval/reports/baseline-summary.md`），具备对比基础。  
Phase A 的目标是通过编排层增强，降低重复探索，提升长任务稳定性和效率。

本阶段达成后，应具备：

- 每轮工具循环结束后生成结构化轨迹状态（Trajectory State）。
- 下一轮推理显式使用上一轮状态（而非仅依赖线性历史堆叠）。
- 支持配置开关，确保可灰度、可回滚。

---

## 2. 范围与非范围

## 2.1 本阶段范围（In Scope）

- Agent loop 内新增轨迹压缩逻辑。
- 新增最小配置项（开关+容量控制+轮次限制）。
- 在 trace 中暴露轨迹状态（或摘要）以支持观测。
- 保持现有 API/前端兼容，新增字段不破坏旧结构。

## 2.2 非范围（Out of Scope）

- 不进行 SFT/RL 训练。
- 不修改 Provider/Channel/Tool trait 定义。
- 不做跨模块大重构。
- 不新增重依赖。

---

## 3. 设计原则

- **KISS**：优先简单可审计实现，不做过度抽象。
- **YAGNI**：只做 Phase A 必要能力，不提前实现 Phase B/C。
- **Fail Fast**：压缩失败时保底回退，不影响主流程可用性。
- **Reversible**：通过配置开关一键回退到当前逻辑。

---

## 4. 工作分解结构（WBS）

## W1 - Agent 轨迹压缩核心

**目标文件：**
- `src/agent/loop_.rs`

**任务项：**
- 定义 `TrajectoryState`（建议字段：`round`、`objective`、`evidence`、`uncertainties`、`failures`、`next_plan`、`tool_calls`、`token_estimate`）。
- 在每轮工具执行结束后生成当前轮状态。
- 在下一轮构造提示词时注入状态摘要。
- 增加状态容量上限（每类最多 N 条）防止上下文膨胀。

**产出物：**
- 可运行的压缩与注入流程。

---

## W2 - 配置与校验

**目标文件：**
- `src/config/schema.rs`
- `src/config/mod.rs`（如需）

**任务项：**
- 新增配置：
  - `agent.trajectory_compression_enabled`（bool，默认 `true`）
  - `agent.trajectory_state_max_items`（usize，默认 `6`）
  - `agent.trajectory_max_rounds`（usize，默认 `8`）
- 增加范围校验与默认值函数。
- 确保现有配置文件兼容（旧配置不报错）。

**产出物：**
- 可配置、可校验、可回退的运行参数。

---

## W3 - 可观测性与前端展示（最小集）

**目标文件：**
- `src/gateway/mod.rs`（trace 输出扩展）
- `learn-zeroclaw/web-ui/src/lib/api.ts`
- `learn-zeroclaw/web-ui/src/components/TraceInspector.tsx`

**任务项：**
- 在 trace 返回中增加轨迹状态或摘要字段。
- 前端类型定义扩展并显示“每轮状态”。
- 对旧 trace 数据兼容处理（字段缺失时不报错）。

**产出物：**
- 可视化可验证的轨迹状态展示。

---

## W4 - 评测对比准备

**目标文件：**
- `learn-zeroclaw/eval/tasks/baseline_tasks.jsonl`
- `learn-zeroclaw/eval/scripts/summarize_baseline.py`
- `learn-zeroclaw/eval/rubric.md`（如需补充）

**任务项：**
- 任务集从 5 条扩展到 20 条（保留 smoke + 增加工具密集和失败恢复场景）。
- 汇总脚本增加 RE-TRAC 关注指标（如迭代分布、工具调用趋势、失败类型分布）。
- 明确人工评分入口和抽检规则。

**产出物：**
- 可用于“改造前后对比”的评测基线 v2。

---

## 5. 里程碑与时间建议

- **M1（0.5 天）**：完成 W1 核心逻辑并 `cargo check` 通过。
- **M2（0.5 天）**：完成 W2 配置接入与校验。
- **M3（0.5 天）**：完成 W3 trace 扩展与前端可视化。
- **M4（0.5 天）**：完成 W4 评测扩展并产出首轮对比报告。

> 合计建议：2 天（单人串行）。  
> 若并行：后端（W1+W2）与前端（W3）可并行推进。

---

## 6. 依赖关系

- W2 依赖 W1 的字段设计定稿。
- W3 依赖 W1 的 trace 数据结构。
- W4 依赖 W1/W3 上线后的可观测字段。

---

## 7. 验收标准（DoD）

- 功能性：
  - 开启压缩后，trace 中可看到每轮状态。
  - 关闭压缩后，行为回退到当前逻辑。
- 稳定性：
  - `cargo check` / 相关前端测试通过。
  - 不引入新的高风险告警或明显回归。
- 评测性：
  - 能复用同一任务集跑出改造前后报告。
  - 报告包含成功率、延迟、工具调用、迭代等关键指标。

---

## 8. 风险与应对

- **风险 R1：状态摘要质量不足，误导下一轮**
  - 应对：保守启用，摘要容量限制，人工抽检关键任务。
- **风险 R2：上下文开销反而上升**
  - 应对：限制每类条目数，压缩文本长度上限。
- **风险 R3：与现有 trace/前端不兼容**
  - 应对：新增字段可选化，前端兜底渲染。

---

## 9. 回滚方案

- 配置开关：
  - `agent.trajectory_compression_enabled = false`
- 快速回滚步骤：
  1. 配置关闭压缩；
  2. 重启 daemon；
  3. 复跑 smoke eval，确认恢复基线行为；
  4. 如仍异常，回滚对应提交。

---

## 10. 建议提交切分

1. `feat(agent): add trajectory state compression and injection`
2. `feat(config): add trajectory compression settings`
3. `feat(trace): expose trajectory state in webhook trace`
4. `feat(ui): render trajectory state in trace inspector`
5. `chore(eval): expand task set and comparison metrics`
6. `docs(learn): update retrac phase-a progress`

---

## 11. 执行入口（下一步）

按以下顺序执行可降低风险：

1. 先做 W1 + W2（后端闭环）
2. 再做 W3（可观测性）
3. 最后做 W4（评测扩展与对比）

若你确认，本计划可直接作为 Phase A 开发任务主文档。
