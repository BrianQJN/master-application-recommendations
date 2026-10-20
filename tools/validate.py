"""检查 data/programs.json 和 data/meta.json：字段完整、取值合法、id 唯一。

用法（在网站根目录运行）：python3 tools/validate.py
有问题时逐条列出并以非零状态退出。
"""
import json
import re
import sys
from datetime import date
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

SITE = Path(__file__).resolve().parent.parent
REGIONS = {"加拿大", "美国", "香港", "新加坡"}
US_GROUPS = {"1-20", "21-40", "41-60"}
SELECTIONS = {"入选", "替补"}
TIERS = {"保底", "匹配", "冲刺", "高冲"}
STATUSES = {"未开始", "准备中", "已提交", "面试中", "已录取", "已拒绝", "候补", "放弃"}
CURRENCIES = {"CAD", "USD", "HKD", "SGD"}
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
TEXT_FIELDS = ["degree", "category", "materials", "gre", "english", "employment"]


def is_date(s):
    try:
        date.fromisoformat(s)
        return isinstance(s, str) and len(s) == 10
    except (TypeError, ValueError):
        return False


def is_tz(s):
    try:
        ZoneInfo(s)
        return True
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return False


def nonempty(x):
    return isinstance(x, str) and x.strip() != ""


def check_program(p, err):
    pid = p.get("id")
    if not (isinstance(pid, str) and ID_RE.match(pid)):
        err("id 缺失或格式不对（只能用小写字母、数字和连字符）")
    if p.get("region") not in REGIONS:
        err(f"region 不合法：{p.get('region')!r}")
    g = p.get("us_rank_group")
    if p.get("region") == "美国" and g not in US_GROUPS:
        err(f"美国项目的 us_rank_group 必须是 {sorted(US_GROUPS)} 之一：{g!r}")
    if p.get("region") != "美国" and g is not None:
        err("非美国项目的 us_rank_group 应为 null")
    if p.get("selection") not in SELECTIONS:
        err(f"selection 必须是 入选 或 替补：{p.get('selection')!r}")
    if p.get("tier") not in TIERS:
        err(f"tier 不合法：{p.get('tier')!r}")
    for k in ("school", "program"):
        v = p.get(k) or {}
        if not (nonempty(v.get("en")) and nonempty(v.get("zh"))):
            err(f"{k}.en / {k}.zh 不能为空")
    for k in TEXT_FIELDS:
        if not nonempty(p.get(k)):
            err(f"{k} 不能为空")

    dls = p.get("deadlines")
    if not isinstance(dls, list) or not dls:
        err("deadlines 至少要有一条")
        dls = []
    for i, d in enumerate(dls):
        where = f"deadlines[{i}]"
        if not nonempty(d.get("label")):
            err(f"{where}.label 不能为空")
        if d.get("date") is not None and not is_date(d.get("date")):
            err(f"{where}.date 必须是 YYYY-MM-DD 或 null：{d.get('date')!r}")
        if d.get("time") is not None and not TIME_RE.match(str(d.get("time"))):
            err(f"{where}.time 必须是 HH:MM 或 null：{d.get('time')!r}")
        if not is_tz(d.get("timezone")):
            err(f"{where}.timezone 不是有效时区：{d.get('timezone')!r}")
        if not isinstance(d.get("tentative"), bool):
            err(f"{where}.tentative 必须是 true 或 false")
        if d.get("date") is None and not d.get("tentative"):
            err(f"{where} 没有日期时 tentative 必须为 true")
        if d.get("note") is not None and not isinstance(d.get("note"), str):
            err(f"{where}.note 必须是文字或 null")

    links = p.get("links") or {}
    for k in ("apply", "program"):
        if not str(links.get(k, "")).startswith(("http://", "https://")):
            err(f"links.{k} 必须是以 http 开头的网址")
    r = p.get("recommendations", "缺失")
    if not (r is None or (isinstance(r, int) and not isinstance(r, bool) and r >= 0)):
        err(f"recommendations 必须是非负整数或 null：{r!r}")
    fee = p.get("fee") or {}
    if not (fee.get("amount") is None or isinstance(fee.get("amount"), (int, float))):
        err(f"fee.amount 必须是数字或 null：{fee.get('amount')!r}")
    if fee.get("currency") not in CURRENCIES:
        err(f"fee.currency 必须是 {sorted(CURRENCIES)} 之一：{fee.get('currency')!r}")
    if not (p.get("conflict_note") is None or nonempty(p.get("conflict_note"))):
        err("conflict_note 必须是文字或 null")
    if p.get("status") not in STATUSES:
        err(f"status 不合法：{p.get('status')!r}（可选：{'、'.join(sorted(STATUSES))}）")
    if not is_date(p.get("status_date")):
        err(f"status_date 必须是 YYYY-MM-DD：{p.get('status_date')!r}")
    if not isinstance(p.get("status_note"), str):
        err("status_note 必须是文字（可为空字符串）")


def main():
    errors = []
    try:
        data = json.loads((SITE / "data" / "programs.json").read_text(encoding="utf-8"))
        meta = json.loads((SITE / "data" / "meta.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"✗ 无法读取数据文件：{e}")
        sys.exit(1)

    programs = data.get("programs") if isinstance(data, dict) else None
    if not isinstance(programs, list):
        print("✗ programs.json 的最外层必须是 {\"programs\": [...]}")
        sys.exit(1)

    seen = {}
    for n, p in enumerate(programs):
        label = p.get("id") or f"第 {n + 1} 个项目"
        check_program(p, lambda msg, label=label: errors.append(f"[{label}] {msg}"))
        if p.get("id") in seen:
            errors.append(f"[{p['id']}] id 重复（第 {seen[p['id']] + 1} 个和第 {n + 1} 个项目）")
        seen.setdefault(p.get("id"), n)

    if not is_date(meta.get("last_updated")):
        errors.append(f"[meta.json] last_updated 必须是 YYYY-MM-DD：{meta.get('last_updated')!r}")
    gpa = meta.get("gpa") or {}
    for k in ("cumulative", "last_two_years", "scale"):
        if not isinstance(gpa.get(k), (int, float)):
            errors.append(f"[meta.json] gpa.{k} 必须是数字")

    if errors:
        print(f"✗ 发现 {len(errors)} 个问题：")
        for e in errors:
            print("  - " + e)
        sys.exit(1)
    n_sel = sum(p["selection"] == "入选" for p in programs)
    print(f"✓ 检查通过：共 {len(programs)} 个项目（入选 {n_sel}，替补 {len(programs) - n_sel}），id 无重复。")


if __name__ == "__main__":
    main()
