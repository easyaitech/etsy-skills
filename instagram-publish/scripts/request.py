#!/usr/bin/env python3
"""发送一条 Instagram 任务请求。运行时注入租户；不持久保存或输出凭据。"""
from datetime import datetime
import json
import os
from pathlib import Path
import subprocess
import sys

def schedule_matches(body, response):
    job = response.get("data") if isinstance(response, dict) else None
    if not isinstance(job, dict) or response.get("ok") is not True:
        return False
    try:
        when = datetime.fromisoformat(body["scheduledAt"].replace("Z", "+00:00"))
        expected_ms = int(when.timestamp() * 1000)
    except (KeyError, AttributeError, ValueError, OverflowError, OSError):
        return False
    return (
        when.tzinfo is not None and bool(job.get("id"))
        and bool(body.get("queueTaskId")) and job.get("queueTaskId") == body["queueTaskId"]
        and job.get("username") == str(body.get("username", "")).strip().lower()
        and job.get("scheduledAt") == expected_ms and job.get("mode") == "publish"
        and job.get("scheduleConfirmed") is True and job.get("queueSync") == "written"
    )


def main():
    if len(sys.argv) == 2 and sys.argv[1] in ("--help", "-h"):
        print("用法: request.py request.json")
        return 0
    if len(sys.argv) != 2:
        raise SystemExit("用法: request.py request.json")
    required = ["YANGGEDIANZHANG_API_BASE", "YANGGEDIANZHANG_HERMES_TOOL_TOKEN", "YANGGEDIANZHANG_TENANT_ID"]
    if any(not os.environ.get(k) for k in required):
        raise SystemExit("缺少后端运行时变量；请检查注入配置。")
    body = json.loads(Path(sys.argv[1]).read_text())
    if not isinstance(body, dict) or "tenantId" in body:
        raise SystemExit("请求必须是 JSON 对象，tenantId 由运行时注入。")
    body["tenantId"] = os.environ[required[2]]
    token = os.environ[required[1]]
    if any(c in token for c in '\r\n"\\'):
        raise SystemExit("运行时令牌格式异常。")
    # 令牌走 curl stdin config，避免出现在进程命令行。JSON 字节用独立临时文件。
    import tempfile
    with tempfile.TemporaryDirectory(prefix="instagram-request-") as directory:
        payload = Path(directory) / "request.json"
        payload.write_text(json.dumps(body, ensure_ascii=False))
        result = subprocess.run(["curl", "--silent", "--show-error", "--fail-with-body", "--max-time", "300",
            "--config", "-", "-X", "POST", os.environ[required[0]].rstrip("/") + "/api/hermes/instagram/jobs",
            "-H", "Content-Type: application/json", "--data-binary", "@" + str(payload)],
            input=f'header = "Authorization: Bearer {token}"\n', text=True, capture_output=True)
    print(result.stdout)
    if result.stderr: print(result.stderr, file=sys.stderr)
    if result.returncode == 0 and body.get("action") == "create" and body.get("mode") == "publish" and "scheduledAt" in body:
        try:
            response = json.loads(result.stdout)
        except ValueError:
            response = None
        if not schedule_matches(body, response):
            print("排期尚未核实；请按原任务 ID 查 status 或按原幂等键查找。保留原回执，勿新建另一条任务。", file=sys.stderr)
            return 3
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
