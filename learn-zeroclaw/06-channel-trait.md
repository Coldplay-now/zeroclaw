# ZeroClaw Channel 机制详解

> 一句话概括：`Channel` 是 ZeroClaw 的“消息平台适配层”，统一抽象了“收消息（listen）/发消息（send）/健康检查（health_check）”，让 Telegram、Discord、Slack、CLI 等入口共用同一套 Agent 处理流水线。

---

## 阅读导航

- 前置阅读：`04-agent-loop.md`、`05-provider-trait.md`
- 建议后续：`07-tool-trait.md`、`08-memory-trait.md`

---

## 1. Channel 在系统中的角色

在 ZeroClaw 中，`Channel` 不是“模型能力”，而是“通信入口与出口”：

- **入口**：从外部平台接收用户消息，转成统一结构 `ChannelMessage`
- **出口**：把 Agent 回答通过平台 API 回发给目标会话
- **隔离变化**：平台差异（鉴权、格式、轮询/WebSocket）封装在各自实现里，不污染核心 Agent 逻辑

你可以把它理解为：**适配器 + 路由器的组合层**。

---

## 2. Trait 定义：统一协议

关键接口在 `src/channels/traits.rs:46-73`：

```rust
#[async_trait]
pub trait Channel: Send + Sync {
    fn name(&self) -> &str;
    async fn send(&self, message: &SendMessage) -> anyhow::Result<()>;
    async fn listen(&self, tx: tokio::sync::mpsc::Sender<ChannelMessage>) -> anyhow::Result<()>;

    async fn health_check(&self) -> bool { true }
    async fn start_typing(&self, _recipient: &str) -> anyhow::Result<()> { Ok(()) }
    async fn stop_typing(&self, _recipient: &str) -> anyhow::Result<()> { Ok(()) }
}
```

这段定义了 Channel 的最小契约：

- **`name()`**：用于运行时识别和日志标注
- **`listen()`**：长循环监听消息，向总线发送 `ChannelMessage`
- **`send()`**：按平台规则回消息
- **可选能力**：健康检查、typing 指示器（有的平台支持，有的不支持）

---

## 3. 消息标准化结构：平台无关

消息统一结构在 `src/channels/traits.rs:5-12`：

```rust
pub struct ChannelMessage {
    pub id: String,
    pub sender: String,
    pub reply_target: String,
    pub content: String,
    pub channel: String,
    pub timestamp: u64,
}
```

重点字段：

- **`channel`**：标识来源平台（如 `telegram`、`discord`）
- **`sender`**：发送者身份（用户名、用户 ID 等）
- **`reply_target`**：回包目标（频道 ID、chat_id、thread 标识等）

这保证核心 Agent 无需知道“某平台具体怎么回”，只依赖标准字段。

---

## 4. 运行流程：多 Channel 汇聚到一条 Agent 流水线

`src/channels/mod.rs` 做了三件关键事：

1. 按配置创建已启用的 Channel 实例（Telegram/Discord/Slack/...）
2. 给每个 Channel 启动监听任务（带自动重启退避）
3. 所有消息进入统一分发循环，触发同一套 LLM + Tools + Memory 处理

例如在 `src/channels/mod.rs:1239-1247`：

```rust
let (tx, rx) = tokio::sync::mpsc::channel::<traits::ChannelMessage>(100);
for ch in &channels {
    handles.push(spawn_supervised_listener(
        ch.clone(),
        tx.clone(),
        initial_backoff_secs,
        max_backoff_secs,
    ));
}
```

以及在 `src/channels/mod.rs:239-243`：

```rust
if let Some(channel) = target_channel.as_ref() {
    if let Err(e) = channel
        .send(&SendMessage::new(response, &msg.reply_target))
        .await
```

这说明“收”和“发”都通过 `Channel trait` 完成，核心逻辑只关心统一消息结构。

---

## 5. 安全与治理：allowlist 在 Channel 层落地

ZeroClaw 的“谁能给我发消息”规则大多在 Channel 层执行。

以 Telegram 为例（`src/channels/telegram.rs:352-357`）：

```rust
fn is_user_allowed(&self, username: &str) -> bool {
    let identity = Self::normalize_identity(username);
    self.allowed_users
        .read()
        .map(|users| users.iter().any(|u| u == "*" || u == &identity))
        .unwrap_or(false)
}
```

并且未授权用户会收到可执行的绑定提示（`bind-telegram` 流程），实现“默认拒绝、显式放行”。

---

## 6. 配置视角：哪些 Channel 可用

`src/config/schema.rs:1357-1373` 定义了渠道配置总表：

- `telegram`
- `discord`
- `slack`
- `mattermost`
- `webhook`
- `imessage`
- `matrix`
- `signal`
- `whatsapp`
- `email`
- `irc`
- `lark`
- `dingtalk`
- `qq`
- `cli`（默认可用）

CLI 命令入口在 `src/main.rs:316-340`，你会用到：

- `zeroclaw channel list`
- `zeroclaw channel start`
- `zeroclaw channel doctor`
- `zeroclaw channel bind-telegram <IDENTITY>`

---

## 7. 设计决策（为什么这么做）

### 7.1 Trait 抽象优先

**好处**：新增平台只需实现 trait，不改 Agent 主循环；符合“开放扩展、封闭修改”。

### 7.2 总线汇聚 + 并发处理

**好处**：多入口统一消费，天然支持并发和限流，工程复杂度可控。

### 7.3 安全策略前移到 Channel

**好处**：尽早拦截未授权输入，减少无效 LLM 调用与风险暴露。

---

## 8. Channel 与 Webhook/Gateway 的区别

- **Channel**：平台连接器（Telegram/Discord 等会话平台）
- **Gateway/Webhook**：HTTP API 入口（`/pair`、`/webhook`、`/whatsapp`）

两者都属于“外部输入通道”，但接入方式不同：  
一个偏“聊天平台协议”，一个偏“HTTP 服务协议”。

---

## 9. 小结

`Channel` 是 ZeroClaw 高扩展性的关键拼图：

- 它把“平台差异”压缩在适配层
- 让 Agent 核心逻辑只处理统一消息模型
- 通过 allowlist 与 health check 兼顾安全与稳定

换句话说：**Provider 决定“怎么想”（LLM），Channel 决定“从哪来、回到哪去”（通信）。**

---

## 10. 延伸阅读

- `src/channels/traits.rs`（接口契约）
- `src/channels/mod.rs`（运行时编排）
- `src/channels/telegram.rs`（完整实现 + allowlist + 绑定流程）
- `src/channels/discord.rs`（mention_only / listen_to_bots 等策略）
- `src/config/schema.rs`（渠道配置模型）
- `examples/custom_channel.rs`（自定义 Channel 示例）
