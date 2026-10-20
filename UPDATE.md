# 日常更新流程

网站的所有内容都来自两个数据文件：

- `data/programs.json`：全部项目的信息和申请状态
- `data/meta.json`：网站概况（GPA、最后更新日期）

页面本身不用改。日常更新只改这两个文件，然后检查、提交、推送。

以下命令都在网站目录（`website/` 文件夹）下运行。打开终端后，先输入 `cd `（cd 加一个空格），把 `website` 文件夹拖进终端窗口，回车。

---

## 1. 更新申请状态

### 方法一：用 set_status.py（推荐）

```bash
python3 tools/set_status.py <项目编号> <状态> "备注"
```

例子：

```bash
python3 tools/set_status.py western-mda 已提交 "11 月 10 日提交，两封推荐信已发出"
python3 tools/set_status.py western-mda 面试中 "12 月 3 日视频面试"
python3 tools/set_status.py western-mda 已录取 "收到 offer，3 月 1 日前回复" --date 2027-02-03
```

- **状态只能是以下 8 个之一**：`未开始`、`准备中`、`已提交`、`面试中`、`已录取`、`已拒绝`、`候补`、`放弃`。
- **项目编号**：在网站上点开项目卡片，最下方写着“项目编号（更新状态时使用）”；也可以在 `data/programs.json` 里搜索学校名，找到对应的 `"id"`。编号输错时，脚本会列出相近的编号供参考。
- **备注**：可以不写。不写时原来的备注会被清空，避免旧备注和新状态对不上。
- **日期**：默认是今天；要指定其他日期，加 `--date YYYY-MM-DD`。
- **最后更新日期**：脚本会自动把 `data/meta.json` 里的“最后更新”改成今天。
- **替补项目**：把某个替补项目的状态改成“未开始”以外的任何状态，它就会自动计入申请名单，显示在地区页的正式列表、首页统计、时间线和日历里。改回“未开始”就回到替补区。

### 方法二：直接编辑 data/programs.json

用任意文本编辑器（如 VS Code）打开 `data/programs.json`，搜索项目编号，修改这三个字段：

```json
"status": "已提交",
"status_date": "2026-11-10",
"status_note": "11 月 10 日提交，两封推荐信已发出"
```

然后打开 `data/meta.json`，把 `"last_updated"` 改成今天的日期（格式 `YYYY-MM-DD`），网站页脚的“最后更新”就是读的这里。

注意保留英文双引号和逗号，不要用中文引号。改完一定要运行第 3 节的检查。

---

## 2. 增删项目、修改截止日期

### 每个项目的字段说明

```json
{
  "id": "western-mda",
  "region": "加拿大",
  "us_rank_group": null,
  "selection": "入选",
  "tier": "冲刺",
  "school": { "en": "Western University", "zh": "西安大略大学" },
  "program": { "en": "Master of Data Analytics (MDA)", "zh": "数据分析硕士" },
  "degree": "MDA",
  "category": "数据科学",
  "deadlines": [
    { "label": "第一轮", "date": "2026-11-15", "time": null, "timezone": "America/Toronto", "tentative": false, "note": null }
  ],
  "links": { "apply": "https://…", "program": "https://…" },
  "materials": "简历、成绩单、2 封推荐信（学术或工作）……",
  "gre": "未要求",
  "english": "视高中就读地而定……",
  "recommendations": 2,
  "fee": { "amount": 185, "currency": "CAD" },
  "employment": "项目称 2024–2025 年八成以上学生结业前拿到工作录用……",
  "conflict_note": null,
  "status": "未开始",
  "status_date": "2026-10-20",
  "status_note": ""
}
```

| 字段 | 含义 | 取值 |
|---|---|---|
| `id` | 项目编号，用来定位项目，**确定后不要再改** | 小写字母、数字、连字符，全表唯一，如 `uoft-mscac` |
| `region` | 地区，决定显示在哪个地区页 | `加拿大` / `美国` / `香港` / `新加坡` |
| `us_rank_group` | 美国项目的 US News 排名段 | 美国：`"1-20"` / `"21-40"` / `"41-60"`；其他地区：`null` |
| `selection` | 计划申请还是替补 | `入选` / `替补` |
| `tier` | 档位 | `保底` / `匹配` / `冲刺` / `高冲` |
| `school`、`program` | 学校名、项目名，英文 + 中文 | 文字 |
| `degree`、`category` | 学位缩写、类别 | 文字，如 `MSc`、`统计` |
| `deadlines` | 截止日期列表，至少一条 | 见下表 |
| `links.apply`、`links.program` | 申请入口、项目官网 | 以 `http` 开头的网址 |
| `materials`、`gre`、`english`、`employment` | 所需材料、GRE、语言成绩、就业与口碑 | 简短中文 |
| `recommendations` | 推荐信封数 | 整数，`0` 表示不需要；`null` 表示未注明 |
| `fee` | 申请费 | `amount` 为数字（`0` 为免费，`null` 为未注明）；`currency` 为 `CAD` / `USD` / `HKD` / `SGD` |
| `conflict_note` | 申请限制的一句话说明 | 文字，没有就写 `null` |
| `status`、`status_date`、`status_note` | 申请状态、状态日期、备注 | 见第 1 节 |

