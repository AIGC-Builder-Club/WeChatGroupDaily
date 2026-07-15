# AGENT.md · WeChatGroupDaily 操作指南

> 写给接手这个仓库的 AI 模型看的。人读 README.md 就够了。

## 这个仓库是什么

龙虾群（🦞奇奇怪怪养龙虾群-自迭代无限生）的日报归档。  
每天由 Claude Code 调用 `group-daily` skill 生成 HTML + PNG，推送到这里。

---

## 生成日报的完整流程

### 0. 必用的 Skill

**不要自己拼命令，先调 skill：**

```
/group-daily 🦞奇奇怪怪养龙虾群-自迭代无限生 生成今天的日报
```

skill 路径：`/Users/alskai/.claude/skills/group-daily/`  
skill 里有完整的 9 步工作流，下面只补充 skill 文档里没写清楚的坑。

---

### Step 0：wxrefresh（必跑，已配 NOPASSWD）

```bash
sudo -n wxrefresh
```

跑完核对 stamp 距今 < 30 秒再继续。失败说明微信没开，提醒用户。

---

### Step 1：拉聊天记录（关键：-n 50000）

**龙虾群极其活跃，`-n 1000` 只能拿到几个月前的消息。必须用：**

```bash
vchat history "🦞奇奇怪怪养龙虾群-自迭代无限生" -n 50000 --asc > /tmp/chat_log_<日期>_龙虾群_full.txt
grep "^\[<日期>" /tmp/chat_log_<日期>_龙虾群_full.txt > /tmp/chat_log_<日期>_龙虾群_today.txt
```

用 `grep "^\[2026-07-15"` 这类方式过滤今天的消息。

---

### Step 6：story.json 的已知坑

下面几个字段写错会直接报错，不会有友好提示：

| 字段 | 正确写法 | 错误写法 |
|------|----------|----------|
| quotes 里的说话人 | `"who": "Falcon"` | `"speaker": "Falcon"` |
| 结尾金句 | `"footer_quote": {"text": "...", "attr": "..."}` | `"footer_quote": "..."` (纯字符串) |
| 统计数据位置 | 顶层 `"stats": {...}` | 嵌套在 `"meta"` 里 |
| 群名和日期 | 顶层 `"group_name"` 和 `"date"` | 只放在 `"meta"` 里 |

完整 schema 参考：`/Users/alskai/.claude/skills/group-daily/references/story-schema.md`

---

### Step 7：跑主编排

```bash
python3 /Users/alskai/.claude/skills/group-daily/scripts/make_daily.py \
    --story /tmp/story_<日期>_龙虾群.json \
    --out-dir ~/Desktop/Projects/WeChatGroupDaily
```

---

### Step 8：移文件 + 归档

生成的文件默认在 `out-dir` 根目录，需要移到子目录：

```bash
mv ~/Desktop/Projects/WeChatGroupDaily/群日报_🦞奇奇怪怪养龙虾群-自迭代无限生_<日期>.html \
   ~/Desktop/Projects/WeChatGroupDaily/🦞奇奇怪怪养龙虾/html/
mv ~/Desktop/Projects/WeChatGroupDaily/群日报_🦞奇奇怪怪养龙虾群-自迭代无限生_<日期>.png \
   ~/Desktop/Projects/WeChatGroupDaily/🦞奇奇怪怪养龙虾/png/
```

story.json 归档：

```bash
cp /tmp/story_<日期>_龙虾群.json ~/Documents/GroupDaily/<日期>_龙虾群.json
```

---

### Step 9：Git 推送

```bash
cd ~/Desktop/Projects/WeChatGroupDaily
git add 🦞奇奇怪怪养龙虾/html/群日报_..._<日期>.html \
        🦞奇奇怪怪养龙虾/png/群日报_..._<日期>.png
git commit -m "群日报 🦞奇奇怪怪养龙虾群-自迭代无限生 <日期>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
GIT_SSH_COMMAND="ssh -o ConnectTimeout=30" git push origin main
```

> SSH 偶尔会掉，加 `ConnectTimeout=30` 能解决大多数情况。普通 `git push` 失败时换这条。

---

## 已知 wxid（常出镜人物）

| 显示名 | wxid |
|--------|------|
| ALSKai💥（开佬） | `a805499918` |
| Falcon | `wxid_8tvjn5yes4hi11` |
| 小严同学 | `wxid_km81v7w6fe9422` |
| Yanbo. | `wxid_un41lcocnvd422` |
| 铮铮 | `wxid_69d8fv52wn5322` |
| 悖（我是悖，悖论的悖） | `wxid_dkfclhzwd9yk22` |

不在上表的人，wxid 留空，渲染时会用首字 placeholder。

---

## 关键路径速查

| 资产 | 路径 |
|------|------|
| skill 主目录 | `/Users/alskai/.claude/skills/group-daily/` |
| 群风格指纹 | `~/Documents/GroupDaily/styles/🦞奇奇怪怪养龙虾群-自迭代无限生.md` |
| story.json 归档 | `~/Documents/GroupDaily/<日期>_龙虾群.json` |
| HTML 输出 | `🦞奇奇怪怪养龙虾/html/群日报_🦞奇奇怪怪养龙虾群-自迭代无限生_<日期>.html` |
| PNG 输出 | `🦞奇奇怪怪养龙虾/png/群日报_🦞奇奇怪怪养龙虾群-自迭代无限生_<日期>.png` |
| GitHub 仓库 | `AIGC-Builder-Club/WeChatGroupDaily` |

---

## 写故事的硬约束

详细风格见 skill 里的 `references/writing-style.md`，一句话总结：**写短篇报道，不写会议纪要**。

- 不用破折号「——」
- 金句原文照录，不改造
- timeline 节点 ≤ 8 个，highlights ≤ 8 人，宁缺毋滥
- 每次开写前先读群风格指纹（`context_helper.py check-style`），继承已有的徽章体系和黑话
