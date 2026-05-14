#!/usr/bin/env python3
"""Fetch Google Trends related queries/topics through SerpApi.

This script is a fallback for trend-radar when browser automation cannot read
Google Trends. It reads SERPAPI_KEY from the environment unless --api-key is
provided by the caller.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch SerpApi Google Trends JSON")
    parser.add_argument("--keyword", default="Chinese")
    parser.add_argument("--geo", default="US")
    parser.add_argument("--date", default="now 7-d", help='Example: "now 7-d" or "today 1-m"')
    parser.add_argument(
        "--data-type",
        default="RELATED_QUERIES",
        choices=["RELATED_QUERIES", "RELATED_TOPICS"],
    )
    parser.add_argument("--api-key", default=os.environ.get("SERPAPI_KEY"))
    parser.add_argument("--out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.keyword != "Chinese":
        print("trend-radar v0 only allows keyword=Chinese", file=sys.stderr)
        return 2
    if args.geo != "US":
        print("trend-radar v0 only allows geo=US", file=sys.stderr)
        return 2
    if not args.api_key:
        print("SERPAPI_KEY is required", file=sys.stderr)
        return 2

    params = {
        "engine": "google_trends",
        "q": args.keyword,
        "geo": args.geo,
        "date": args.date,
        "data_type": args.data_type,
        "api_key": args.api_key,
    }
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "etsy-skills-trend-radar/1.0"})

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        print(f"SerpApi request failed: {exc}", file=sys.stderr)
        return 1

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
