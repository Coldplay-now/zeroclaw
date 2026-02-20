# Skill 和 Tool 的区别（ZeroClaw）

这篇文档解释 ZeroClaw 中 `Skill` 与 `Tool` 的定位、关系和常见误区。

---

## 一句话结论

- **Tool（工具）**：真正执行动作的能力（会“做事”）。
- **Skill（技能）**：给模型的行为说明和策略上下文（会“指导怎么做”）。

---

## 1. Tool 是什么

在代码里，Tool 是标准 trait（接口），定义了完整的调用契约：

- 名称（`name`）
- 描述（`description`）
- 参数 schema（`parameters_schema`）
- 执行函数（`execute`）

对应源码：

- `src/tools/traits.rs`
- `src/tools/mod.rs`（注册和装配工具）

这意味着：

- Tool 会进入 agent 的工具列表；
- 模型可以通过 function/tool calling 直接触发；
- 返回统一 `ToolResult`（`success/output/error`）。

---

## 2. Skill 是什么

Skill 是从工作区加载的技能描述（`SKILL.toml` / `SKILL.md`），核心目的是补充系统提示词上下文。

对应源码：

- `src/skills/mod.rs`（`load_skills`、`skills_to_prompt`）
- 技能目录约定：`<workspace>/skills/<name>/SKILL.toml` 或 `SKILL.md`

这意味着：

- Skill 会影响模型“如何思考和决策”；
- Skill 本身不是 Rust 运行时的执行器；
- 它更像“操作手册/策略卡片”，不是直接执行动作的引擎。

---

## 3. 运行时关系（谁指导，谁执行）

请求进入后，简化流程如下：

1. 系统加载 Tool 列表（可执行能力）
2. 系统加载 Skill 并拼接进 prompt（策略与规范）
3. 模型结合上下文决定是否调用 Tool
4. 真正执行动作的是 Tool 的 `execute()`

所以：

- **Skill 决定“倾向做什么、按什么规则做”**
- **Tool 决定“到底能做什么、如何执行”**

---

## 4. 常见误区

### 误区 A：Skill 里的 `tools` 字段就等于系统工具

不是。`SkillTool` 更偏技能元信息/提示信息（用于描述该技能建议的工具形态），并不自动变成 Rust Tool 注册项。

### 误区 B：写了 SKILL.md 就能新增底层能力

不能。新增底层能力仍需实现 `Tool` trait，并在 `src/tools/mod.rs` 中注册。

### 误区 C：只加 Tool 不加 Skill 也没问题

能用，但可用性和稳定性通常会下降。没有 Skill 的规则约束，模型在复杂场景更容易误用工具或遗漏步骤。

---

## 5. 什么时候改 Skill，什么时候改 Tool

优先改 **Skill** 的场景：

- 想调整流程、策略、边界条件
- 想让模型按固定 SOP 回答/执行
- 不需要新增底层执行能力

优先改 **Tool** 的场景：

- 需要新增系统能力（比如“发送带附件邮件”）
- 需要更严格输入校验或安全限制
- 需要更稳定、可测试、可观测的执行逻辑

---

## 6. 结合你当前项目的例子

你这次做的 `email_send` 附件能力就是典型 Tool 扩展：

- 新增参数 `attachments`
- 增加 workspace 边界校验
- MIME 与 multipart 组装
- 单测覆盖

而如果你想让模型“发邮件前先确认收件人、再总结正文”，这是 Skill 更合适做的事。

---

## 7. 实操建议（学习顺序）

1. 先读 `src/tools/traits.rs`，理解 Tool 契约  
2. 再读 `src/tools/mod.rs`，理解注册与开关  
3. 最后读 `src/skills/mod.rs`，理解 Skill 加载与 prompt 注入  
4. 任何“能力”需求先问自己：这是“执行能力”还是“行为策略”  

---

## 8. 小结

在 ZeroClaw 中：

- Tool 是运行时能力边界（Capability Boundary）
- Skill 是行为策略边界（Behavior Boundary）

把两者分清，扩展系统时会更稳定、更容易测试，也更符合 trait + factory 的架构设计哲学。
