"""Index dated eRank Keyword Tool CSV exports and return exact keyword evidence."""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import sqlite3
from pathlib import Path


def normalize(value):
    return " ".join(value.casefold().split())


def index_export(db, path, market, today):
    observed = dt.date.fromisoformat(path.parent.name)
    if observed > today:
        raise ValueError(f"未来日期: {path}")
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    key = (market, observed.isoformat(), digest)
    if db.execute("SELECT 1 FROM imports WHERE market=? AND day=? AND digest=?", key).fetchone():
        return
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
    fields = {normalize(h).rstrip("."): h for h in reader.fieldnames or []}
    word = fields.get("keyword") or fields.get("keywords")
    metric = fields.get("avg. searches") or fields.get("average searches") or fields.get("avg searches")
    if not word or not metric:
        raise ValueError(f"缺少 Keyword 或 Avg. Searches 列: {path.name}")
    for row in reader:
        term = row[word].strip()
        if term:
            db.execute("INSERT OR IGNORE INTO metrics VALUES(?,?,?,?,?,?)",
                       (market, normalize(term), observed.isoformat(), term, row[metric], digest))
    db.execute("INSERT INTO imports VALUES(?,?,?)", key)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--market", required=True)
    parser.add_argument("keywords", nargs="+")
    args = parser.parse_args()
    market = args.market.upper()
    if not re.fullmatch("[A-Z]{2}", market):
        parser.error("市场须为两位国家代码")
    args.root.mkdir(exist_ok=True, parents=True)
    today = dt.date.today()
    with sqlite3.connect(args.root / "erank.sqlite3", timeout=30) as db:
        db.execute("CREATE TABLE IF NOT EXISTS imports(market,day,digest,PRIMARY KEY(market,day,digest))")
        db.execute("""CREATE TABLE IF NOT EXISTS metrics(market,term,day,original,avg_searches,digest,
                    PRIMARY KEY(market,term,day,digest))""")
        db.execute("BEGIN IMMEDIATE")
        for path in sorted((args.root / market).glob("*/*.csv")):
            index_export(db, path, market, today)
        results = []
        for keyword in args.keywords:
            rows = db.execute("""SELECT day,original,avg_searches,digest FROM metrics WHERE market=? AND term=?
                               ORDER BY day DESC,digest""", (market, normalize(keyword))).fetchall()
            status = "missing"
            evidence = []
            if rows:
                day = rows[0][0]
                evidence = [dict(day=d, keyword=k, avg_searches=v, sha256=s)
                            for d, k, v, s in rows if d == day]
                status = "fresh" if (today - dt.date.fromisoformat(day)).days < 30 else "stale"
            results.append(dict(keyword=keyword, market=market, status=status, evidence=evidence))
    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
