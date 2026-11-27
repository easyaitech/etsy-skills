"""Submit a private eRank seed query; subsequent requests reuse the same job or snapshot."""
import argparse
import json
import os
from pathlib import Path
import time
import urllib.request
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("term")
parser.add_argument("--market", required=True, help="eRank country code, e.g. USA")
parser.add_argument("--wait", type=int, default=100)
args = parser.parse_args()
base = os.environ.get("ERANK_PERSONAL_URL", "https://yanggedianzhang.com/trend-radar").rstrip("/")
url = urlsplit(base)
if url.scheme != "https" and not (url.scheme == "http" and url.hostname in ("127.0.0.1", "localhost")):
    parser.error("HTTPS or local HTTP required")
token = os.environ.get("ERANK_PERSONAL_TOKEN")
if not token:
    token_file = Path.home() / ".config/erank-personal/token"
    if token_file.is_file():
        token = token_file.read_text().strip()
if not token:
    parser.error("ERANK_PERSONAL_TOKEN 未配置")
deadline = time.monotonic() + args.wait
request = urllib.request.Request(base + "/personal-keywords/lookup",
    data=json.dumps({"term": args.term, "market": args.market}).encode(),
    headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
while True:
    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.load(response)
    if result["state"] in ("done", "failed") or time.monotonic() >= deadline:
        print(json.dumps(result, ensure_ascii=False))
        break
    time.sleep(2)
