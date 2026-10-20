/* 全站共用：读取数据、页头页脚、截止日期计算、项目卡片。 */
"use strict";

// 标记脚本已运行：动效相关的初始隐藏只在有脚本时生效，脚本出错时内容照常显示
document.documentElement.classList.add("js");

const TIERS = ["保底", "匹配", "冲刺", "高冲"];
const STATUSES = ["未开始", "准备中", "已提交", "面试中", "已录取", "已拒绝", "候补", "放弃"];
const STATUS_ICON = { 未开始: "○", 准备中: "◐", 已提交: "●", 面试中: "◎", 已录取: "✓", 已拒绝: "✕", 候补: "◇", 放弃: "–" };
// 已提交及之后的状态：不再需要盯截止日期
const DONE_STATUSES = ["已提交", "面试中", "已录取", "已拒绝", "候补", "放弃"];
const REGIONS = [
  { name: "加拿大", page: "canada.html", code: "CA" },
  { name: "美国", page: "usa.html", code: "US" },
  { name: "香港", page: "hongkong.html", code: "HK" },
  { name: "新加坡", page: "singapore.html", code: "SG" },
];
const REGION_CODE = Object.fromEntries(REGIONS.map((r) => [r.name, r.code]));
// 信号格数：录取把握越大格数越多
const TIER_BARS = { 保底: 4, 匹配: 3, 冲刺: 2, 高冲: 1 };
const NAV = [
  { key: "home", label: "首页", href: "index.html" },
  ...REGIONS.map((r) => ({ key: r.name, label: r.name, href: r.page })),
  { key: "timeline", label: "时间线", href: "timeline.html" },
  { key: "progress", label: "进度", href: "progress.html" },
  { key: "glossary", label: "名词解释", href: "glossary.html" },
];
const CURRENCY = { CAD: "加元", USD: "美元", HKD: "港币", SGD: "新加坡元" };
const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];
const BEIJING = "Asia/Shanghai";
const SAME_AS_BEIJING = ["Asia/Hong_Kong", "Asia/Singapore"];  // 与北京时间相同，无需换算
const DAY = 86400000;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- 数据 ---------- */
async function loadData() {
  const get = (url) => fetch(url, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(url + " " + r.status);
    return r.json();
  });
  const [programs, meta] = await Promise.all([get("data/programs.json"), get("data/meta.json")]);
  return { programs: programs.programs, meta };
}

/* 计入申请名单：所有入选项目 + 状态已有变化的替补（说明已被换入） */
function isActive(p) {
  return p.selection === "入选" || p.status !== "未开始";
}

/* ---------- 页头页脚 ---------- */
function renderChrome(active, meta) {
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `<div class="inner">
      <a class="brand" href="index.html"><span class="brand-mark">F27</span><span>Fall 2027 硕士申请规划</span></a>
      <nav class="nav" aria-label="主导航">${NAV.map((n) =>
        `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ""}>${n.label}</a>`).join("")}</nav>
    </div>`;
  document.body.prepend(header);
  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  header.after(backdrop);
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `<div class="inner">最后更新：<span class="num">${esc(meta ? fmtDateOnly(meta.last_updated) : "—")}</span>
    · <a href="index.html">回到首页</a> · <a href="glossary.html">名词解释</a></div>`;
  document.body.append(footer);
}

function showLoadError(err) {
  console.error(err);
  renderChrome(null, null);
  document.querySelector("main").innerHTML = `<div class="notice"><b>数据加载失败。</b><br>
    如果是直接双击打开的 HTML 文件，浏览器不允许读取数据文件，请按 UPDATE.md 中“本地预览”一节启动本地服务器后再打开。
    如果是在线网址，请稍后刷新重试。</div>`;
}

/* 每个页面的入口：加载数据 → 画页头页脚 → 调用页面自己的渲染函数 */
function boot(active, render) {
  loadData().then((data) => {
    renderChrome(active, data.meta);
    render(data);
    initMotion();
  }).catch(showLoadError);
}

/* ---------- 动效与交互 ---------- */
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.2,.7,.2,1)";

/* 数字从 0 滚动到目标值；元素文字本身就是最终值，无动效时直接显示 */
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const dec = +(el.dataset.dec || 0);
  if (REDUCED || !target) return;
  const t0 = performance.now(), dur = 1100;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = (target * (1 - Math.pow(1 - k, 3))).toFixed(dec);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* 区块进入视野时淡入，并触发其中的数字滚动和条形图生长 */
function observeReveal(root = document) {
  const els = root.querySelectorAll(".reveal:not(.in)");
  const show = (el) => { el.classList.add("in"); el.querySelectorAll("[data-count]").forEach(countUp); };
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach(show); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));
}

/* 展开 / 收起带高度动画（原生 details 没有过渡效果） */
function toggleDetails(d, open) {
  const body = d.querySelector(":scope > .card-body, :scope > .bench-body, :scope > .fold-body");
  if (REDUCED || !body || !body.animate) { d.open = open; return; }
  if (d._anim) d._anim.cancel();
  if (open) {
    d.open = true;
    const h = body.scrollHeight;
    d._anim = body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 380, easing: EASE });
  } else {
    const h = body.scrollHeight;
    d._anim = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 260, easing: "cubic-bezier(.4,0,.6,1)" });
    d._anim.onfinish = () => { d.open = false; };
  }
}

