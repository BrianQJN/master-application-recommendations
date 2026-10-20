/* 首页 */
"use strict";

const TIER_TEXT = {
  保底: "录取把握最大的项目。成绩和背景明显高于学校要求，是整份名单的“安全网”，保证至少有学可上。",
  匹配: "自身条件和项目要求大致相当，录取机会比较大，但不能打包票。是这份名单的主力。",
  冲刺: "要求比自身条件高一些，有机会被录取，但竞争激烈，结果不确定。",
  高冲: "名校或竞争特别激烈的项目，录取希望较小；一旦录取，收获也最大。",
};

const sectionTitle = (idx, title) => `<h2 class="section-title"><span class="idx">${idx}</span>${title}</h2>`;

boot("home", ({ programs, meta }) => {
  const active = programs.filter(isActive);
  const bench = programs.filter((p) => !isActive(p));
  const g = meta.gpa;
  const delta = g.last_two_years - g.cumulative;

  const regionCount = countBy(active, "region");
  const tierCount = countBy(active, "tier");
  const maxTier = Math.max(...TIERS.map((t) => tierCount[t] || 0));
  const statusCount = countBy(active, "status");

  // 进度条：已出结果 / 已提交等待中 / 准备中 / 未开始（放弃不计入）
  const seg = [
    { label: "已出结果", n: (statusCount["已录取"] || 0) + (statusCount["已拒绝"] || 0), color: "#15925a" },
    { label: "已提交、等待结果", n: (statusCount["已提交"] || 0) + (statusCount["面试中"] || 0) + (statusCount["候补"] || 0), color: "#2457c5" },
    { label: "准备中", n: statusCount["准备中"] || 0, color: "#d9a43b" },
  ];
  const quit = statusCount["放弃"] || 0;
  const total = active.length - quit;
  const submitted = seg[0].n + seg[1].n;
  const pct = total ? Math.round((submitted / total) * 100) : 0;

  // 即将截止：每个未提交的项目只取最近的一轮
  const upcoming = active
    .filter((p) => !DONE_STATUSES.includes(p.status))
    .map((p) => ({ p, d: nextDeadline(p) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d.ts - b.d.ts)
    .slice(0, 5);

  const regionPage = Object.fromEntries(REGIONS.map((r) => [r.name, r.page]));

  document.getElementById("app").innerHTML = `
  <section class="hero reveal">
    <div class="eyebrow"><span class="live" aria-hidden="true"></span>数据更新于 ${esc(fmtDateOnly(meta.last_updated))}</div>
    <h1>Fall 2027 硕士申请规划</h1>
    <p class="bg-line"><b>${esc(meta.background.school)}</b> · ${esc(meta.background.major)} · ${esc(meta.background.graduation)}毕业</p>
    <div class="stat-row">
      <div class="stat"><div class="label">累计 GPA</div>
        <div class="value"><span data-count="${g.cumulative}" data-dec="2">${g.cumulative.toFixed(2)}</span><small> / ${g.scale.toFixed(1)}</small></div>
        <div class="hint">大学全部课程的平均成绩</div></div>
      <div class="stat hi"><div class="label">最后两年 GPA</div>
        <div class="value"><span data-count="${g.last_two_years}" data-dec="2">${g.last_two_years.toFixed(2)}</span><small> / ${g.scale.toFixed(1)}</small></div>
        <div class="delta">▲ <span class="num">${delta.toFixed(2)}</span> 高于累计</div>
        <div class="hint">最近约 10 个学分（两学年）的平均成绩</div></div>
    </div>
  </section>

  <section class="section reveal">
    ${sectionTitle("01", "申请概览")}
    <div class="overview">
      <div class="panel">
        <div class="total-line"><span class="big" data-count="${active.length}">${active.length}</span><span>个项目计划申请</span></div>
        <p class="muted small" style="margin:8px 0 0">另有 <span class="num">${bench.length}</span> 个替补项目，需要时可替换。</p>
        <div class="region-tiles">
          ${REGIONS.map((r) => `<a class="region-tile region-${r.name}" href="${r.page}">
            <div class="top"><span>${r.name}</span><span class="code">${r.code}</span></div>
            <div class="n" data-count="${regionCount[r.name] || 0}">${regionCount[r.name] || 0}</div><div class="go">查看 →</div></a>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">按档位分布 · 信号格越多，录取把握越大</div>
        <div class="bars">
          ${TIERS.map((t) => {
            const n = tierCount[t] || 0;
            return `<div class="bar-row tier-${t}"><span>${tierPill(t)}</span>
              <div class="bar-track" role="img" aria-label="${t} ${n} 个"><div class="bar-fill" style="--w:${maxTier ? (n / maxTier) * 100 : 0}%"></div></div>
              <span class="count" data-count="${n}">${n}</span></div>`;
          }).join("")}
        </div>
        <p class="muted small" style="margin:16px 0 0">各档位的含义见本页下方“档位说明”。</p>
      </div>
    </div>
  </section>

  <section class="section reveal">
    ${sectionTitle("02", "申请进度")}
    <div class="panel">
      <div class="total-line"><span class="big">${submitted && pct === 0 ? "&lt;1" : pct}<span style="font-size:.5em">%</span></span><span>已提交 <b class="num">${submitted}</b> / <span class="num">${total}</span> 个</span></div>
      <div class="progress-track" role="img" aria-label="已提交 ${submitted} 个，共 ${total} 个">
        ${seg.map((s) => s.n ? `<span style="--w:${(s.n / total) * 100}%;background:${s.color}" title="${s.label} ${s.n}"></span>` : "").join("")}
      </div>
      <div class="legend">${seg.map((s) => `<span><i style="background:${s.color}"></i>${s.label} <span class="num">${s.n}</span></span>`).join("")}</div>
      <div class="status-grid">
        ${STATUSES.map((s) => `<div class="status-cell">${statusPill(s)}<b>${statusCount[s] || 0}</b></div>`).join("")}
      </div>
      <p style="margin:16px 0 0"><a href="progress.html">按状态查看全部项目 →</a></p>
    </div>
  </section>

  <section class="section reveal">
    ${sectionTitle("03", "即将截止")}
    <p class="section-sub">尚未提交的项目中，最近的 5 个截止日期（北京时间）。</p>
    ${upcoming.length ? `<ol class="upcoming">${upcoming.map(({ p, d }) => `
      <li class="${d.daysLeft <= 14 ? "soon" : ""}">
        <div class="days">${d.daysLeft === 0 ? "<b>今天</b><span>截止</span>" : `<b>${d.daysLeft}</b><span>天后</span>`}</div>
        <div class="what">
          <div class="t">${esc(p.school.zh)} · ${esc(p.program.zh)}</div>
          <div class="d"><span class="num">${fmtIn(d.ts, BEIJING)}</span> · ${esc(d.label)}${d.tentative ? "（日期待官方确认）" : ""}</div>
          <div class="tags">${regionPill(p.region)}${tierPill(p.tier)}<a href="${regionPage[p.region]}#${esc(p.id)}">详情</a></div>
        </div>
      </li>`).join("")}</ol>` : `<div class="empty">近期没有待提交的截止日期。</div>`}
    <p style="margin:14px 0 0"><a href="timeline.html">查看完整时间线 →</a></p>
  </section>

  <section class="section reveal">
    ${sectionTitle("04", "档位说明")}
    <div class="tier-explain">
      ${TIERS.map((t) => `<div class="tier-card tier-${t}"><h3>${sigBars(t)}${t}</h3><p>${TIER_TEXT[t]}</p></div>`).join("")}
    </div>
    <div class="panel" style="margin-top:12px">
      <h3 style="font-size:18px">为什么要这样组合？</h3>
      <p style="margin:8px 0 0">只申请有把握的学校，可能错过更好的机会；只申请名校，又可能全部落空。所以名单把几种档位搭配在一起：用保底和匹配项目确保一定有学可上，再用冲刺和高冲项目争取更好的学校。</p>
      <p style="margin:8px 0 0" class="muted">这份名单以“匹配”为主、“保底”很少，是因为累计 GPA 低于很多项目的最低要求，真正十拿九稳的项目不多；而最后两年成绩提升明显，不少项目会重点看最后两年的成绩，因此大量申请条件相当的项目，整体录取机会最大。</p>
    </div>
  </section>`;
});
