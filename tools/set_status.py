"""修改某个项目的申请状态，并更新网站的“最后更新”日期。

用法（在网站根目录运行）：
    python3 tools/set_status.py <项目id> <状态> ["备注"] [--date YYYY-MM-DD]

例：
    python3 tools/set_status.py western-mda 已提交 "11 月 10 日提交，推荐信已发出"
    python3 tools/set_status.py western-mda 已录取 "收到 offer" --date 2027-02-03

状态可选：未开始、准备中、已提交、面试中、已录取、已拒绝、候补、放弃。
不写备注时，原备注会被清空（避免旧备注和新状态对不上）。日期默认为今天。
"""
import argparse
import difflib
import json
import sys
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PROGRAMS = SITE / "data" / "programs.json"
META = SITE / "data" / "meta.json"
STATUSES = ["未开始", "准备中", "已提交", "面试中", "已录取", "已拒绝", "候补", "放弃"]


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="修改项目申请状态")
    ap.add_argument("id", help="项目 id，可在网站项目详情的网址 # 后面或 data/programs.json 中找到")
    ap.add_argument("status", help="新状态：" + "、".join(STATUSES))
    ap.add_argument("note", nargs="?", default="", help="备注（可省略）")
    ap.add_argument("--date", default=date.today().isoformat(), help="状态日期，默认今天，格式 YYYY-MM-DD")
    args = ap.parse_args()

    if args.status not in STATUSES:
        sys.exit(f"✗ 状态“{args.status}”不在可选范围内：{'、'.join(STATUSES)}")
    try:
        date.fromisoformat(args.date)
    except ValueError:
        sys.exit(f"✗ 日期格式不对：{args.date}（应为 YYYY-MM-DD）")

    data = json.loads(PROGRAMS.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["programs"]}
    p = by_id.get(args.id)
    if p is None:
        close = difflib.get_close_matches(args.id, by_id, n=5, cutoff=0.5)
        hint = f"，是不是：{'、'.join(close)}" if close else ""
        sys.exit(f"✗ 找不到 id 为“{args.id}”的项目{hint}")

    old = p["status"]
    p["status"], p["status_date"], p["status_note"] = args.status, args.date, args.note
    save(PROGRAMS, data)

    meta = json.loads(META.read_text(encoding="utf-8"))
    meta["last_updated"] = date.today().isoformat()
    save(META, meta)

    print(f"✓ {p['school']['zh']} · {p['program']['zh']}（{p['id']}）")
    print(f"  状态：{old} → {args.status}　日期：{args.date}　备注：{args.note or '（无）'}")
    print(f"  网站最后更新日期已改为 {meta['last_updated']}")
    if p["selection"] == "替补" and args.status != "未开始":
        print("  提示：这是一个替补项目，改了状态后会自动计入申请名单。")


if __name__ == "__main__":
    main()
