#!/usr/bin/env python3
import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


def read_jsonl(path):
    tasks = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            tasks.append(json.loads(line))
    return tasks


def post_webhook(url, token, prompt, timeout_secs):
    payload = json.dumps({"message": prompt}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url=url, data=payload, headers=headers, method="POST")
    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout_secs) as resp:
            raw = resp.read().decode("utf-8")
            latency_ms = int((time.time() - started) * 1000)
            body = json.loads(raw)
            return {
                "ok": True,
                "status_code": resp.getcode(),
                "latency_ms": latency_ms,
                "body": body,
                "error": None,
            }
    except urllib.error.HTTPError as e:
        latency_ms = int((time.time() - started) * 1000)
        err_body = e.read().decode("utf-8", errors="ignore")
        return {
            "ok": False,
            "status_code": e.code,
            "latency_ms": latency_ms,
            "body": err_body,
            "error": "http_error",
        }
    except Exception as e:
        latency_ms = int((time.time() - started) * 1000)
        return {
            "ok": False,
            "status_code": None,
            "latency_ms": latency_ms,
            "body": None,
            "error": str(e),
        }


def safe_get_int(obj, key):
    val = obj.get(key) if isinstance(obj, dict) else None
    return val if isinstance(val, int) else None


def main():
    parser = argparse.ArgumentParser(description="Run ZeroClaw baseline eval tasks.")
    parser.add_argument("--tasks", required=True, help="Path to tasks JSONL")
    parser.add_argument("--out", required=True, help="Path to output JSONL")
    parser.add_argument("--repeats", type=int, default=3, help="Repeat count per task")
    args = parser.parse_args()

    url = os.getenv("ZEROCLAW_WEBHOOK_URL", "http://127.0.0.1:3000/webhook")
    token = os.getenv("ZEROCLAW_BEARER_TOKEN", "")
    timeout_secs = int(os.getenv("ZEROCLAW_TIMEOUT_SECS", "120"))
    provider = os.getenv("EVAL_PROVIDER", "")
    model = os.getenv("EVAL_MODEL", "")
    temperature = os.getenv("EVAL_TEMPERATURE", "")

    tasks = read_jsonl(args.tasks)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    with open(args.out, "w", encoding="utf-8") as out:
        for task in tasks:
            for run_idx in range(1, args.repeats + 1):
                result = post_webhook(url, token, task["prompt"], timeout_secs)
                body = result["body"] if isinstance(result["body"], dict) else {}
                trace = body.get("trace") if isinstance(body, dict) else {}
                record = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "task_id": task.get("id"),
                    "category": task.get("category"),
                    "expectation": task.get("expectation"),
                    "run_index": run_idx,
                    "request": {"url": url, "timeout_secs": timeout_secs},
                    "meta": {
                        "provider": provider,
                        "model": model,
                        "temperature": temperature,
                    },
                    "result": {
                        "ok": result["ok"],
                        "status_code": result["status_code"],
                        "latency_ms": result["latency_ms"],
                        "error": result["error"],
                        "response": body.get("response") if isinstance(body, dict) else None,
                        "iterations": safe_get_int(trace, "iterations"),
                        "tool_calls": len(body.get("tool_calls", [])) if isinstance(body, dict) else None,
                        "token_input": None,
                        "token_output": None,
                        "cost_estimate_usd": None,
                    },
                }
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
                out.flush()
                print(
                    f"[{task.get('id')}] run {run_idx}/{args.repeats} "
                    f"ok={record['result']['ok']} latency={record['result']['latency_ms']}ms"
                )


if __name__ == "__main__":
    main()
