/* 时间线页：按月份列出计划申请项目的全部截止日期（北京时间）。 */
"use strict";

const OPEN_MONTHS = 2;  // 默认展开最近几个还有未截止日期的月份

boot("timeline", ({ programs }) => {
  const regionPage = Object.fromEntries(REGIONS.map((r) => [r.name, r.page]));
  // 与日历文件一致：不含已放弃的项目
  const active = programs.filter((p) => isActive(p) && p.status !== "放弃");
  const all = active.flatMap((p) => deadlinesOf(p).map((d) => ({ p, d })));
  const dated = all.filter((x) => x.d.ts).sort((a, b) => a.d.ts - b.d.ts);
  const undated = all.filter((x) => !x.d.ts);
  const state = { region: "全部" };

  const monthKey = (ts) => { const p = partsIn(ts, BEIJING); return `${p.y}-${String(p.m).padStart(2, "0")}`; };
  const monthLabel = (k) => { const [y, m] = k.split("-"); return `${y}年${+m}月`; };

  document.getElementById("app").innerHTML = `
    <section class="page-head reveal">
      <div class="eyebrow">TIMELINE · 截止日期</div>
      <h1>时间线</h1>
      <p class="summary">计划申请项目的全部截止日期，按月份排列；日期均为<b>北京时间</b>。已截止的置灰显示，点击任一条可查看项目详情。</p>
    </section>
    <section class="panel ics-box reveal">
      <div>
        <h3>把截止日期加到手机日历</h3>
        <p class="muted small" style="margin:6px 0 0">下载后用手机或电脑的日历打开即可导入，每个截止日前 7 天和前 1 天会自动提醒。在微信里打不开时，点右上角“…”选择“在浏览器打开”。</p>
      </div>
      <a class="btn download" href="deadlines.ics" download>下载日历文件</a>
    </section>
    <section class="filters panel reveal" aria-label="筛选">
      <div class="filter-group"><span class="label">按地区筛选</span><div class="chips" id="region-chips"></div></div>
      <div class="filter-group"><span class="label">跳到月份</span><div id="month-chips"></div></div>
    </section>
    <div id="tl"></div>`;

  const inRegion = (x) => state.region === "全部" || x.p.region === state.region;

  function row({ p, d }) {
    const when = d.ts ? partsIn(d.ts, BEIJING) : null;
    const tag = !d.ts || d.tentative ? '<span class="tag tbd">日期待官方确认</span>' : daysTag(d);
    return `<li class="tl-item region-${p.region}${d.expired ? " expired" : ""}">
      <div class="tl-date">${when ? `<b class="num">${when.d}</b><span>周${WEEKDAY[when.wd]}</span>` : "<b>—</b><span>待定</span>"}</div>
      <a class="tl-body" href="${regionPage[p.region]}#${esc(p.id)}">
        <div class="tl-title">${esc(p.school.zh)} · ${esc(p.program.zh)}</div>
        <div class="tl-meta">${when ? `<span class="num">${when.time}</span> · ` : ""}${esc(d.label)}${!d.ts && d.note ? " · " + esc(d.note) : ""}</div>
        <div class="tl-marks"><span class="tl-region">${REGION_CODE[p.region]}</span>
          <span class="tl-tier tier-${p.tier}">${sigBars(p.tier)}${p.tier}</span>
          ${p.status !== "未开始" ? statusPill(p.status) : ""}${tag}</div>
      </a>
    </li>`;
  }

  function month(key, title, items, open) {
    const live = items.filter((x) => !x.d.expired).length;
    const sub = live === 0 ? "全部已截止" : `${items.length} 个截止${live < items.length ? ` · ${items.length - live} 个已过` : ""}`;
    return `<details class="tl-month fold${live === 0 ? " past" : ""}" id="m-${key}"${open ? " open" : ""}>
      <summary class="tl-month-head"><span class="tl-m">${title}</span><span class="tl-sub">${sub}<span class="chev" aria-hidden="true"></span></span></summary>
      <div class="fold-body"><ol class="tl-list">${items.map(row).join("")}</ol></div>
    </details>`;
  }

  function draw() {
    const list = dated.filter(inRegion);
    const pend = undated.filter(inRegion);
    const keys = [...new Set(list.map((x) => monthKey(x.d.ts)))];
    const items = (k) => list.filter((x) => monthKey(x.d.ts) === k);
    const openKeys = keys.filter((k) => items(k).some((x) => !x.d.expired)).slice(0, OPEN_MONTHS);

    document.getElementById("region-chips").innerHTML = ["全部", ...REGIONS.map((r) => r.name)].map((r) => {
      const n = all.filter((x) => r === "全部" || x.p.region === r).length;
      return `<button type="button" class="chip${r === "全部" ? "" : ` region-${r}`}" data-region="${r}" aria-pressed="${r === state.region}">${r === "全部" ? "" : '<span class="rdot"></span>'}${r} <span class="chip-n">${n}</span></button>`;
    }).join("");

    const years = [...new Set(keys.map((k) => k.slice(0, 4)))];
    document.getElementById("month-chips").innerHTML = years.map((y) => `<div class="year-row"><span class="year">${y}年</span><div class="chips">
        ${keys.filter((k) => k.startsWith(y)).map((k) => `<a class="chip" href="#m-${k}">${+k.slice(5)}月 <span class="chip-n">${items(k).length}</span></a>`).join("")}
      </div></div>`).join("")
      + (pend.length ? `<div class="year-row"><span class="year">其他</span><div class="chips"><a class="chip" href="#m-pending">待确认 <span class="chip-n">${pend.length}</span></a></div></div>` : "");

    document.getElementById("tl").innerHTML = keys.map((k) => month(k, monthLabel(k), items(k), openKeys.includes(k))).join("")
      + (pend.length ? month("pending", "日期待官方确认", pend.map((x) => ({ ...x, d: { ...x.d, expired: false } })), false) : "")
      || `<div class="empty">没有符合条件的截止日期</div>`;
  }

  document.getElementById("region-chips").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-region]");
    if (!b) return;
    state.region = b.dataset.region;
    draw();
  });
  // 点月份标签：展开该月并滚动过去
  document.getElementById("month-chips").addEventListener("click", (e) => {
    const a = e.target.closest("a.chip");
    if (!a) return;
    e.preventDefault();
    const m = document.querySelector(a.getAttribute("href"));
    m.open = true;
    m.scrollIntoView({ block: "start", behavior: REDUCED ? "auto" : "smooth" });
  });
  draw();
});
