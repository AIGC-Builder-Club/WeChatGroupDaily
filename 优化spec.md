# WeChatGroupDaily 自动化优化 Spec

## 背景

当前已创建 Codex 本地 cron 自动化 `automation-2`：每天 14:03 在 `/Users/alskai/Desktop/Projects/WeChatGroupDaily` 运行群日报生成、归档、README 更新、检查、提交和推送流程。

短期执行边界：自动化只应改动 `README.md` 和 `🦞奇奇怪怪养龙虾/` 下的归档文件。工程代码、测试、CI 和配置暂不直接修改。

## 现状缺口

1. `pnpm test` 不能作为门禁。
   - `tests/archive.test.ts` 中 `totalReportCount` 和 `latestReportSlug` 是硬编码。
   - 新增日报后测试会因为数量和最新 slug 过期而失败。

2. 缺少统一检查命令。
   - 当前需要分别运行 `pnpm archive:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`。
   - 自动化提示词里已串行执行，但仓库里还没有 `pnpm check`。

3. 缺少真正 CI。
   - 现在依赖本地自动化跑检查。
   - GitHub push 后没有仓库级门禁保护。

4. 归档迁移仍靠 agent 提示词执行。
   - 从 `/group-daily` 输出物迁移到 `🦞奇奇怪怪养龙虾/html` 和 `png` 的流程还没有脚本化。
   - README 期数更新也还没有脚本化。

5. 失败提醒依赖自动化运行时能力。
   - 当前优先用 `gh issue create`。
   - 若 `gh` 未登录，只能在运行结果里输出失败报告。

## 建议改动

### 1. 修复测试硬编码

- 把 `tests/archive.test.ts` 的固定 `totalReportCount` 改为从 `loadAllReports()` 或 `buildArchiveDiagnostics()` 推导。
- 把 `latestReportSlug` 改为 `loadAllReports()[0]?.slug` 的实际断言，或只断言返回列表按 `endDate/startDate` 新到旧排序。
- 修复后把 `pnpm test` 纳入每日自动化门禁。

### 2. 增加 `pnpm check`

在 `package.json` 增加：

```json
{
  "scripts": {
    "check": "pnpm archive:check && pnpm test && pnpm lint && pnpm typecheck && pnpm build"
  }
}
```

测试硬编码修好前，可以先临时使用：

```json
{
  "scripts": {
    "check": "pnpm archive:check && pnpm lint && pnpm typecheck && pnpm build"
  }
}
```

### 3. 增加归档脚本

新增 `scripts/archive-generated-daily.mjs`，职责只做三件事：

- 接收 `/group-daily` 输出的 HTML/PNG 路径。
- 生成标准文件名并移动到归档目录，发现目标已存在则失败。
- 更新 README 顶部期数。

脚本不要生成日报，不要调用微信，不要提交 git。这样边界清楚。

### 4. 增加 CI

新增 `.github/workflows/check.yml`：

- `push` 和 `pull_request` 触发。
- 安装 pnpm。
- 跑 `pnpm install --frozen-lockfile`。
- 跑 `pnpm check`。

如果测试暂未修复，CI 先跑无测试版 `check`，并在 issue 中标注这是临时门禁。

### 5. 失败提醒脚本化

新增 `scripts/report-daily-failure.mjs` 或 shell 脚本：

- 输入失败阶段、命令、日志文件。
- 若 `gh auth status` 成功，则创建 GitHub Issue。
- 否则输出一份可复制的 Markdown 失败报告。

## 验收标准

- 新增一份日报时，不需要手动改测试常量。
- `pnpm check` 一条命令能完整验证归档、测试、lint、类型和构建。
- GitHub 上每次 push 都有检查记录。
- `/group-daily` 生成物可以用一个归档脚本稳定迁移并更新 README。
- 自动化失败时，要么自动开 GitHub Issue，要么输出完整可复制的失败报告。