let motionReady = false;
function initMotion() {
  observeReveal();
  if (motionReady) return;
  motionReady = true;

  document.addEventListener("click", (e) => {
    const summary = e.target.closest("details.card > summary, details.bench > summary, details.fold > summary");
    if (summary) {
      e.preventDefault();
      const d = summary.parentElement;
      toggleDetails(d, !d.open);
      return;
    }
    const collapse = e.target.closest(".collapse-btn");
    if (collapse) {
      const d = collapse.closest("details");
      toggleDetails(d, false);
      d.scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" });
    }
  });

  const header = document.querySelector(".site-header");
  const toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.innerHTML = "↑ 回到顶部";
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
  document.body.append(toTop);
  const onScroll = () => {
    header.classList.toggle("scrolled", scrollY > 8);
    toTop.classList.toggle("show", scrollY > 900);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- 时间与截止日期 ---------- */
function tzOffset(ts, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(ts);
  const v = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return Date.UTC(+v.year, v.month - 1, +v.day, +v.hour, +v.minute, +v.second) - ts;
}

/* 某时区的当地时刻 → 时间戳 */
function zonedToTs(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess - tzOffset(guess, tz);
  const off2 = tzOffset(ts, tz);
  if (guess - off2 !== ts) ts = guess - off2;
  return ts;
}

function partsIn(ts, tz) {
  const v = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", weekday: "short",
  }).formatToParts(ts).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v.weekday);
  return { y: +v.year, m: +v.month, d: +v.day, time: `${v.hour}:${v.minute}`, wd };
}