**截止日期 `deadlines` 每一条：**

| 字段 | 含义 | 取值 |
|---|---|---|
| `label` | 轮次名 | 如 `第一轮`、`国际生最终截止` |
| `date` | 学校当地日期 | `"YYYY-MM-DD"`；还没公布就写 `null` |
| `time` | 学校当地时刻 | `"23:59"` 这样的 24 小时制；学校没写就填 `null`，网站会按当地 23:59 推算 |
| `timezone` | 学校所在时区 | 多伦多/渥太华/蒙特利尔 `America/Toronto`，温哥华 `America/Vancouver`，埃德蒙顿/卡尔加里 `America/Edmonton`，哈利法克斯 `America/Halifax`，美东 `America/New_York`，美中 `America/Chicago`，美西 `America/Los_Angeles`，香港 `Asia/Hong_Kong`，新加坡 `Asia/Singapore` |
| `tentative` | 是否为往年参考或未核实的日期 | `true` 时网站显示“日期待官方确认”；`date` 为 `null` 时必须是 `true` |
| `note` | 没有日期时的说明 | 如 `"官方尚未公布日期"`；有日期时写 `null` |

北京时间由网页自动换算，不用手动填。

### 常见操作

- **修改截止日期**：找到项目的 `deadlines`，改 `date` 和 `time`。学校公布了今年的正式日期后，同时把 `tentative` 改成 `false`。
- **增加一轮截止**：复制一条 `{ … }` 粘贴在后面，两条之间用英文逗号隔开，再改内容。
- **增加一个项目**：复制一个完整的项目 `{ … }`，粘贴到 `"programs": [ … ]` 列表里任意两个项目之间，注意前后的逗号；然后起一个新的、不重复的 `id`，逐项修改内容，`status` 填 `未开始`。
- **删除一个项目**：删掉该项目从 `{` 到对应 `}` 的整段，以及它前面或后面多出来的一个逗号。
- **替补换入 / 换出**：最简单的是用第 1 节的方法改状态。如果想永久调整名单，就把 `selection` 在 `入选` 和 `替补` 之间互换。

---

## 3. 改完后依次运行三个检查

```bash
python3 tools/validate.py        # 检查字段是否齐全、取值是否合法、id 是否重复
python3 tools/build_ics.py       # 重新生成日历文件 deadlines.ics
python3 tools/check_privacy.py   # 确认没有出现申请人的姓名、电话、邮箱
```

- 三条都显示 ✓ 才能发布。有 ✗ 时，按提示找到对应项目和字段修改，然后从头再跑一遍。
- `check_privacy.py` 默认读取 `../materials/resume.pdf`；简历在别处时加 `--resume 路径/resume.pdf`。它需要 `pdftotext`，没装的话运行 `brew install poppler`。
- 只改了状态时，`build_ics.py` 也要跑。日历只收录计划申请的项目，替补项目改状态后会被加进日历。

---

## 4. 本地预览

**直接双击 HTML 文件是看不到内容的。** 浏览器出于安全限制，不允许本地网页读取 `data/` 里的数据文件，页面会提示“数据加载失败”。需要先启动一个本地服务器：

```bash
python3 -m http.server 8000
```

然后在浏览器打开 http://localhost:8000 。看完回到终端按 `Ctrl + C` 关闭服务器。

如果改完看不到变化，按 `Cmd + Shift + R`（Mac）或 `Ctrl + F5`（Windows）强制刷新。

---

## 5. 提交并推送到 GitHub

```bash
git add .
git commit -m "更新：西安大略 MDA 已提交"
git push
```

推送后 GitHub 会自动重新发布，一般 **1–3 分钟**（偶尔到 10 分钟）网站就会更新。可以在仓库的 **Actions** 页面看进度，出现绿色对勾即完成；之后在浏览器里强制刷新。

一次可以改多个项目，最后统一检查、提交、推送一次即可。
