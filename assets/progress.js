/* 进度页：按申请状态分栏展示计划申请的全部项目。 */
"use strict";

const STATUS_HINT = {
  未开始: "还没动手准备", 准备中: "正在写文书、联系推荐人等", 已提交: "已交申请，等待学校审核", 面试中: "学校发来面试或测评邀请",
  候补: "进入候补名单，等待补录", 已录取: "收到录取通知", 已拒绝: "学校未录取", 放弃: "决定不再申请",
};
const COLLAPSE_AT = 8;  // 项目很多的一栏先只显示前几个

boot("progress", ({ programs }) => {
  const regionPage = Object.fromEntries(REGIONS.map((r) => [r.name, r.page]));
  const active = programs.filter(isActive);
  const by = Object.fromEntries(STATUSES.map((s) => [s, active.filter((p) => p.status === s).sort((a, b) => sortKey(a) - sortKey(b))]));
  const done = by["已录取"].length + by["已拒绝"].length;
  const submitted = done + by["已提交"].length + by["面试中"].length + by["候补"].length;
  const total = active.length - by["放弃"].length;

  const item = (p) => `<li><a class="pg-item" href="${regionPage[p.region]}#${esc(p.id)}">
      <span class="pg-name">${esc(p.school.zh)} · ${esc(p.program.zh)}</span>
      <span class="pg-tags">${regionPill(p.region)}${tierPill(p.tier)}${p.status_note ? `<span class="pg-note">${esc(p.status_note)}</span>` : ""}</span>
    </a></li>`;

  document.getElementById("app").innerHTML = `
    <section class="page-head reveal">
      <div class="eyebrow">PROGRESS · 申请进度</div>
      <h1>申请进度</h1>
      <p class="summary">按申请状态分栏展示全部 <b class="num">${active.length}</b> 个计划申请的项目，点击项目可查看详情。</p>
    </section>
    <section class="stat-row four reveal">
      <div class="stat"><div class="label">已提交</div><div class="value"><span data-count="${submitted}">${submitted}</span><small> / ${total}</small></div></div>
      <div class="stat"><div class="label">已出结果</div><div class="value"><span data-count="${done}">${done}</span></div></div>
      <div class="stat"><div class="label">已录取</div><div class="value" style="color:var(--t-baodi)"><span data-count="${by["已录取"].length}">${by["已录取"].length}</span></div></div>
      <div class="stat"><div class="label">准备中</div><div class="value"><span data-count="${by["准备中"].length}">${by["准备中"].length}</span></div></div>
    </section>
    <section class="pg-board reveal">
      ${STATUSES.map((s) => {
        const list = by[s];
        const more = list.length > COLLAPSE_AT;
        return `<div class="pg-col st-${s}">
          <div class="pg-head">${statusPill(s)}<b class="num">${list.length}</b></div>
          <p class="pg-hint">${STATUS_HINT[s]}</p>
          ${list.length ? `<ul class="pg-list">${list.slice(0, COLLAPSE_AT).map(item).join("")}</ul>
            ${more ? `<details class="pg-more fold"><summary><span class="open-text">显示其余 ${list.length - COLLAPSE_AT} 个</span><span class="close-text">收起</span></summary>
              <div class="fold-body"><ul class="pg-list">${list.slice(COLLAPSE_AT).map(item).join("")}</ul></div></details>` : ""}`
          : `<div class="pg-empty">暂无</div>`}
        </div>`;
      }).join("")}
    </section>`;
});
