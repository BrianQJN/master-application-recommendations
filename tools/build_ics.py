"""根据 data/programs.json 生成日历文件 deadlines.ics（可导入苹果日历、Google 日历、Outlook）。

用法（在网站根目录运行）：python3 tools/build_ics.py
收录：计划申请的项目（入选项目 + 状态已有变化的替补），不含“放弃”的项目；只收录尚未过去、有具体日期的截止日。
学校未注明具体时刻的，按当地当天 23:59 计。每个事件在截止前 7 天和 1 天提醒。
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

SITE = Path(__file__).resolve().parent.parent
BEIJING = ZoneInfo("Asia/Shanghai")
WEEKDAY = "一二三四五六日"


def is_active(p):
    return (p["selection"] == "入选" or p["status"] != "未开始") and p["status"] != "放弃"


def esc(s):
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    """iCalendar 要求每行不超过 75 字节，超出部分换行并以空格开头。"""
    out, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > 75:
            out.append(cur.decode("utf-8"))
            cur = b" "
        cur += b
    out.append(cur.decode("utf-8"))
    return "\r\n".join(out)


def fmt(dt):
    return f"{dt.year}年{dt.month}月{dt.day}日（周{WEEKDAY[dt.weekday()]}）{dt:%H:%M}"


def utc(dt):
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def main():
    programs = json.loads((SITE / "data" / "programs.json").read_text(encoding="utf-8"))["programs"]
    now = datetime.now(timezone.utc)
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fall 2027 申请规划//ZH", "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH", "X-WR-CALNAME:Fall 2027 申请截止日期", "X-WR-TIMEZONE:Asia/Shanghai",
    ]
    count = 0
    for p in programs:
        if not is_active(p):
            continue
        for i, d in enumerate(p["deadlines"]):
            if not d["date"]:
                continue
            local = datetime.fromisoformat(f"{d['date']}T{d['time'] or '23:59'}").replace(tzinfo=ZoneInfo(d["timezone"]))
            if local < now:
                continue
            title = f"截止：{p['school']['zh']} · {p['program']['zh']}（{d['label']}）"
            if d["tentative"]:
                title = "【日期待官方确认】" + title
            desc = [
                f"{p['school']['en']} - {p['program']['en']}",
                f"当地时间：{fmt(local)}" + ("" if d["time"] else "（学校未注明具体时刻，按当天 23:59 计）"),
                f"北京时间：{fmt(local.astimezone(BEIJING))}",
                f"档位：{p['tier']}　地区：{p['region']}",
                f"申请入口：{p['links']['apply']}",
            ]
            if d["tentative"]:
                desc.insert(1, "此日期参考往年或尚未核实，请以学校官网为准。")
            lines += [
                "BEGIN:VEVENT",
                f"UID:{p['id']}-{i}-{d['date']}@fall2027-plan",
                f"DTSTAMP:{utc(now)}",
                f"DTSTART:{utc(local - timedelta(minutes=30))}",
                f"DTEND:{utc(local)}",
                f"SUMMARY:{esc(title)}",
                f"DESCRIPTION:{esc(chr(10).join(desc))}",
                f"URL:{p['links']['apply']}",
                "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc(title)}", "TRIGGER:-P7D", "END:VALARM",
                "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc(title)}", "TRIGGER:-P1D", "END:VALARM",
                "END:VEVENT",
            ]
            count += 1
    lines.append("END:VCALENDAR")
    (SITE / "deadlines.ics").write_text("\r\n".join(fold(l) for l in lines) + "\r\n", encoding="utf-8", newline="")
    print(f"✓ 已生成 deadlines.ics：{count} 个截止日期。")


if __name__ == "__main__":
    main()
