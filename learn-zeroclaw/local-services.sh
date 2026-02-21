#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_DIR="${SCRIPT_DIR}/workspace"
WEB_UI_DIR="${SCRIPT_DIR}/web-ui"
ENV_FILE="${SCRIPT_DIR}/.env"
RUN_DIR="${WORKSPACE_DIR}/.run"

BACKEND_PID_FILE="${RUN_DIR}/backend.pid"
FRONTEND_PID_FILE="${RUN_DIR}/frontend.pid"
BACKEND_LOG="${RUN_DIR}/backend.log"
FRONTEND_LOG="${RUN_DIR}/frontend.log"
BACKEND_MODE="debug"

mkdir -p "${RUN_DIR}"

is_running() {
  local pid="$1"
  kill -0 "${pid}" >/dev/null 2>&1
}

read_pid() {
  local pid_file="$1"
  if [[ -f "${pid_file}" ]]; then
    tr -d '[:space:]' <"${pid_file}"
  fi
}

start_backend() {
  local pid
  pid="$(read_pid "${BACKEND_PID_FILE}" || true)"
  if [[ -n "${pid}" ]] && is_running "${pid}"; then
    echo "后端已在运行 (PID: ${pid})"
    return
  fi

  if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    local existing_pid
    existing_pid="$(lsof -t -nP -iTCP:3000 -sTCP:LISTEN | head -n 1 || true)"
    if [[ -n "${existing_pid}" ]]; then
      echo "${existing_pid}" >"${BACKEND_PID_FILE}"
      echo "后端端口 3000 已在监听，接管现有进程 (PID: ${existing_pid})"
      return
    fi
    echo "端口 3000 已被占用，但无法识别进程。"
    exit 1
  fi

  local daemon_cmd
  if [[ "${BACKEND_MODE}" == "release" ]]; then
    daemon_cmd="target/release/zeroclaw daemon --host 127.0.0.1 --port 3000"
  else
    daemon_cmd="cargo run -- daemon --host 127.0.0.1 --port 3000"
  fi

  echo "启动后端网关... (mode: ${BACKEND_MODE})"
  nohup bash -lc "
    set -euo pipefail
    if [[ -f \"${ENV_FILE}\" ]]; then
      set -a
      source \"${ENV_FILE}\"
      set +a
    fi
    cd \"${REPO_ROOT}\"
    ZEROCLAW_WORKSPACE=\"${WORKSPACE_DIR}\" ${daemon_cmd}
  " >"${BACKEND_LOG}" 2>&1 &
  echo $! >"${BACKEND_PID_FILE}"
  sleep 1
  echo "后端启动命令已下发，日志: ${BACKEND_LOG}"
}

start_frontend() {
  local pid
  pid="$(read_pid "${FRONTEND_PID_FILE}" || true)"
  if [[ -n "${pid}" ]] && is_running "${pid}"; then
    echo "前端已在运行 (PID: ${pid})"
    return
  fi

  if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
    local existing_pid
    existing_pid="$(lsof -t -nP -iTCP:5173 -sTCP:LISTEN | head -n 1 || true)"
    if [[ -n "${existing_pid}" ]]; then
      echo "${existing_pid}" >"${FRONTEND_PID_FILE}"
      echo "前端端口 5173 已在监听，接管现有进程 (PID: ${existing_pid})"
      return
    fi
    echo "端口 5173 已被占用，但无法识别进程。"
    exit 1
  fi

  echo "启动前端 Vite..."
  nohup bash -lc "
    set -euo pipefail
    cd \"${WEB_UI_DIR}\"
    npm run dev
  " >"${FRONTEND_LOG}" 2>&1 &
  echo $! >"${FRONTEND_PID_FILE}"
  sleep 1
  echo "前端启动命令已下发，日志: ${FRONTEND_LOG}"
}

stop_one() {
  local name="$1"
  local pid_file="$2"
  local pid
  pid="$(read_pid "${pid_file}" || true)"

  if [[ -z "${pid}" ]]; then
    echo "${name}: 未记录 PID"
    return
  fi

  if is_running "${pid}"; then
    kill "${pid}" || true
    sleep 1
    if is_running "${pid}"; then
      kill -9 "${pid}" || true
    fi
    echo "${name}: 已停止 (PID: ${pid})"
  else
    echo "${name}: 进程不存在 (PID: ${pid})"
  fi

  rm -f "${pid_file}"
}

status_one() {
  local name="$1"
  local pid_file="$2"
  local pid
  pid="$(read_pid "${pid_file}" || true)"
  if [[ -n "${pid}" ]] && is_running "${pid}"; then
    if [[ "${name}" == "后端" ]]; then
      local cmdline mode
      cmdline="$(ps -o command= -p "${pid}" 2>/dev/null || true)"
      if [[ "${cmdline}" == *"target/release/zeroclaw"* ]]; then
        mode="release"
      elif [[ "${cmdline}" == *"target/debug/zeroclaw"* ]] || [[ "${cmdline}" == *"cargo run -- daemon"* ]]; then
        mode="debug"
      else
        mode="unknown"
      fi
      echo "${name}: 运行中 (PID: ${pid}, mode: ${mode})"
    else
      echo "${name}: 运行中 (PID: ${pid})"
    fi
  else
    echo "${name}: 未运行"
  fi
}

show_logs() {
  echo "==== backend.log (last 40 lines) ===="
  if [[ -f "${BACKEND_LOG}" ]]; then
    tail -n 40 "${BACKEND_LOG}"
  else
    echo "(暂无)"
  fi
  echo
  echo "==== frontend.log (last 40 lines) ===="
  if [[ -f "${FRONTEND_LOG}" ]]; then
    tail -n 40 "${FRONTEND_LOG}"
  else
    echo "(暂无)"
  fi
}

check_health() {
  local name="$1"
  local url="$2"
  local body
  if body="$(curl -fsS -m 3 "${url}" 2>/dev/null)"; then
    echo "${name}健康: OK (${url})"
    echo "  响应: ${body}"
  else
    echo "${name}健康: FAIL (${url})"
  fi
}

usage() {
  cat <<'EOF'
用法:
  bash learn-zeroclaw/local-services.sh start
  bash learn-zeroclaw/local-services.sh stop
  bash learn-zeroclaw/local-services.sh restart
  bash learn-zeroclaw/local-services.sh status
  bash learn-zeroclaw/local-services.sh logs

可选参数（用于 start/restart）:
  --release   后端使用 release 二进制启动（更省资源）
  --debug     后端使用 cargo run 启动（默认）

示例:
  bash learn-zeroclaw/local-services.sh start --release
  bash learn-zeroclaw/local-services.sh restart --release
EOF
}

cmd="${1:-status}"
if [[ $# -ge 2 ]]; then
  case "${2}" in
    --release)
      BACKEND_MODE="release"
      ;;
    --debug)
      BACKEND_MODE="debug"
      ;;
    *)
      echo "未知参数: ${2}"
      usage
      exit 1
      ;;
  esac
fi

case "${cmd}" in
  start)
    start_backend
    start_frontend
    ;;
  stop)
    stop_one "后端" "${BACKEND_PID_FILE}"
    stop_one "前端" "${FRONTEND_PID_FILE}"
    ;;
  restart)
    stop_one "后端" "${BACKEND_PID_FILE}"
    stop_one "前端" "${FRONTEND_PID_FILE}"
    start_backend
    start_frontend
    ;;
  status)
    status_one "后端" "${BACKEND_PID_FILE}"
    status_one "前端" "${FRONTEND_PID_FILE}"
    check_health "后端" "http://127.0.0.1:3000/health"
    check_health "前端代理" "http://127.0.0.1:5173/api/health"
    ;;
  logs)
    show_logs
    ;;
  *)
    usage
    exit 1
    ;;
esac