function fmtDateOnly(s) {
  const [y, m, d] = s.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function fmtIn(ts, tz, withTime = true) {
  const p = partsIn(ts, tz);
  return `${p.y}年${p.m}月${p.d}日（周${WEEKDAY[p.wd]}）${withTime ? p.time : ""}`;
}

/* 北京时间的第几天（北京无夏令时），用于按日历天计算“还剩几天” */
const bjDay = (ts) => Math.floor((ts + 8 * 3600000) / DAY);

/* 给每个截止日期补上计算结果：ts、是否过期、剩余天数 */
function enrich(d, now = Date.now()) {
  if (!d.date) return { ...d, ts: null, expired: false, daysLeft: null };
  const ts = zonedToTs(d.date, d.time || "23:59", d.timezone);
  return { ...d, ts, expired: ts < now, daysLeft: bjDay(ts) - bjDay(now) };
}

function deadlinesOf(p) {
  return p.deadlines.map((d) => enrich(d));
}

/* 最近一个未过期的截止日期；没有则返回 null */
function nextDeadline(p) {
  const live = deadlinesOf(p).filter((d) => d.ts && !d.expired).sort((a, b) => a.ts - b.ts);
  return live[0] || null;
}

function sortKey(p) {
  const n = nextDeadline(p);
  return n ? n.ts : Infinity;
}

function daysTag(d) {
  if (!d.ts) return `<span class="tag tbd">日期待官方确认</span>`;
  if (d.tentative) return d.expired ? `<span class="tag gone">往年日期已过</span>` : `<span class="tag tbd">日期待官方确认</span>`;
  if (d.expired) return `<span class="tag gone">已截止</span>`;
  if (d.daysLeft === 0) return `<span class="tag soon">今天截止</span>`;
  if (d.daysLeft <= 14) return `<span class="tag soon">还剩 <span class="num">${d.daysLeft}</span> 天</span>`;
  return `<span class="tag left">还剩 <span class="num">${d.daysLeft}</span> 天</span>`;
}

function deadlineTimes(d) {
  if (!d.ts) return `<div>${esc(d.note || "官方尚未公布日期")}</div>`;
  const same = SAME_AS_BEIJING.includes(d.timezone);
  const local = d.time
    ? fmtIn(d.ts, d.timezone)
    : `${fmtIn(d.ts, d.timezone, false)}当天结束前`;
  const ref = d.tentative ? `<div class="small muted">以下为往年日期，仅供参考：</div>` : "";
  const bj = same ? "与当地时间相同" : `${d.time ? "" : "约"}${fmtIn(d.ts, BEIJING)}${d.time ? "" : "前"}`;
  return `${ref}<div class="t-row"><span class="k">当地时间</span><span>${local}</span></div>
    <div class="t-row"><span class="k">北京时间</span><span>${bj}</span></div>`;
}

function nextLine(p) {
  const n = nextDeadline(p);
  if (n) {
    const when = fmtIn(n.ts, BEIJING, false);
    const tag = n.tentative ? `<span class="tag tbd">日期待官方确认</span>` : daysTag(n);
    return `<div class="card-next"><span class="k">最近截止 · 北京时间</span><span class="when">${when}</span>
      <span class="tagcell">${tag}</span><span class="lbl">${esc(n.label)}</span></div>`;
  }
  const pending = p.deadlines.some((d) => !d.date);
  return pending
    ? `<div class="card-next"><span class="k">最近截止</span><span class="tag tbd">日期待官方确认</span></div>`
    : `<div class="card-next gone"><span class="k">最近截止</span>各轮均已截止</div>`;
}

/* ---------- 标签 ---------- */
const sigBars = (t) => `<span class="sig n${TIER_BARS[t]}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
const tierPill = (t) => `<span class="pill tier tier-${t}">${sigBars(t)}${t}</span>`;
const regionPill = (r) => `<span class="pill region region-${r}"><span class="code">${REGION_CODE[r]}</span>${r}</span>`;
const statusPill = (s) => `<span class="pill status st-${s}">${STATUS_ICON[s] || ""} ${s}</span>`;

function feeText(f) {
  if (f.amount === null || f.amount === undefined) return "未注明";
  if (f.amount === 0) return "免费";
  return `<span class="num">${f.amount}</span> ${CURRENCY[f.currency] || f.currency}`;
}

function recText(n) {
  if (n === null || n === undefined) return "未注明数量";
  return n === 0 ? "不需要" : `${n} 封`;
}

function regionLabel(p) {
  return p.us_rank_group ? `美国（US News 排名 ${p.us_rank_group.replace("-", "–")}）` : p.region;
}

/* ---------- 项目卡片 ---------- */
function renderCard(p, { showRegion = false, index = 0 } = {}) {
  const dls = deadlinesOf(p);
  const dlHtml = dls.map((d) => `<div class="dl-item${d.expired ? " expired" : ""}">
      <div class="dl-label">${esc(d.label)} ${daysTag(d)}</div>
      <div class="dl-times">${deadlineTimes(d)}</div></div>`).join("");
  const conflict = p.conflict_note
    ? `<div class="conflict"><b>申请限制：</b>${esc(p.conflict_note)}</div>` : "";
  const note = p.status_note ? `<div>备注：${esc(p.status_note)}</div>` : "";
  return `<details class="card enter tier-${p.tier}" id="${esc(p.id)}" style="--i:${Math.min(index, 12)}">
    <summary>
      <div class="card-tags">${tierPill(p.tier)}${showRegion ? regionPill(p.region) : ""}${statusPill(p.status)}</div>
      <div class="card-school">${esc(p.school.zh)}<span class="en">${esc(p.school.en)}</span></div>
      <div class="card-program">${esc(p.program.zh)}<span class="en">${esc(p.program.en)}</span></div>
      ${nextLine(p)}
      <div class="card-toggle"><span class="open-text">查看详情</span><span class="close-text">收起详情</span><span class="chev" aria-hidden="true"></span></div>
    </summary>
    <div class="card-body">
      <h4>基本信息</h4>
      <dl class="facts two">
        <div><dt>学位</dt><dd>${esc(p.degree)}</dd></div>
        <div><dt>类别</dt><dd>${esc(p.category)}</dd></div>
        <div><dt>所在地区</dt><dd>${esc(regionLabel(p))}</dd></div>
        <div><dt>档位</dt><dd>${tierPill(p.tier)}</dd></div>
      </dl>
      <h4>截止日期</h4>
      <div class="dl-list">${dlHtml}</div>
      ${dls.some((d) => d.ts && !d.time && !SAME_AS_BEIJING.includes(d.timezone)) ? `<p class="small muted" style="margin:8px 0 0">带“约”字的时间：学校未注明具体时刻，按当地当天 23:59 推算，建议提前提交。</p>` : ""}
      <h4>链接</h4>
      <div class="links">
        <a class="btn" href="${esc(p.links.apply)}" target="_blank" rel="noopener">申请入口</a>
        <a class="btn ghost" href="${esc(p.links.program)}" target="_blank" rel="noopener">项目官网</a>
      </div>
      <h4>申请要求</h4>
      <dl class="facts">
        <div><dt>所需材料</dt><dd>${esc(p.materials)}</dd></div>
        <div><dt>GRE</dt><dd>${esc(p.gre)}</dd></div>
        <div><dt>语言成绩</dt><dd>${esc(p.english)}</dd></div>
        <div><dt>推荐信</dt><dd>${recText(p.recommendations)}</dd></div>
        <div><dt>申请费</dt><dd>${feeText(p.fee)}</dd></div>
      </dl>
      <h4>就业与口碑</h4>
      <p style="margin:0">${esc(p.employment)}</p>
      ${conflict}
      <div class="status-box">
        <div>申请状态：${statusPill(p.status)} <span class="small muted">（${esc(fmtDateOnly(p.status_date))} 更新）</span></div>
        ${note}
        <div class="pid">项目编号（更新状态时使用）：<code>${esc(p.id)}</code></div>
      </div>
      <button type="button" class="collapse-btn">收起详情<span class="chev" aria-hidden="true"></span></button>
    </div>
  </details>`;
}

function countBy(list, key) {
  const c = {};
  list.forEach((x) => { c[x[key]] = (c[x[key]] || 0) + 1; });
  return c;
}
