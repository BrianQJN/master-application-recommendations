"""隐私检查：从简历 PDF 提取姓名、电话、邮箱，扫描整个网站目录，发现任何一项即报错并列出位置。

用法（在网站根目录运行）：
    python3 tools/check_privacy.py                     # 默认读取 ../materials/resume.pdf
    python3 tools/check_privacy.py --resume 路径/resume.pdf

依赖 pdftotext（macOS：brew install poppler）。读不到简历或提取不到信息时同样报错——
宁可检查失败，也不能在没检查的情况下显示“通过”。
本脚本不保存任何个人信息，每次运行时临时从简历中提取。
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DEFAULT_RESUME = SITE.parent / "materials" / "resume.pdf"
SKIP_DIRS = {".git"}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d\s().-]{8,}\d")


def fail(msg):
    print(f"✗ {msg}")
    sys.exit(2)


def resume_text(path):
    if not path.exists():
        fail(f"找不到简历文件：{path}（可用 --resume 指定路径）")
    try:
        out = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True)
    except FileNotFoundError:
        fail("没有找到 pdftotext 命令，请先安装：brew install poppler")
    except subprocess.CalledProcessError as e:
        fail(f"读取简历失败：{e.stderr.strip()}")
    return out.stdout


def extract(text):
    """返回 [(类别, 正则)]。姓名取简历第一行，括号里的是英文名。"""
    first = next((l.strip() for l in text.splitlines() if l.strip()), "")
    alias = re.findall(r"\(([^)]*)\)", first)
    words = re.sub(r"\([^)]*\)", " ", first).split()
    if len(words) < 2:
        fail("无法从简历第一行识别姓名")
    given, family = words[0], words[-1]
    names = {f"{given} {family}", f"{family} {given}", f"{family}, {given}", given}
    for a in alias:
        a = a.strip()
        if a:
            names |= {f"{a} {family}", f"{family} {a}", f"{given}({a})"}
    patterns = [("姓名", re.compile(r"\b" + r"\s*".join(map(re.escape, n.split())) + r"\b", re.I)) for n in names]

    emails = set(EMAIL_RE.findall(text))
    if not emails:
        fail("简历中没有提取到邮箱")
    for e in emails:
        local = e.split("@")[0]
        patterns.append(("邮箱", re.compile(re.escape(e), re.I)))
        patterns.append(("邮箱用户名", re.compile(r"\b" + re.escape(local) + r"\b", re.I)))

    phones = [re.sub(r"\D", "", m) for m in PHONE_RE.findall(text)]
    phones = [p[-10:] for p in phones if len(p) >= 10]
    if not phones:
        fail("简历中没有提取到电话")
    for p in set(phones):
        # 允许数字之间夹空格、横线、括号、点，以及前面的国家码
        patterns.append(("电话", re.compile(r"[\s().-]*".join(p))))
    return patterns


def scan(patterns):
    hits = []
    for f in sorted(SITE.rglob("*")):
        if any(part in SKIP_DIRS for part in f.relative_to(SITE).parts):
            continue
        rel = f.relative_to(SITE)
        for kind, rx in patterns:
            if rx.search(str(rel)):
                hits.append((str(rel), 0, kind, "（出现在文件名中）"))
        if not f.is_file():
            continue
        text = f.read_bytes().decode("utf-8", errors="ignore")
        for no, line in enumerate(text.splitlines(), 1):
            for kind, rx in patterns:
                m = rx.search(line)
                if m:
                    start = max(0, m.start() - 20)
                    hits.append((str(rel), no, kind, line[start:m.end() + 20].strip()))
    return hits


def main():
    ap = argparse.ArgumentParser(description="扫描网站目录，确认没有出现简历中的姓名、电话、邮箱")
    ap.add_argument("--resume", type=Path, default=DEFAULT_RESUME, help="简历 PDF 路径")
    args = ap.parse_args()

    patterns = extract(resume_text(args.resume))
    kinds = sorted({k for k, _ in patterns})
    hits = scan(patterns)
    if hits:
        print(f"✗ 发现 {len(hits)} 处个人信息，请删除后再发布：")
        for path, line, kind, ctx in hits:
            print(f"  - {path}:{line}  [{kind}]  {ctx}")
        sys.exit(1)
    n_files = sum(1 for f in SITE.rglob("*") if f.is_file() and not any(p in SKIP_DIRS for p in f.relative_to(SITE).parts))
    print(f"✓ 隐私检查通过：已扫描 {n_files} 个文件，未发现简历中的{'、'.join(kinds)}。")


if __name__ == "__main__":
    main()
