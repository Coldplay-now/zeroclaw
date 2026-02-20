# ZeroClaw Provider 机制详解

> 一句话概括：`Provider` 是 ZeroClaw 的模型抽象层，统一封装不同 LLM API（OpenAI/Anthropic/OpenRouter/Ollama/...）的调用差异，并通过路由、重试、降级实现稳定输出。

---

## 阅读导航

- 前置阅读：`04-agent-loop.md`
- 建议后续：`06-channel-trait.md`、`07-tool-trait.md`、`08-memory-trait.md`

---

## 1. Provider 在系统中的角色

在 ZeroClaw 四大核心抽象里：

- `Channel` 负责“从哪里收消息、回到哪里”
- `Tool` 负责“如何执行动作”
- `Memory` 负责“如何保存与召回上下文”
- **`Provider` 负责“如何与模型对话”**

也就是说，Provider 是 Agent Loop 的“推理引擎接口层”。

---

## 2. Trait 核心契约

核心定义在 `src/providers/traits.rs` 的 `Provider` trait，关键能力包括：

- `chat_with_system(...)`：单轮（可带 system prompt）
- `chat_with_history(...)`：多轮上下文
- `chat(...)`：结构化请求入口（支持工具定义注入）
- `chat_with_tools(...)`：原生工具调用（如果 provider 支持）
- `supports_native_tools()`：声明是否支持 API 级 tool calling
- `warmup()`：连接池预热（可选）

这让上层 Agent Loop 可以“面向接口编程”，不依赖某家 API 的细节。

---

## 3. 统一消息模型

`src/providers/traits.rs` 里还定义了跨 provider 的统一数据结构：

- `ChatMessage { role, content }`
- `ToolCall { id, name, arguments }`
- `ChatResponse { text, tool_calls }`
- `ConversationMessage` / `ToolResultMessage`（保真历史与工具反馈）

意义是：  
不同 provider 无论返回格式多么不同，最后都归一到这套模型，再交给 Agent Loop 处理。

---

## 4. 工具调用兼容策略（重点）

Provider 层有一个非常实用的双通道设计：

### 4.1 原生工具调用（Native）

如果 `supports_native_tools() == true`，可以走 provider 自己的 function/tool calling API（例如 OpenAI/OpenRouter/Copilot 等实现）。

### 4.2 Prompt 引导回退（Prompt-Guided）

如果不支持原生调用，会自动把工具说明注入 system prompt（`build_tool_instructions_text(...)`），让模型通过 `<tool_call>` 文本协议触发工具。

这使得“工具能力”不被 provider 能力短板卡死。

---

## 5. Provider 工厂与选择逻辑

`src/providers/mod.rs` 是总工厂：

- `create_provider(...)`：创建单个 provider
- `create_resilient_provider(...)`：包装重试 + fallback
- `create_routed_provider(...)`：按模型路由到不同 provider 链

简单理解：

- **单 provider**：直接调用
- **resilient**：一个主 provider + 若干 fallback provider
- **routed**：按 model/route 规则把请求分发到不同 provider 组

---

## 6. 稳定性机制：ReliableProvider + RouterProvider

### 6.1 `ReliableProvider`（`src/providers/reliable.rs`）

定位：失败恢复与可用性增强。

关键能力：

- 重试（retry/backoff）
- provider fallback（主链路失败切备用）
- model fallback（模型级降级链）

### 6.2 `RouterProvider`（`src/providers/router.rs`）

定位：多模型场景的路由控制。

关键能力：

- 根据模型名/路由提示选择 provider
- 保持统一 `Provider` trait 接口
- 可和 `ReliableProvider` 叠加使用

---

## 7. 安全处理：错误脱敏与凭证解析

`src/providers/mod.rs` 做了两件很关键的安全工作：

1. **错误脱敏**：`sanitize_api_error(...)` 会清理 `sk-`、`xoxb-`、`ghp_` 等敏感 token 前缀
2. **凭证解析**：`resolve_provider_credential(...)` 支持 provider 专属 env var + 通用 fallback 变量

这保证日志和报错尽量不泄露密钥。

---

## 8. 与 Agent Loop 的协作关系

在 `src/agent/loop_.rs` 中，Provider 是执行环的第一环：

1. Agent 传入 history + model + temperature
2. Provider 返回文本和/或 tool_calls
3. Agent 执行工具并回注结果
4. Provider 再次推理直到收敛

所以 Provider 不是“只回一句话”的黑盒，而是多轮工具推理链中的核心参与者。

---

## 9. 设计价值总结

`Provider trait` 的价值在于：把多厂商 API 差异收敛成稳定接口，同时内建工程级可靠性。

它让 ZeroClaw 可以做到：

- 换模型/换供应商不改上层逻辑
- 失败自动重试和降级
- 同时支持原生工具调用与 prompt 兜底
- 在高可用与安全之间保持平衡

---

## 10. 建议连读源码

- `src/providers/traits.rs`（契约与统一模型）
- `src/providers/mod.rs`（工厂、凭证、脱敏）
- `src/providers/reliable.rs`（重试与 fallback）
- `src/providers/router.rs`（路由编排）
- `src/providers/openai.rs` / `openrouter.rs` / `ollama.rs`（具体实现对照）
- `src/agent/loop_.rs`（Provider 在执行环中的使用）
