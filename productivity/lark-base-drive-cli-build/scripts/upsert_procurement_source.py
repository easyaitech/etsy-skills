#!/usr/bin/env python3
"""
Upsert one FuBlessings procurement source into the Feishu/Lark Base table.

Usage:
  python scripts/upsert_procurement_source.py \
    --name '磁贴 40×2mm' \
    --url 'https://qr.1688.com/s/PCQWhRIr' \
    --kouling '￥oDuI8ZZ00nSaf￥' \
    --cz 'CZ2172' \
    --status '主用' \
    --params '40×2mm' \
    --reason '可以采购；吸力很强。'

Requires `lark-cli` authenticated in the current profile.
"""
import argparse
import json
import shlex
import subprocess
import sys

BASE = "S96DbjoDgaNw6sscM9KcgeyGnDd"
TABLE = "tblsRXyNBRtkUc2C"


def run(cmd: str) -> str:
    proc = subprocess.run(cmd, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        print(proc.stdout, file=sys.stderr)
        raise SystemExit(proc.returncode)
    return proc.stdout


def parse_json_mixed(stdout: str):
    start = stdout.find("{")
    if start < 0:
        raise ValueError("No JSON object found in lark-cli output")
    obj, _ = json.JSONDecoder().raw_decode(stdout[start:])
    return obj


def lark(args: str) -> str:
    return run(f"LARK_CLI_NO_PROXY=1 lark-cli {args}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True, help="物料名称")
    ap.add_argument("--url", required=True, help="1688 short URL")
    ap.add_argument("--kouling", default="", help="1688 口令，保留 ￥...￥")
    ap.add_argument("--cz", default="", help="CZ 编号")
    ap.add_argument("--status", required=True, choices=["主用", "备用", "测试中", "淘汰"])
    ap.add_argument("--params", default="", help="合适参数")
    ap.add_argument("--reason", default="", help="选择理由")
    ap.add_argument("--eliminate-reason", default="", help="淘汰原因；仅淘汰项填写")
    ap.add_argument("--shop", default="", help="店铺名称，可空")
    ns = ap.parse_args()

    link_parts = [ns.url]
    meta = []
    if ns.kouling:
        meta.append(f"口令：{ns.kouling}")
    if ns.cz:
        meta.append(ns.cz)
    product_link = ns.url + (" （" + "；".join(meta) + "）" if meta else "")

    fields_obj = parse_json_mixed(lark(f"base +field-list --base-token {BASE} --table-id {TABLE}"))
    existing = {f["name"] for f in fields_obj["data"]["fields"]}
    payload = {
        "物料名称": ns.name,
        "店铺名称": ns.shop,
        "商品链接": product_link,
        "合适参数": ns.params,
        "状态": ns.status,
        "选择理由": ns.reason,
        "淘汰原因": ns.eliminate_reason,
    }
    payload = {k: v for k, v in payload.items() if k in existing}

    token = ns.url.rstrip("/").split("/")[-1]
    search = {"keyword": token, "search_fields": ["商品链接"]}
    search_out = parse_json_mixed(lark(
        "base +record-search "
        f"--base-token {BASE} --table-id {TABLE} "
        f"--json {shlex.quote(json.dumps(search, ensure_ascii=False))}"
    ))
    ids = search_out.get("data", {}).get("record_id_list") or []
    rid = ids[0] if ids else None

    cmd = (
        "base +record-upsert "
        f"--base-token {BASE} --table-id {TABLE} "
        + (f"--record-id {rid} " if rid else "")
        + f"--json {shlex.quote(json.dumps(payload, ensure_ascii=False))}"
    )
    upsert_out = parse_json_mixed(lark(cmd))
    data = upsert_out.get("data", {})
    if not rid:
        rid = (
            data.get("record_id")
            or data.get("record", {}).get("record_id")
            or data.get("record", {}).get("id")
        )
        if not rid:
            ids = data.get("record", {}).get("record_id_list") or []
            rid = ids[0] if ids else None
    if not rid:
        raise SystemExit("Upsert succeeded but record id could not be parsed")

    verified = parse_json_mixed(lark(f"base +record-get --base-token {BASE} --table-id {TABLE} --record-id {rid}"))
    print(json.dumps({"record_id": rid, "record": verified.get("data", {}).get("record")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
