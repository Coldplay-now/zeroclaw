# 本地长驻与 Pair Code 使用说明

这份文档用于在 **非 Docker** 模式下，稳定运行 ZeroClaw 前后端，并在需要时获取新的 `pair code`。

## 1. 脚本位置

- 服务管理脚本：`learn-zeroclaw/local-services.sh`
- 诊断脚本：`learn-zeroclaw/diagnose-local.sh`

## 2. 服务长驻（前后端）

在项目根目录执行：

```bash
bash learn-zeroclaw/local-services.sh start
```

如需后端使用更省资源的 `release` 模式：

```bash
bash learn-zeroclaw/local-services.sh start --release
```

常用命令：

```bash
# 查看状态
bash learn-zeroclaw/local-services.sh status

# 查看日志（后端 + 前端）
bash learn-zeroclaw/local-services.sh logs

# 重启
bash learn-zeroclaw/local-services.sh restart

# 以 release 模式重启后端（前端不变）
bash learn-zeroclaw/local-services.sh restart --release

# 停止
bash learn-zeroclaw/local-services.sh stop
```

说明：

- 后端默认地址：`http://127.0.0.1:3000`
- 前端默认地址：`http://localhost:5173`
- 脚本会在 `learn-zeroclaw/workspace/.run/` 下维护 PID 和日志文件
- 后端默认 `debug` 模式；传 `--release` 时改用 `target/release/zeroclaw`
- `status` 会显示后端当前模式（`debug` / `release` / `unknown`），并检查后端 `/health` 与前端代理 `/api/health`

## 3. 一键系统诊断

```bash
bash learn-zeroclaw/diagnose-local.sh
```

诊断会检查：

- `.env` 中是否存在 `EMAIL_TOOL_PASSWORD`
- 端口 `3000` / `5173` 是否监听
- 后端 `/health` 是否可达
- 前端代理 `/api/health` 是否可达
- `/webhook` 未带 token 时是否正确返回 `401`

## 4. 当前为什么看不到 Pair Code

当 `learn-zeroclaw/workspace/config.toml` 中 `[gateway].paired_tokens` 非空时，网关视为已配对状态，启动时不会再打印新的一次性 `pair code`。

## 5. 获取新的 Pair Code（一键命令）

> 会清空已配对 token，并重启服务。旧 token 会失效，需要重新配对。

在项目根目录执行：

```bash
bash -lc 'python3 - <<'"'"'PY'"'"'
from pathlib import Path
import re
p = Path("learn-zeroclaw/workspace/config.toml")
s = p.read_text(encoding="utf-8")
s = re.sub(r"^paired_tokens\s*=.*$", "paired_tokens = []", s, flags=re.M)
p.write_text(s, encoding="utf-8")
print("paired_tokens cleared")
PY
bash learn-zeroclaw/local-services.sh restart
sleep 2
python3 - <<'"'"'PY'"'"'
from pathlib import Path
import re
log = Path("learn-zeroclaw/workspace/.run/backend.log").read_text(encoding="utf-8", errors="ignore")
m = re.search(r"X-Pairing-Code:\s*([0-9]{6})", log)
print("PAIR_CODE=" + m.group(1) if m else "未找到 PairCode，请稍后再执行一次")
PY'
```

## 6. 用 Pair Code 交换 Bearer Token

拿到 6 位码后执行：

```bash
curl -X POST http://127.0.0.1:3000/pair \
  -H "X-Pairing-Code: 123456"
```

成功后会返回 token，后续请求 `webhook` 等受保护接口时携带：

```bash
Authorization: Bearer <token>
```

## 7. 安全建议

- 不要在文档或聊天中长期保留明文密码/密钥
- 如果密钥曾被明文暴露，建议尽快轮换
- `pair code` 为一次性验证码，使用后即失效
