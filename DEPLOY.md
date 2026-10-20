# 首次部署到 GitHub Pages

本文面向会用 git、但没用过 GitHub Pages 的人。按顺序做完，大约 15 分钟。

## 0. 开始前

**目录结构。** 网站就是 `website/` 这个文件夹，它和 `materials/`（简历、成绩单原件）同在 `new_search/` 下：

```
new_search/
├── materials/          ← 原始材料，不上传
└── website/            ← 只把这个文件夹做成 git 仓库并上传
    ├── index.html  canada.html  usa.html  hongkong.html  singapore.html
    ├── timeline.html  progress.html  glossary.html
    ├── assets/         ← 样式和脚本
    ├── data/           ← programs.json、meta.json（全部项目信息都在这里）
    ├── tools/          ← validate.py、build_ics.py、check_privacy.py、set_status.py
    ├── deadlines.ics   ← 日历文件
    ├── .nojekyll       ← 告诉 GitHub 原样发布，不要删
    └── DEPLOY.md  UPDATE.md  .gitignore
```

git 仓库必须建在 `website/` 里面，不能建在 `new_search/`，否则 `materials/` 里的简历和成绩单会被一起上传。

**需要的东西：**
- 一个 GitHub 账号（https://github.com 免费注册）
- 已安装 git，以及 Python 3.9 或更高版本（终端输入 `python3 --version` 查看）
- 隐私检查需要 `pdftotext`：macOS 上运行 `brew install poppler`

**先打开终端，进入网站目录。** 路径里有中文时，最简单的办法是：先输入 `cd `（cd 加一个空格），再把 Finder 里的 `website` 文件夹拖进终端窗口，然后回车。之后本文所有命令都在这个目录下运行。

## 1. 在 GitHub 网页上新建仓库

1. 登录 https://github.com ，点右上角的 **+** 号，选 **New repository**。
2. **Repository name**：填一个名字，例如 `fall2027-plan`。不要用申请人的姓名。
3. 选择 **Public（公开）**。免费账户只有公开仓库才能使用 GitHub Pages。
   公开意味着任何人都能看到仓库里的文件，所以下面第 2 步会先跑隐私检查。
4. 下面的 **Add a README file**、**Add .gitignore**、**Choose a license** 都**不要勾选**，保持空仓库；否则第一次推送会冲突。
5. 点 **Create repository**。

创建后页面会显示仓库地址，形如 `https://github.com/你的用户名/fall2027-plan.git`，下一步要用。

提醒：网址里会出现你的 GitHub 用户名。如果用户名就是申请人的真实姓名，建议换一个账号。

## 2. 在本地初始化 git、提交、推送

### 2.1 发布前检查（必须全部通过）

```bash
python3 tools/validate.py
python3 tools/build_ics.py
python3 tools/check_privacy.py
```

三条都显示 ✓ 才继续。`check_privacy.py` 默认读取 `../materials/resume.pdf`；如果简历在别处，加 `--resume 路径/resume.pdf`。

### 2.2 设置提交者信息（保护隐私）

提交记录里的作者名和邮箱会随仓库公开，隐私检查扫描不到这里。建议用昵称和 GitHub 提供的匿名邮箱：

1. 在 GitHub 网页右上角头像 → **Settings** → 左侧 **Emails**，勾选 **Keep my email addresses private**，页面上会显示一个形如 `12345678+用户名@users.noreply.github.com` 的地址。
2. 在网站目录运行（只对这个仓库生效）：

```bash
git init
git config user.name "fall2027-plan"
git config user.email "12345678+用户名@users.noreply.github.com"
```

### 2.3 提交并推送

```bash
git add .
git status                    # 确认列表里没有 materials、resume、transcript 之类的文件
git commit -m "首次发布"
git branch -M main
git remote add origin https://github.com/你的用户名/fall2027-plan.git
git push -u origin main
```

**推送时要求登录：** GitHub 不再接受账号密码推送。任选一种方式：
- 安装 GitHub 命令行工具（`brew install gh`）后运行 `gh auth login`，按提示用浏览器登录，然后再执行 `git push -u origin main`；
- 或在 GitHub 网页 头像 → **Settings** → 左侧最下方 **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**，勾选 **repo**，生成后复制；推送时用户名填 GitHub 用户名，密码处粘贴这个 token。

## 3. 在 Settings → Pages 中开启发布

1. 打开仓库网页 `https://github.com/你的用户名/fall2027-plan`。
2. 点仓库顶部菜单最右边的 **Settings**（齿轮图标）。
3. 左侧栏 **Code and automation** 分组下点 **Pages**。
4. **Build and deployment** → **Source** 选 **Deploy from a branch**。
5. **Branch** 下拉框选 **main**，右边的文件夹选 **/ (root)**，点 **Save**。

## 4. 等待发布完成、找到网址

1. 点仓库顶部的 **Actions** 标签，会看到一个名为 **pages build and deployment** 的任务。黄色圆点表示进行中，绿色对勾表示完成，通常 1–3 分钟。
2. 回到 **Settings → Pages**，页面顶部会显示 **Your site is live at https://你的用户名.github.io/fall2027-plan/**，点 **Visit site** 打开。
3. 把这个网址发给家人即可。建议在手机上打开后“添加到主屏幕”或收藏。

网站的每个页面都加了 `noindex` 标记，搜索引擎一般不会收录；但知道网址的人都能访问。

## 5. 常见问题

**打开后页面空白，或只显示“正在加载…”“数据加载失败”**
- **文件名大小写不对。** GitHub Pages 区分大小写，macOS 默认不区分，所以本地能用、上线后就找不到文件。数据文件必须正好是 `data/programs.json` 和 `data/meta.json`（全小写）。用 `git ls-files data assets` 查看仓库里的真实文件名；如果大小写不对，用 `git mv data/Programs.json data/programs.json` 改名后重新提交推送。
- **JSON 写错了。** 手动编辑后漏了逗号、引号，整个页面都读不出数据。运行 `python3 tools/validate.py`，它会指出问题。
- **直接双击打开了本地的 HTML 文件。** 浏览器禁止这种方式读取数据文件，属于正常现象，按 UPDATE.md 的“本地预览”启动本地服务器即可。

**打开网址显示 404**
- 刚开启 Pages，等几分钟再试，并在 Actions 里确认任务已变成绿色对勾。
- 检查 Settings → Pages 里选的是 **main** 分支和 **/ (root)** 文件夹。
- 网址要带仓库名，形如 `https://用户名.github.io/fall2027-plan/`。
- 确认 `index.html` 在仓库根目录，而不是在某个子文件夹里。

**更新后看不到变化**
- **Pages 发布有延迟：** 每次推送后 Actions 会重新部署，一般 1–3 分钟，偶尔要 10 分钟。等绿色对勾出现后再看。
- **浏览器缓存：** 电脑上按 `Cmd + Shift + R`（Mac）或 `Ctrl + F5`（Windows）强制刷新。手机上可在网址后面加 `?v=` 和任意数字（如 `?v=2`）重新打开；微信内置浏览器缓存较顽固，可点右上角“…”→“刷新”，或选“在浏览器打开”。
- 项目数据每次都会向服务器重新确认，通常不受缓存影响；样式和脚本可能被缓存几分钟。

**推送被拒绝（rejected / non-fast-forward）**
- 多半是建仓库时勾选了 README。运行 `git pull --rebase origin main`，再 `git push`。

**父母在中国大陆打不开或很慢**
- 网站本身不使用任何境外字体或库，但 `github.io` 域名在部分地区、部分时段访问不稳定。可以稍后重试，或换移动数据 / Wi-Fi 网络。
