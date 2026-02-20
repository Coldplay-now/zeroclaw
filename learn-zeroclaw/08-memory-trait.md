# ZeroClaw Memory 机制详解

> 一句话概括：`Memory` 是 ZeroClaw 的“长期上下文层”，通过统一 trait 抽象多种后端（sqlite/lucid/markdown/none），为 Agent 提供可检索、可持久化、可治理的记忆能力。

---

## 阅读导航

- 前置阅读：`04-agent-loop.md`、`05-provider-trait.md`、`07-tool-trait.md`
- 建议后续：`03-web-dashboard-prd.md`、`04-web-dashboard-tasks.md`

---

## 1. Memory 在系统中的角色

`Memory` 解决的是：**跨轮对话如何保留关键信息**。

在 ZeroClaw 里，它主要承担三类职责：

- **写入**：把用户偏好、事实、会话摘要保存下来
- **召回**：在新消息到来时检索相关记忆，注入上下文
- **治理**：通过 hygiene/snapshot/hydrate 机制维持记忆质量与可恢复性

---

## 2. Trait 定义：统一存储契约

核心定义在 `src/memory/traits.rs`：

- `store(key, content, category, session_id)`：写入
- `recall(query, limit, session_id)`：检索
- `get / list / forget / count / health_check`：管理与可观测

并且有统一的数据结构：

- `MemoryEntry`：标准化记忆项（含 `category/score/session_id`）
- `MemoryCategory`：`core` / `daily` / `conversation` / `custom`

这使上层（Agent/Channel）无需关心后端细节。

---

## 3. 后端工厂：同一接口，多种实现

在 `src/memory/mod.rs`，`create_memory(...)` 会根据配置选择具体后端：

- `sqlite`：默认主力后端（混合检索）
- `lucid`：桥接外部 Lucid，同时保留本地 SQLite
- `markdown`：纯文件型记忆（`MEMORY.md` + `memory/YYYY-MM-DD.md`）
- `none`：显式 no-op（关闭持久化）

此外还内置了几个“生命周期动作”：

- `hygiene::run_if_due`：周期性记忆清理
- `snapshot::export_snapshot`：快照导出
- `snapshot::hydrate_from_snapshot`：冷启动自动回填（brain.db 缺失时）

---

## 4. SQLite 后端：混合检索核心

`src/memory/sqlite.rs` 的设计很关键，它不是简单 KV 存储，而是混合搜索引擎：

- **关键词层**：FTS5 + BM25
- **向量层**：embedding BLOB + cosine similarity
- **融合层**：`vector::hybrid_merge(...)`，按 `vector_weight/keyword_weight` 合并排序
- **缓存层**：`embedding_cache` 降低重复嵌入成本

可以把它理解为“轻量版本地 RAG 记忆引擎”。

---

## 5. Markdown 与 None：两个重要对照实现

### 5.1 `MarkdownMemory`（`src/memory/markdown.rs`）

- 可读、可编辑、可审计
- `core` 记入 `MEMORY.md`
- 其余类别追加到每日日志文件
- 偏“文档型记忆”，适合透明场景

### 5.2 `NoneMemory`（`src/memory/none.rs`）

- 所有 `store/recall/list/get` 都是 no-op/空结果
- 用于明确关闭持久化
- 但接口保持一致，不破坏运行时 wiring

---

## 6. Memory 如何接入 Agent/Channel 主流程

在 `src/agent/loop_.rs` 与 `src/channels/mod.rs` 中，典型流程是：

1. 收到用户消息
2. `mem.recall(...)` 召回 top-k 相关记忆
3. 把记忆上下文拼进 prompt
4. 模型生成回复后，按 `auto_save` 决定是否 `mem.store(...)`

这意味着记忆是“在线参与推理”的，不是离线日志。

---

## 7. `auto_save` 的实际意义

`config.memory.auto_save` 会直接影响是否自动沉淀会话内容：

- 开启：对话信息持续进入 `conversation/daily` 记忆，后续更“懂你”
- 关闭：只读召回已有记忆，不新增自动记忆（更克制、更可控）

这也是“智能性 vs 可控性”的关键调参点之一。

---

## 8. 设计决策（为什么这样做）

### 8.1 先抽象 trait，再选后端

好处是后端可替换，业务逻辑稳定；符合 ZeroClaw 的 trait-first 哲学。

### 8.2 本地优先混合检索

FTS + 向量融合兼顾精确匹配和语义匹配，不依赖外部向量数据库。

### 8.3 明确提供 `none` 后端

不是“偷偷不存”，而是可声明、可审计的关闭状态，便于安全与隐私治理。

---

## 9. 小结

`Memory trait` 让 ZeroClaw 具备“持续记住上下文”的能力，同时保持架构可替换、可治理：

- trait 统一接口
- factory 统一接线
- sqlite 提供高质量检索
- markdown/none 提供透明与极简模式

在四大核心抽象里，Memory 决定的是：**系统能否在长期交互中形成稳定“工作记忆”**。

---

## 10. 延伸阅读

- `src/memory/traits.rs`
- `src/memory/mod.rs`
- `src/memory/sqlite.rs`
- `src/memory/markdown.rs`
- `src/memory/none.rs`
- `src/agent/loop_.rs`
- `src/channels/mod.rs`
