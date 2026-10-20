/* 地区页（加拿大 / 美国 / 香港 / 新加坡 共用）。地区名取自 <body data-region>。
   美国页按 US News 排名段分成三个标签页。 */
"use strict";

const US_GROUPS = ["1-20", "21-40", "41-60"];
const TIER_SHORT = { 保底: "录取把握最大", 匹配: "条件与要求相当", 冲刺: "有机会，竞争激烈", 高冲: "希望较小，收获最大" };
const dash = (g) => g.replace("-", "–");

boot(document.body.dataset.region, ({ programs }) => {
  const region = document.body.dataset.region;
  const isUS = region === "美国";
  const mine = programs.filter((p) => p.region === region);
  const state = { tier: "全部", status: "全部", group: null };

  // 网址 # 后面可以是排名段（如 #21-40）或项目 id
  const hash = decodeURIComponent(location.hash.slice(1));
  const hashProgram = mine.find((p) => p.id === hash);
  if (isUS) state.group = US_GROUPS.includes(hash) ? hash : hashProgram ? hashProgram.us_rank_group : US_GROUPS[0];

  const inScope = () => mine.filter((p) => !isUS || p.us_rank_group === state.group);
  const mainOf = (list) => list.filter(isActive);
  const benchOf = (list) => list.filter((p) => !isActive(p));
  const totalMain = mainOf(mine).length;
  const totalBench = benchOf(mine).length;

  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="page-head reveal">
      <div class="eyebrow">${REGION_CODE[region]} · ${region}项目</div>
      <h1>${region}</h1>
      <p class="summary">计划申请 <b class="num">${totalMain}</b> 个项目${totalBench ? `，另有 <b class="num">${totalBench}</b> 个替补` : ""}。点击卡片查看详细信息。</p>
      ${isUS ? `<div class="tabs" role="tablist" aria-label="US News 排名段"><span class="tab-ind" aria-hidden="true"></span>${US_GROUPS.map((g) => {
        const n = mainOf(mine.filter((p) => p.us_rank_group === g)).length;
        return `<button type="button" class="tab" role="tab" data-group="${g}"><span class="t1">US News 排名</span><span class="t2">${dash(g)}</span><span class="t3">${n} 个项目</span></button>`;
      }).join("")}</div>
      <p class="tab-note">按学校在 US News 美国大学综合排名中的位置分组。</p>` : ""}
    </section>
    <section class="filters panel reveal" aria-label="筛选">
      <div class="filter-group"><span class="label">按档位筛选</span><div class="chips" id="tier-chips"></div></div>
      <div class="filter-group"><label class="label" for="status-select">按申请状态筛选</label>
        <select id="status-select" class="big">
          ${["全部", ...STATUSES].map((s) => `<option value="${s}">${s === "全部" ? "全部状态" : s}</option>`).join("")}
        </select></div>
      <div class="result-count" id="result-count" aria-live="polite"></div>
    </section>
    <div id="list" role="${isUS ? "tabpanel" : "region"}"></div>
    <details class="bench" id="bench"><summary><span id="bench-title"></span>
      <span class="bench-toggle"><span class="open-text">展开</span><span class="close-text">收起</span><span class="chev" aria-hidden="true"></span></span></summary>
      <div class="bench-body"><p class="muted" style="margin-top:0">这些项目暂不申请；如果某个计划项目放弃或无法申请，可以从这里挑选替换。</p>
      <div id="bench-list"></div></div></details>`;

  const pass = (p) => (state.tier === "全部" || p.tier === state.tier) && (state.status === "全部" || p.status === state.status);

  function tierGroups(list) {
    return TIERS.map((t) => {
      const items = list.filter((p) => p.tier === t).sort((a, b) => sortKey(a) - sortKey(b));
      if (!items.length) return "";
      return `<div class="group-head tier-${t}">${tierPill(t)}<span class="muted"><span class="num">${items.length}</span> 个 · ${TIER_SHORT[t]}</span></div>
        <div class="cards">${items.map((p, i) => renderCard(p, { index: i })).join("")}</div>`;
    }).join("");
  }

  function drawChips() {
    const scope = inScope();
    const main = mainOf(scope);
    document.getElementById("tier-chips").innerHTML = ["全部", ...TIERS].map((t) => {
      // 数字只计计划申请的项目；替补里有该档位时按钮仍可用
      const n = t === "全部" ? main.length : main.filter((p) => p.tier === t).length;
      const any = t === "全部" || scope.some((p) => p.tier === t);
      return `<button type="button" class="chip tier-${t}" data-tier="${t}" aria-pressed="${t === state.tier}"${any ? "" : " disabled"}>${t === "全部" ? "" : sigBars(t)}${t} <span class="chip-n">${n}</span></button>`;
    }).join("");
  }

  function draw() {
    const scope = inScope();
    const main = mainOf(scope).filter(pass);
    const bench = benchOf(scope);
    const benchShown = bench.filter(pass);
    document.getElementById("list").innerHTML = main.length ? tierGroups(main)
      : `<div class="empty" style="margin-top:24px">没有符合条件的项目</div>`;
    document.getElementById("bench").hidden = !bench.length;
    document.getElementById("bench-title").innerHTML = `替补项目（如有需要可替换）<span class="muted num" style="font-weight:400">${bench.length} 个</span>`;
    document.getElementById("bench-list").innerHTML = benchShown.length ? tierGroups(benchShown)
      : `<div class="empty">没有符合条件的替补项目</div>`;
    const filtered = state.tier !== "全部" || state.status !== "全部";
    document.getElementById("result-count").textContent = filtered
      ? `符合条件：计划申请 ${main.length} 个${bench.length ? `，替补 ${benchShown.length} 个` : ""}` : "";
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.group === state.group));
    moveTabIndicator();
  }

  // 标签页底下的白色指示块滑到当前标签
  function moveTabIndicator() {
    const ind = document.querySelector(".tab-ind");
    const cur = document.querySelector('.tab[aria-selected="true"]');
    if (!ind || !cur) return;
    ind.style.width = cur.offsetWidth + "px";
    ind.style.transform = `translateX(${cur.offsetLeft}px)`;
  }
  addEventListener("resize", moveTabIndicator);

  document.getElementById("tier-chips").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tier]");
    if (!btn || btn.disabled) return;
    state.tier = btn.dataset.tier;
    drawChips();
    draw();
  });
  document.getElementById("status-select").addEventListener("change", (e) => {
    state.status = e.target.value;
    draw();
  });
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
    state.group = b.dataset.group;
    // 切换后若当前档位在新排名段里没有项目，回到“全部”
    if (state.tier !== "全部" && !inScope().some((p) => p.tier === state.tier)) state.tier = "全部";
    history.replaceState(null, "", "#" + state.group);
    drawChips();
    draw();
  }));

  drawChips();
  draw();

  // 从首页 / 时间线带 #项目id 跳转过来时，自动展开并滚动到该项目
  const target = hashProgram && document.getElementById(hashProgram.id);
  if (target) {
    const benchBox = target.closest("details.bench");
    if (benchBox) benchBox.open = true;
    target.open = true;
    target.scrollIntoView({ block: "start" });
  }
});
