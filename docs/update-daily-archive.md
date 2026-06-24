# 更新群日报归档

这个站点把原始 HTML 当作唯一正文真源。Next.js 只在构建期读取元数据，用于首页筛选、搜索和详情页外壳。

## 新增一期日报

1. 把 HTML 放到 `🦞奇奇怪怪养龙虾/html/`。
2. 如果有截图，把同名 PNG 放到 `🦞奇奇怪怪养龙虾/png/`。
3. 文件名继续使用现有格式：
   - 单日：`🦞奇奇怪怪养龙虾群2026-06-24.html`
   - 跨天：`🦞奇奇怪怪养龙虾群2026-06-21 → 2026-06-23.html`
4. 运行校验和构建：

```bash
pnpm archive:check
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## 校验规则

`pnpm archive:check` 会扫描所有 HTML，并检查这些字段：

- `.lead-title`
- `.lead-deck`
- `.story`
- 每个故事里的 `.story-no` 和 `.story-theme`

缺少这些核心字段会让校验失败。PNG 不是正文真源，所以缺少 PNG 只输出 warning。

当前归档保留两个已知 warning：

- `2026-05-23` 没有对应 PNG。
- `🦞奇奇怪怪养龙虾群2026-05-27 → 2026-05-28_副本.png` 是额外截图文件。

## 附件链接

详情页会显示可下载的 PNG 链接。`pnpm dev` 和 `pnpm build` 会先运行 `pnpm archive:sync`，把 `🦞奇奇怪怪养龙虾/png/` 同步到 `public/archive/png/`。这个目录是构建产物，已被 `.gitignore` 忽略，不要手动提交。

## URL 规则

详情页 URL 不使用中文文件名：

- 单日：`/reports/2026-06-24`
- 跨天：`/reports/2026-06-21-to-2026-06-23`

如果替换旧文件或新增跨天日报，只要文件名中的日期没有冲突，重新运行校验和构建即可。
