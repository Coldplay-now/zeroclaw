# RE-TRAC 对 ZeroClaw 的参考与落地方案

> 论文：**RE-TRAC: REcursive TRAjectory Compression for Deep Search Agents**  
> 链接：<https://arxiv.org/abs/2602.02486>  
> 项目：<https://github.com/microsoft/InfoAgent>

---

## 1. 这篇论文在讲什么

RE-TRAC 关注的是深度搜索型 Agent 在长链路推理中的典型问题：

- 传统 ReAct 往往是线性轨迹，容易陷入局部最优。
- 历史变长后，全局状态感下降，容易重复探索。
- 多轮尝试之间缺少结构化信息传递，导致工具调用和 token 开销偏高。

它的核心改进是：**递归轨迹压缩（Recursive Trajectory Compression）**。

做法是每一轮 trajectory 结束后，不是仅把原始对话/工具结果继续堆进上下文，而是压缩成结构化状态并传给下一轮，例如：

- 已确认证据（evidence）
- 未解决问题（uncertainties）
- 失败模式（failures）
- 下一步计划（next plan / frontier candidates）

论文报告的结果包括：

- 在 BrowseComp 上相对 ReAct 有明显提升（文中称 +15%~20% 绝对提升）。
- 随轮次推进，工具调用和 token 消耗呈下降趋势，说明探索更聚焦。

---

## 2. 对 ZeroClaw 的直接意义

ZeroClaw 当前已经具备落地 RE-TRAC 思路的关键基础：

- Agent 工具循环与上限控制（`max_tool_iterations`）
- 可配置的历史消息和超时（`max_history_messages`、`message_timeout_secs`）
- Web 配置页热更新（`GET/PATCH /config`）
- 追踪/审计基础能力（可扩展到每轮轨迹状态）

因此可以不引入新模型训练，先做一个**编排层 RE-TRAC-lite**：

1. 在每轮工具循环后生成结构化轨迹摘要。
2. 下一轮基于该摘要做计划，而不是盲目拼接长历史。
3. 引入“重复轮次提前停止”策略，降低空转。

这条路径风险低、可回滚、符合本仓库 KISS/YAGNI 原则。

---

## 3. ZeroClaw 版 RE-TRAC-lite 设计

## 3.1 目标与非目标

- 目标：
  - 降低重复工具调用与 token 开销。
  - 提高多轮任务的稳定性与收敛速度。
  - 保持现有 trait/factory 架构不变。
- 非目标：
  - 本阶段不做模型 SFT/RL。
  - 不改 Provider 抽象，不引入跨子系统耦合。

## 3.2 轨迹状态结构（建议）

建议在 agent loop 内引入运行时结构（初期仅内存态）：

```text
TrajectoryState {
  round: usize,
  objective: String,
  evidence: Vec<String>,
  uncertainties: Vec<String>,
  failures: Vec<String>,
  next_plan: Vec<String>,
  tool_calls: usize,
  token_estimate: Option<u64>,
}
```

关键点：

- 字段尽量短文本、可审计，避免把原始大段日志直接塞入。
- `failures` 需保留失败原因分类（超时、权限、参数错误、空结果）。
- `next_plan` 必须可执行（下一轮可直接转化为动作）。

## 3.3 执行流程（轮次级）

1. 用户目标进入 agent loop。
2. 执行当前轮工具调用。
3. 生成 `TrajectoryState`（压缩摘要）。
4. 将摘要注入下一轮系统提示（continue prompt）。
5. 判断停止条件：
   - 达到目标；
   - 达到上限；
   - 与上一轮高度重复（提前停止）。

## 3.4 停止与去重策略（建议）

- 重复轮次检测：
  - 对 `next_plan + uncertainties` 做规范化哈希。
  - 连续 N 轮哈希相同则停止（例如 N=2）。
- 工具调用去重：
  - 对相同工具+相同参数在短窗口内去重或降权。
- 失败熔断：
  - 同类失败达到阈值后调整计划，避免反复撞墙。

---

## 4. 配置项建议（可接入现有 Settings）

建议新增以下配置（默认值保守）：

```toml
[agent]
trajectory_compression_enabled = true
trajectory_max_rounds = 8
trajectory_stop_on_redundant_rounds = 2
trajectory_state_max_items = 6
```

说明：

- `trajectory_max_rounds` 与 `max_tool_iterations` 不冲突：前者管“轮次”，后者管“单轮工具深度”。
- `trajectory_state_max_items` 控制每类条目数，避免摘要膨胀。

---

## 5. 分阶段实施计划（推荐）

## Phase A（低风险，先做）

- 在 `src/agent/loop_.rs` 增加状态压缩逻辑。
- 仅使用 prompt 方案注入下一轮，不改外部接口。
- 增加日志字段（轮次、摘要长度、工具调用数）。

验收标准：

- 编译通过，现有行为不回归。
- 长任务平均工具调用数下降，成功率不低于基线。

## Phase B（中风险）

- 增加“重复轮次提前停止”与“工具调用去重”。
- 在 Trace UI 展示每轮摘要（可复用现有 trace 结构扩展字段）。

验收标准：

- 空转任务明显减少。
- 用户可在前端看见每轮计划变化，而不是黑盒执行。

## Phase C（评估项）

- 评估是否需要引入 RE-TRAC 专项模型或微调策略。
- 仅在编排层收益趋于瓶颈时再考虑训练路径。

---

## 6. 建议监控指标（上线前必须定义）

- 每任务平均工具调用次数
- 每任务 token（输入/输出）
- 平均完成时延
- 成功率/失败率
- 失败类型分布（超时、权限、无效结果、解析失败）
- 提前停止触发率（用于监控策略是否过激）

建议做 A/B：

- A 组：现有 ReAct 风格流程
- B 组：RE-TRAC-lite 流程

在相同任务集下比较，避免凭个例判断效果。

---

## 7. 风险与回滚

- 风险：
  - 摘要质量差可能误导后续轮次。
  - 过严的重复停止策略可能过早终止。
- 缓解：
  - 默认保守阈值；
  - 关键任务保留手动复跑路径；
  - 记录每轮摘要供审计复盘。
- 回滚：
  - 通过配置开关 `trajectory_compression_enabled = false` 一键回退到现有流程。

---

## 8. 结论

对 ZeroClaw 来说，RE-TRAC 最有价值的不是“换模型”，而是“换编排范式”：

- 从线性累计上下文，转向轮次化、结构化、可审计的轨迹状态传递。
- 先做编排层 RE-TRAC-lite，即可在成本、稳定性、可观测性三方面获得实用收益。

这条路径与 ZeroClaw 当前架构和工程原则高度一致，适合作为下一阶段 Agent Loop 演进方向。
