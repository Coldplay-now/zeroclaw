# ZeroClaw Tool 机制详解

> 一句话概括：`Tool` 是 ZeroClaw 的“执行能力抽象层”，负责把 LLM 的意图转成可执行动作（shell、文件读写、HTTP、记忆操作等），并通过统一结构把结果回传给模型继续推理。

---

## 阅读导航

- 前置阅读：`04-agent-loop.md`、`05-provider-trait.md`、`06-channel-trait.md`
- 建议后续：`08-memory-trait.md`

---

## 1. Tool 在系统中的角色

如果说：

- `Provider` 决定“怎么想”（模型推理）
- `Channel` 决定“从哪来、回到哪去”（通信）

那么 `Tool` 就是决定“怎么做”（执行动作）的模块。

它的核心价值：

- **统一能力接口**：所有工具都实现同一个 trait
- **解耦模型与执行环境**：模型只需输出“调用哪个工具 + 参数”
- **可扩展**：新增能力不需要改 Agent 核心循环

---

## 2. Trait 定义：最小可执行契约

定义在 `src/tools/traits.rs:20-43`：

```rust
#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn parameters_schema(&self) -> serde_json::Value;
    async fn execute(&self, args: serde_json::Value) -> anyhow::Result<ToolResult>;

    fn spec(&self) -> ToolSpec {
        ToolSpec {
            name: self.name().to_string(),
            description: self.description().to_string(),
            parameters: self.parameters_schema(),
        }
    }
}
```

其中：

- **`name`**：给 LLM 调用时用的唯一标识
- **`description`**：告诉模型“这个工具能干什么”
- **`parameters_schema`**：JSON Schema，约束参数结构
- **`execute`**：真正执行动作并返回结果

---

## 3. 标准结果结构：ToolResult

`ToolResult` 定义在 `src/tools/traits.rs:4-10`：

```rust
pub struct ToolResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}
```

这个结构非常关键：  
无论底层是 shell、HTTP、文件系统还是第三方 API，最终都回到统一格式，便于 Agent 循环处理。

---

## 4. 工具注册与装配：运行时工具箱

工具集合由 `src/tools/mod.rs` 统一构建：

- `default_tools(...)`：基础工具（shell/file_read/file_write）
- `all_tools_with_runtime(...)`：完整工具集（记忆、cron、浏览器、HTTP、委托子 agent 等）

关键片段 `src/tools/mod.rs:133-146`：

```rust
let mut tools: Vec<Box<dyn Tool>> = vec![
    Box::new(ShellTool::new(security.clone(), runtime)),
    Box::new(FileReadTool::new(security.clone())),
    Box::new(FileWriteTool::new(security.clone())),
    Box::new(CronAddTool::new(config.clone(), security.clone())),
    Box::new(CronListTool::new(config.clone())),
    Box::new(MemoryStoreTool::new(memory.clone())),
    Box::new(MemoryRecallTool::new(memory.clone())),
    Box::new(MemoryForgetTool::new(memory)),
];
```

可以看到，工具装配与配置强相关（是否启用 browser/http/composio/代理子 agent 等）。

---

## 5. 调用循环：模型 <-> 工具 的闭环

Tool 真正发挥作用在 Agent 循环里（`src/agent/loop_.rs`）：

1. 模型输出工具调用（tool call）
2. 运行时按名称找到对应工具
3. 解析参数并执行 `execute`
4. 将 `ToolResult` 回注到对话历史
5. 模型继续推理，直到输出最终自然语言结果

这就是“ReAct/工具调用闭环”的工程化实现。

另外，循环里有一个重要保护：

- `MAX_TOOL_ITERATIONS = 10`（`src/agent/loop_.rs:18-19`），防止无限调用。

---

## 6. 安全边界：Tool 不是无条件执行

ZeroClaw 对工具执行有多层保护：

- **SecurityPolicy 注入**：很多工具构造时带 `security`，执行前进行策略校验（路径范围、命令允许集等）
- **能力按配置开关**：如 browser/http/email/composio 仅在启用时注册
- **输出脱敏**：Agent 循环会对敏感键值做 scrub（如 token/api_key/password）

这意味着：Tool 是“可执行能力”，但仍受平台安全策略控制。

---

## 7. 一个最小自定义 Tool 的思路

示例在 `examples/custom_tool.rs`，核心模式是：

1. 定义 struct（如 `HttpGetTool`）
2. 实现 `Tool` trait
3. 写 `parameters_schema`（清晰、可验证）
4. 在 `execute` 内返回标准 `ToolResult`
5. 注册进 `src/tools/mod.rs` 的工具构建流程

你可以把这套模式理解为“插件化能力接入协议”。

---

## 8. 与 Channel/Provider 的协作关系

- **Provider**：产出推理和工具调用指令
- **Tool**：执行动作并产出结构化结果
- **Channel**：承接外部输入并回传最终输出

三者共同构成 ZeroClaw 的核心闭环：

**消息进入 -> 模型推理 -> 工具执行 -> 模型整合 -> 消息返回**。

---

## 9. 小结

`Tool trait` 是 ZeroClaw “可行动性（agency）”的基础设施：

- 用统一接口屏蔽具体执行细节
- 用 schema 降低模型调用歧义
- 用安全策略控制执行边界
- 用循环机制把工具结果持续反馈给模型

所以它不仅是“功能列表”，更是整个 Agent 可控执行架构的关键抽象层。

---

## 10. 延伸阅读

- `src/tools/traits.rs`（接口与结果结构）
- `src/tools/mod.rs`（注册与装配）
- `src/agent/loop_.rs`（工具调用闭环）
- `src/security/policy.rs`（执行策略）
- `examples/custom_tool.rs`（自定义工具示例）
