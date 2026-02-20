# Web Dashboard 开发记录

> **分支**: `feat/web-dashboard-phase-1`
> **日期**: 2026-02-20
> **状态**: 已完成

---

## 一、项目概述

为 ZeroClaw 自治 Agent 运行时实现了完整的 **Web 管理仪表板**，将原本只能通过 CLI 和 Telegram 交互的系统扩展为浏览器可视化管理平台。

### 解决的问题

| 之前 | 之后 |
|------|------|
| 系统状态只能通过 `zeroclaw status` CLI 查看 | 浏览器实时 Dashboard，组件健康一目了然 |
| 配置修改需要编辑 TOML 文件并重启 | Settings 页面在线热更新模型、温度等参数 |
| 记忆管理只能通过 Agent 工具调用 | Memory 页面可搜索、浏览、增删改 |
| 定时任务管理依赖 CLI | Scheduler 页面可视化创建、暂停、查看历史 |
| 系统提示词编辑需要 SSH 进容器 | Prompts 页面在线编辑 + 组装预览 |
| 审计日志无可视化 | Audit 页面按类型、风险筛选 |
| 无全局搜索 | `Cmd+K` 全局搜索页面 + 记忆条目 |

### 代码统计

```
61 个文件变更
+9,949 行新增 / -236 行删除
11 个功能页面
45 个前端测试用例（全部通过）
15+ 个后端 API 端点
中英文双语支持（12 个 i18n 命名空间）
```

---

## 二、技术架构

### 后端（Rust / Axum）

在 `src/gateway/mod.rs` 中扩展 Axum HTTP Gateway，新增 15+ 个 RESTful API 端点：

```
认证
  POST /pair             — 配对认证（已有）
  GET  /health           — 健康检查（已有）

Phase 1 — 状态总览
  GET  /status           — 系统状态聚合（版本、uptime、组件健康、workspace）

Phase 2 — 提示词管理
  GET  /prompts          — 提示词文件列表
  GET  /prompts/:file    — 单文件内容
  PUT  /prompts/:file    — 更新文件
  GET  /prompts/preview  — 组装预览

Phase 3 — 记忆、工具、调度
  GET  /memory           — 记忆列表（分类/session 筛选）
  GET  /memory/stats     — 记忆统计
  GET  /memory/search    — 语义搜索
  POST /memory           — 新建记忆
  DELETE /memory/:key    — 删除记忆
  GET  /tools            — 工具列表
  GET  /tools/:name      — 工具详情（参数 schema）
  GET  /cron/jobs        — 定时任务列表
  POST /cron/jobs        — 创建任务
  PATCH /cron/jobs/:id   — 更新/暂停/恢复
  DELETE /cron/jobs/:id  — 删除任务
  GET  /cron/jobs/:id/runs — 执行历史

Phase 4 — 审计与指标
  GET  /audit/logs       — 审计日志（分页 + 类型筛选）
  GET  /metrics          — 系统指标聚合

Phase 5 — 技能、配置、通道
  GET  /skills           — 技能列表
  GET  /skills/:name     — 技能详情
  GET  /config           — 配置查看（API Key 脱敏）
  PATCH /config          — 热更新白名单字段
  GET  /channels         — 通道状态
```

**认证机制**：所有管理端点（除 `/health` 和 `/pair`）均需 Bearer Token 认证。Token 通过 6 位 Pairing Code 换取，SHA-256 哈希存储。

### 前端（React 19）

```
技术栈:
  React 19 + TypeScript
  Vite 7 (构建工具)
  Tailwind CSS 4 + shadcn/ui (UI 组件)
  @tanstack/react-query (服务端状态管理)
  react-router-dom (路由)
  react-i18next (国际化)
  react-markdown + rehype-highlight (Markdown 渲染)
  recharts (图表)
  vitest + @testing-library/react (测试)
```

**构建产物**：617 KB JS (187 KB gzip)，通过 nginx:alpine 容器分发。

---

## 三、功能页面一览

### 1. Dashboard（状态总览）
- 系统状态卡片：运行状态、当前模型、记忆后端、自治等级
- 组件健康列表：红绿灯指示 + 最后活跃时间 + 重启次数
- Quick Stats：记忆条目数、工具注册数、定时任务、总重启次数、Observer 后端
- 10 秒自动刷新

### 2. Chat（对话）
- Markdown 渲染 + 代码语法高亮
- 工具调用可视化
- 模型信息展示
- Webhook 响应元数据（model、tool_calls、duration_ms）

### 3. Prompts（系统提示词）
- 8 个提示词文件卡片：文件名、职责标签、字符数进度条
- 在线编辑器：等宽字体、实时字符计数、20K 上限警告
- 组装预览：按 ZeroClaw 拼装顺序查看完整提示词
- 保存前确认对话框

