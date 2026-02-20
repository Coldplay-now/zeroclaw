#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
fail() { echo "[FAIL] $*"; }

echo "== ZeroClaw 本地诊断 =="
echo "BACKEND_URL=${BACKEND_URL}"
echo "FRONTEND_URL=${FRONTEND_URL}"
echo

if [[ -f "${ENV_FILE}" ]]; then
  HAS_EMAIL_PASS="$(python3 - "${ENV_FILE}" <<'PY'
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore")
print("yes" if any(line.startswith("EMAIL_TOOL_PASSWORD=") for line in text.splitlines()) else "no")
PY
)"
  if [[ "${HAS_EMAIL_PASS}" == "yes" ]]; then
    ok ".env 中存在 EMAIL_TOOL_PASSWORD"
  else
    warn ".env 中缺少 EMAIL_TOOL_PASSWORD，email_send 可能失败"
  fi
else
  warn "未找到 .env: ${ENV_FILE}"
fi

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  ok "端口 3000 有监听（后端进程存在）"
else
  fail "端口 3000 无监听（后端未运行）"
fi

if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  ok "端口 5173 有监听（前端进程存在）"
else
  fail "端口 5173 无监听（前端未运行）"
fi

if curl -sS -m 5 "${BACKEND_URL}/health" >/tmp/zc_backend_health.json 2>/tmp/zc_backend_health.err; then
  ok "后端 /health 可达"
  echo "    响应: $(cat /tmp/zc_backend_health.json)"
else
  fail "后端 /health 不可达"
  echo "    错误: $(cat /tmp/zc_backend_health.err)"
fi

if curl -sS -m 5 "${FRONTEND_URL}/api/health" >/tmp/zc_front_proxy_health.json 2>/tmp/zc_front_proxy_health.err; then
  ok "前端代理 /api/health 可达"
  echo "    响应: $(cat /tmp/zc_front_proxy_health.json)"
else
  fail "前端代理 /api/health 不可达"
  echo "    错误: $(cat /tmp/zc_front_proxy_health.err)"
fi

HTTP_CODE="$(curl -sS -m 5 -o /tmp/zc_webhook_noauth.json -w "%{http_code}" \
  -X POST "${BACKEND_URL}/webhook" \
  -H "Content-Type: application/json" \
  -d '{"message":"diagnose"}' || true)"
if [[ "${HTTP_CODE}" == "401" ]]; then
  ok "鉴权行为正常：未携带 token 调 /webhook 返回 401"
else
  warn "鉴权返回非预期状态码: ${HTTP_CODE}"
fi

echo
echo "== 诊断完成 =="
