# ZeroClaw Baseline Eval Framework

> 目标：在引入 RE-TRAC 前建立可复现的基线评测，后续做前后对比。

---

## 1. 目录结构

```text
learn-zeroclaw/eval/
├── README.md
├── rubric.md
├── config/
│   └── baseline.env.example
├── tasks/
│   └── baseline_tasks.jsonl
├── scripts/
│   ├── run_baseline.py
│   └── summarize_baseline.py
└── reports/
    └── .gitkeep
```

---

## 2. 指标定义（默认）

- 质量：`task_success`、`score_quality`（1-5）
- 效率：`latency_ms`、`iterations`、`tool_calls`
- 成本：`token_input`、`token_output`、`cost_estimate_usd`
- 稳定性：`error_type`、`timeout`、`empty_loop`

说明：

- 当前框架先产出统一格式结果，质量分可先人工打分。
- 如果返回中没有 token/cost 字段，填 `null`，不阻塞流水线。

---

## 3. 快速开始

1) 复制环境变量模板：

```bash
cp learn-zeroclaw/eval/config/baseline.env.example .env.eval
```

2) 启动本地服务（示例）：

```bash
bash learn-zeroclaw/local-services.sh start --release
```

3) 运行基线（默认 3 次重复）：

```bash
python3 learn-zeroclaw/eval/scripts/run_baseline.py \
  --tasks learn-zeroclaw/eval/tasks/baseline_tasks.jsonl \
  --out learn-zeroclaw/eval/reports/baseline-raw.jsonl \
  --repeats 3
```

> `baseline_tasks.jsonl` 为开发期 5 条 smoke 集；  
> 完整对比请使用 `baseline_tasks_full.jsonl`（20 条）。

4) 生成汇总：

```bash
python3 learn-zeroclaw/eval/scripts/summarize_baseline.py \
  --input learn-zeroclaw/eval/reports/baseline-raw.jsonl \
  --output learn-zeroclaw/eval/reports/baseline-summary.md
```

---

## 4. 对比 RE-TRAC 的方法

建议固定以下参数，保证可比性：

- 相同模型与温度
- 相同 `max_tool_iterations` / `max_history_messages`
- 相同任务集与重复次数

完成 RE-TRAC-lite 后，仅替换执行策略，再跑一次同样命令，比较：

- 平均工具调用数
- 平均 token
- 任务成功率
- P95 时延

---

## 5. 默认假设（可改）

- API 网关：`http://127.0.0.1:3000/webhook`
- 鉴权：从 `ZEROCLAW_BEARER_TOKEN` 环境变量读取
- 每个任务跑 `3` 次
- 请求超时：`120` 秒

---

## 6. 下一步建议

- 先跑 `5` 个 smoke 任务（已有样例）
- 确认结果格式和评分口径后，再扩展到 `20+` 任务
- 在 CI 中增加“基线回归检查”（后续可做）