### 4. Memory（记忆管理）
- 搜索栏 + 分类 Tab 筛选
- 记忆卡片：key、content 预览、分类标签、时间
- 新建 / 编辑 / 删除记忆
- 语义搜索（调用后端 `/memory/search`）

### 5. Tools（工具注册表）
- 分类 Tab 筛选
- 工具卡片：名称、描述
- 详情展开：参数 JSON Schema

### 6. Scheduler（定时任务）
- 任务卡片：名称、cron 表达式、下次执行、上次状态
- 新建任务表单
- 暂停 / 恢复 / 编辑 / 删除
- 展开查看执行历史

### 7. Audit（审计日志）
- 时间线样式日志流
- 事件类型筛选下拉
- PolicyViolation / AuthFailure 高亮
- 日志条目展开查看完整详情

### 8. Metrics（系统指标）
- 系统概览：uptime、PID、组件健康统计
- 子系统详情：记忆后端、工具注册数、定时任务统计
- Observer 后端信息

### 9. Skills（技能系统）
- 技能卡片网格：名称、版本、作者、标签、工具数/提示词数
- 搜索过滤
- 展开详情：工具列表 + 提示词列表

### 10. Channels（通道状态）
- 已配置通道：状态灯（green/red/yellow）、重启次数、错误信息
- 未配置通道：灰色虚线卡片 + 配置提示
- 统计汇总："N / 15 configured"

### 11. Settings（配置管理）
- **可热更新**：模型、温度、自治等级、记忆自动保存、心跳开关/间隔
- **只读**：网关配置（端口、主机）、费用限制、API Key（脱敏为 `***`）
- 保存按钮调用 `PATCH /config`，返回更新/拒绝字段列表

### 全局功能
- **GlobalSearch**：`Cmd/Ctrl+K` 唤出，搜索页面导航 + 记忆条目，键盘导航
- **Sidebar**：11 个导航项，图标 + 文字，折叠/展开
- **语言切换**：中文 / English 一键切换
- **登出**：清除 token，返回配对页面

---

## 四、国际化（i18n）

12 个命名空间，中英文各一套：

```
common      — 通用文案（应用名、导航、搜索、登出）
dashboard   — 仪表板
chat        — 对话
prompts     — 系统提示词
memory      — 记忆
tools       — 工具
scheduler   — 定时任务
audit       — 审计日志
metrics     — 系统指标
skills      — 技能
channels    — 通道
settings    — 配置
```

语言检测优先级：`localStorage` → `navigator.language` → 默认 `en`

---

## 五、测试覆盖

11 个测试文件，45 个测试用例，全部通过：

| 测试文件 | 用例数 | 覆盖内容 |
|----------|--------|----------|
| `Sidebar.test.tsx` | 6 | 导航渲染、折叠/展开、语言切换、登出 |
| `Dashboard.test.tsx` | 4 | 加载态、错误态、数据渲染、组件健康 |
| `Prompts.test.tsx` | 4 | 加载态、错误态、文件列表、字符统计 |
| `Memory.test.tsx` | 4 | 加载态、错误态、记忆列表、分类标签 |
| `Tools.test.tsx` | 4 | 加载态、错误态、工具列表、工具描述 |
| `Scheduler.test.tsx` | 5 | 加载态、错误态、任务列表、cron 表达式、执行历史 |
| `Audit.test.tsx` | 4 | 加载态、错误态、日志条目、事件类型筛选 |
| `Metrics.test.tsx` | 4 | 加载态、错误态、系统概览、子系统详情 |
| `Skills.test.tsx` | 4 | 加载态、错误态、技能列表、标签展示 |
| `Channels.test.tsx` | 4 | 加载态、错误态、已配置通道、配置统计 |
| `Settings.test.tsx` | 4 | 加载态、错误态、配置渲染、只读网关 |

---

## 六、Docker 构建修复

### 问题
`learn-zeroclaw/Dockerfile` 的依赖缓存阶段只创建了 dummy `src/main.rs`，但 `Cargo.toml` 声明了 `[[bench]]` target `agent_benchmarks`，导致 Cargo manifest 解析失败：

```
error: can't find `agent_benchmarks` bench at `benches/agent_benchmarks.rs`
```

### 修复
在依赖缓存阶段同时创建 dummy bench 文件，与主仓库 `Dockerfile` 保持一致：

```dockerfile
# 修复前
RUN mkdir src && echo "fn main() {}" > src/main.rs

# 修复后
RUN mkdir -p src benches && echo "fn main() {}" > src/main.rs && echo "fn main() {}" > benches/agent_benchmarks.rs
```

---

## 七、认证流程

