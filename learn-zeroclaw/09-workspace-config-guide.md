# ZeroClaw 配置解读：`workspace/config.toml`

> 目标：解释 `learn-zeroclaw/workspace/config.toml` 在当前项目中的作用、关键字段、风险点，以及一套可落地的“开发态/生产态”配置建议。

---

## 阅读导航

- 前置阅读：`01-project-overview.md`、`04-agent-loop.md`
- 建议后续：`05-provider-trait.md`、`06-channel-trait.md`、`07-tool-trait.md`、`08-memory-trait.md`

---

## 1. 这份配置文件管什么

`learn-zeroclaw/workspace/config.toml` 是 ZeroClaw 运行时的核心配置入口，决定了：

- 模型与提供商（Provider）
- 自治与安全策略（Autonomy/Security）
- 工具与外部能力开关（Browser/HTTP/Email/Composio）
- 记忆系统行为（Memory）
- 网关暴露方式（Gateway/Tunnel）
- 调度与稳定性（Scheduler/Reliability）

可以把它看成 Agent 的“运行时总开关”。

---

## 2. 当前配置的整体画像（你这份文件）

按当前内容，这份配置偏向 **高能力开发态**：

- 自治级别：`autonomy.level = "full"`
- 网关：`host = "[::]"` 且 `allow_public_bind = true`
- 浏览器/HTTP：均启用且 `allowed_domains = ["*"]`
- 邮件工具：启用且 `allowed_recipients = ["*"]`
- Composio：启用
- 记忆：`sqlite + auto_save + hygiene`

这类配置适合快速联调，但生产环境需要更严格收敛。

---

## 3. 按模块解读关键字段

## 3.1 Provider 与模型

- `default_provider = "openrouter"`
- `default_model = "moonshotai/kimi-k2.5"`
- `default_temperature = 0.7`

含义：默认走 OpenRouter，并使用 Kimi 模型。  
`temperature=0.7` 适合通用对话；若要更稳定执行任务，建议降到 `0.2~0.5`。

## 3.2 Autonomy（自治与约束）

- `level = "full"`：高自治
- `workspace_only = true`：仅限工作目录（这是好设置）
- `allowed_commands`：命令白名单
- `forbidden_paths`：路径黑名单
- `require_approval_for_medium_risk = true`
- `block_high_risk_commands = true`

这里总体方向正确，但有两个细节值得注意：

- 白名单里包含 `find/curl/wget/python3`，能力很强，需确认符合预期
- 你禁用了 `/tmp`，会影响部分工具/脚本的临时文件工作流

## 3.3 Memory（记忆）

- `backend = "sqlite"`
- `auto_save = true`
- `embedding_provider = "none"`
- `vector_weight = 0.7` / `keyword_weight = 0.3`

这是一个“可运行但偏关键词检索”的组合：  
由于 `embedding_provider = "none"`，向量层质量会受限，混合检索偏向文本匹配。

如果你追求更好召回质量，建议切换为有 embedding 的提供者。

## 3.4 Gateway（网关）

- `host = "[::]"`（监听 IPv6 全地址）
- `allow_public_bind = true`
- `require_pairing = true`

虽然开启了 pairing，但公网监听 + 公开绑定仍然需要谨慎。  
如果不是必须外网访问，建议绑定回 `127.0.0.1`。

## 3.5 Browser / HTTP / Email

当前都很开放：

- `browser.allowed_domains = ["*"]`
- `http_request.allowed_domains = ["*"]`
- `email_tool.allowed_recipients = ["*"]`

这会让工具具备几乎无限制的外部访问与外发能力。  
开发阶段可接受，生产阶段强烈建议改为白名单。

---

## 4. 当前配置里的主要风险点（优先级）

- 高：`gateway.allow_public_bind = true` 且 `host = "[::]"`（网络暴露面大）
- 高：Browser/HTTP 域名全开放（潜在数据外送风险）
- 高：Email 收件人全开放（外发风险）
- 中：`autonomy.level = "full"`（建议结合审批策略使用）
- 中：`embedding_provider = "none"`（记忆召回质量下降）

---

## 5. 推荐配置模板（更稳妥）

下面是一组“更安全”的建议值（可按需求微调）：

```toml
[autonomy]
level = "supervised"
workspace_only = true
require_approval_for_medium_risk = true
block_high_risk_commands = true

[gateway]
host = "127.0.0.1"
allow_public_bind = false
require_pairing = true

[browser]
enabled = true
allowed_domains = ["docs.rs", "github.com", "openrouter.ai"]

[http_request]
enabled = true
allowed_domains = ["api.openrouter.ai", "docs.rs", "github.com"]

[email_tool]
enabled = true
allowed_recipients = ["your-team@company.com"]

[memory]
backend = "sqlite"
auto_save = true
embedding_provider = "openai"  # 或你实际可用的 embedding provider
```

---

## 6. 实操建议（按优先级）

1. 先收敛网络面：把 `gateway.host` 和 `allow_public_bind` 调整到本地模式  
2. 再收敛外部能力：收紧 browser/http/email 白名单  
3. 最后优化记忆：补齐 embedding provider，提高 recall 质量  
4. 若长期运行：优先使用 `supervised`，逐步放权到 `full`

---

## 7. 小结

这份 `workspace/config.toml` 已经具备完整能力，但当前更像“联调配置”而非“生产配置”。  
核心优化方向是：**减少暴露面、收紧外发能力、提高记忆召回质量**。

如果你愿意，我可以下一步直接给你一份“你当前文件的最小改动补丁版”（只改高风险项，保持现有功能尽量不受影响）。  
