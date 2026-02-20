---
name: zero-restart
description: "重启 ZeroClaw 前后端服务并生成 paircode。支持本地启动和 Docker 启动两种模式。"
---

# ZeroClaw 服务重启 Skill

用户调用 `/zero-restart` 时，按以下流程执行：

## 第一步：询问启动模式

使用 AskUserQuestion 工具询问用户选择启动模式：

- **本地启动**：使用 cargo run 启动后端 + npm run dev 启动前端
- **Docker 启动**：使用 docker compose 启动全部服务（后端 + 前端 + Chrome）

如果用户通过参数指定了模式（`$ARGUMENTS` 包含 `local` 或 `docker`），跳过询问直接执行。

## 第二步：停止现有服务

### 本地模式

```bash
bash learn-zeroclaw/local-services.sh stop
```

### Docker 模式

```bash
docker compose -f learn-zeroclaw/docker-compose.yml down
```

## 第三步：启动服务

### 本地模式

```bash
bash learn-zeroclaw/local-services.sh start
```

启动后等待 5 秒，然后读取后端日志获取 paircode：

```bash
sleep 5 && cat learn-zeroclaw/workspace/.run/backend.log
```

服务地址：
- 后端网关: http://127.0.0.1:3000
- 前端 Web UI: http://localhost:5173

### Docker 模式

```bash
docker compose -f learn-zeroclaw/docker-compose.yml up -d --build
```

启动后等待容器就绪，然后查看后端日志获取 paircode：

```bash
sleep 10 && docker compose -f learn-zeroclaw/docker-compose.yml logs zeroclaw
```

服务地址：
- 后端网关: http://localhost:3000（容器内部）
- 前端 Web UI: http://localhost:8080
- Chrome noVNC: http://localhost:7900

## 第四步：验证服务状态

### 本地模式

```bash
bash learn-zeroclaw/local-services.sh status
```

同时检查健康端点：

```bash
curl -s http://127.0.0.1:3000/health
```

### Docker 模式

```bash
docker compose -f learn-zeroclaw/docker-compose.yml ps
```

## 第五步：提取并展示 Paircode

从日志输出中找到 paircode（6位数字，出现在 `PAIRING REQUIRED` 后面的方框中），将其高亮展示给用户。

输出格式示例：

```
服务已重启完成！

启动模式: 本地 / Docker
后端状态: 运行中
前端状态: 运行中

Paircode: 123456

配对方式: POST /pair with header X-Pairing-Code: 123456
curl -X POST http://127.0.0.1:3000/pair -H "X-Pairing-Code: 123456"
```

如果日志中显示 `Pairing: ACTIVE`（已有配对 token），则告知用户无需新 paircode，已有 bearer token 生效中。

如果日志中显示 `Pairing: DISABLED`，则告知用户 pairing 已关闭，无需 paircode。

## 注意事项

- 如果后端编译耗时较长（cargo build），提前告知用户需要等待
- Docker 模式需要确保 Docker Desktop 正在运行
- 如果端口被占用，提示用户先手动释放端口
- 本地模式依赖 learn-zeroclaw/.env 中的 API_KEY 等环境变量