```
                    ┌─────────────────────┐
                    │  Gateway 启动        │
                    │  生成 6 位 Pairing   │
                    │  Code（CSPRNG）      │
                    └─────────┬───────────┘
                              │ 打印到终端
                              ▼
┌─────────────────────────────────────────────────┐
│  Web UI → /pair 页面                             │
│  用户输入 6 位码 → POST /pair                    │
│  返回 zc_<64-hex> Bearer Token                   │
│  存入 localStorage                               │
└─────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────┐
│  后续请求: Authorization: Bearer zc_...          │
│  服务端: SHA-256(token) ∈ paired_tokens → 200    │
│  401 → 清除 localStorage → 重定向 /pair          │
└─────────────────────────────────────────────────┘
```

**安全属性**：
- Pairing Code 一次性使用，用完即销毁
- Token 256 位熵（32 字节 CSPRNG），服务端仅存 SHA-256 哈希
- 防暴力破解：5 次失败锁定 5 分钟
- 速率限制：每分钟每 IP 最多 10 次 pair 请求

---

## 八、分阶段开发记录

### Phase 1 — 基础框架 + 状态总览 `9e1fb34` `54bb993`
- 后端：`GET /status` + Bearer Token 认证
- 前端：React Router、Sidebar、Dashboard、i18n 基础设施、Pairing 流程
- 测试框架：vitest + @testing-library/react

### Phase 2 — 聊天增强 + 提示词管理 `0b9177e`
- 后端：Prompts CRUD API（列表、读取、更新、预览），Webhook 响应扩展（model、tool_calls、duration_ms）
- 前端：Chat Markdown 渲染 + 代码高亮，Prompts 页面（编辑器、组装预览）

### Phase 3 — 记忆、工具与调度 `ba3237f`
- 后端：Memory API（CRUD + 搜索 + 统计），Tools API（列表 + 详情），Cron API（CRUD + 暂停/恢复 + 执行历史）
- 前端：Memory、Tools、Scheduler 三个完整页面

### Phase 4 — 审计与可观测性 `80e2a7d`
- 后端：Audit Logs API（分页 + 类型筛选），Metrics API（系统指标聚合）
- 前端：Audit、Metrics 页面，Dashboard Quick Stats 回填真实数据

### Phase 5 — 技能、配置与通道 `db502e9`
- 后端：Skills API（列表 + 详情），Config API（查看 + 热更新），Channels API（全通道状态）
- 前端：Skills、Channels、Settings 页面，GlobalSearch（Cmd+K），Sidebar 全部 11 项启用

### Docker 修复 `3fe9eef`
- Dockerfile 依赖缓存阶段创建 dummy bench 文件，修复构建失败

---

## 九、已知限制

1. **Token 持久化**：Docker bind mount 环境下 `config.toml` 的原子替换会报 `Device or resource busy`，导致 Token 无法持久化。容器重启后需重新配对。
2. **Metrics 图表**：当前 Metrics 页面展示数值数据，未引入时序图表（recharts 已安装但暂未使用）。
3. **SSE 实时推送**：审计日志和 Dashboard 使用 polling（10-30 秒间隔），未实现 SSE 推送。
4. **Skills 安装/卸载**：后端 API 仅支持列表和详情查看，未实现在线安装/卸载。
5. **SkillForge 集成**：SkillForge 扫描和候选管理 API 未实现。

---

## 十、文件结构

```
learn-zeroclaw/
├── Dockerfile                              # 修复 bench 文件缓存问题
├── web-ui/
│   ├── src/
│   │   ├── App.tsx                          # 路由容器 + RequireAuth
│   │   ├── components/
│   │   │   ├── Chat.tsx                     # 对话组件（Markdown + 工具调用）
│   │   │   ├── GlobalSearch.tsx             # Cmd+K 全局搜索
│   │   │   ├── PairingForm.tsx              # 配对认证表单
│   │   │   ├── Sidebar.tsx                  # 侧边栏导航
│   │   │   └── Sidebar.test.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx + test         # 状态总览
│   │   │   ├── Prompts.tsx + test           # 系统提示词
│   │   │   ├── Memory.tsx + test            # 记忆管理
│   │   │   ├── Tools.tsx + test             # 工具注册表
│   │   │   ├── Scheduler.tsx + test         # 定时任务
│   │   │   ├── Audit.tsx + test             # 审计日志
│   │   │   ├── Metrics.tsx + test           # 系统指标
│   │   │   ├── Skills.tsx + test            # 技能系统
│   │   │   ├── Channels.tsx + test          # 通道状态
│   │   │   └── Settings.tsx + test          # 配置管理
│   │   ├── i18n/
│   │   │   ├── index.ts                     # i18next 初始化
│   │   │   └── locales/{en,zh}/             # 12 个命名空间 × 2 语言
│   │   ├── lib/
│   │   │   └── api.ts                       # API 客户端（535 行）
│   │   └── test/
│   │       └── setup.ts                     # 测试基础设施
│   └── nginx.conf                           # nginx 反向代理
│
src/
├── gateway/mod.rs                           # +1,444 行 API 端点
├── agent/loop_.rs                           # rustfmt 格式化
└── tools/git_operations.rs                  # rustfmt 格式化
```
