# Fork 与上游同步策略（ZeroClaw）

这份文档用于说明：你的仓库（fork）如何长期、安全地同步源项目（upstream）更新，同时保留你自己的主线历史和改动。

---

## 1. 你的仓库关系（当前模型）

在你当前本地仓库中：

- `origin`：源项目（upstream），例如 `zeroclaw-labs/zeroclaw`
- `myfork`：你的 fork，例如 `Coldplay-now/zeroclaw`

推荐长期保持这个双远程结构，不要只留一个 remote。

---

## 2. 目标与原则

目标：

- 持续吸收 upstream 新能力/修复
- 不破坏你 fork 既有提交历史
- 冲突可控、可审查、可回滚

原则：

- 不在 `myfork/main` 上直接做高风险同步操作
- 不对 `main` 做 `push --force`
- 每次同步都走独立分支 + PR 合并

---

## 3. 推荐策略（最稳）

使用 **“同步分支（sync branch）+ PR 回 main”**：

1. 从 `myfork/main` 切出 `sync/upstream-YYYYMMDD`
2. 在该分支执行 `git merge origin/main`
3. 解决冲突并完成验证
4. 推送到 `myfork`，发 PR 合并回 `myfork/main`

这比在 `main` 直接 merge 更安全，且所有冲突处理都有评审记录。

---

## 4. 标准操作步骤（可直接复用）

在仓库根目录执行：

```bash
# 1) 拉取两个远程最新状态
git fetch origin
git fetch myfork

# 2) 确保本地 main 对齐你的 fork main
git checkout main
git pull --ff-only myfork main

# 3) 创建同步分支
SYNC_BRANCH="sync/upstream-$(date +%Y%m%d)"
git checkout -b "$SYNC_BRANCH"

# 4) 合并上游 main 到同步分支
git merge origin/main

# 5) 解决冲突后，运行基础验证
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

# 6) 推送同步分支并发 PR 到你的 main
git push -u myfork "$SYNC_BRANCH"
gh pr create \
  --repo Coldplay-now/zeroclaw \
  --base main \
  --head "$SYNC_BRANCH" \
  --title "chore(sync): merge upstream main ($(date +%Y-%m-%d))" \
  --body "Sync changes from upstream origin/main into fork main via merge."
```

---

## 5. 冲突处理建议（按优先级）

- 配置类文件（`config` / `docs`）：优先保留你本地策略，再手工吸收 upstream 新字段
- 安全边界相关（`gateway` / `tools` / `security`）：优先保守，先保证不放宽权限
- 前端展示类（`learn-zeroclaw/web-ui`）：优先保留你定制 UI，再补上 upstream 修复
- 大冲突文件：分块解决，避免一次性“大面积接受 theirs/ours”

冲突完成后建议至少再跑一次：

```bash
cargo test
```

---

## 6. 何时用 cherry-pick（而不是整分支同步）

使用场景：

- 你只想引入 upstream 的某几个修复
- upstream 本次变化太大，完整同步风险高

示例：

```bash
git checkout -b sync/pick-issue-xxxx myfork/main
git cherry-pick <upstream_commit_sha>
git push -u myfork HEAD
```

说明：`cherry-pick` 适合“精准吸收”，但不适合长期替代常规同步。

---

## 7. 回滚策略（必须提前准备）

若同步 PR 合并后出现问题：

1. 定位合并提交（merge commit）
2. 新建修复分支执行 `git revert -m 1 <merge_commit_sha>`
3. 推送并发 PR 回 `myfork/main`

示例：

```bash
git checkout -b rollback/sync-20260220 myfork/main
git revert -m 1 <merge_commit_sha>
git push -u myfork HEAD
```

这样可以最小影响地撤销同步结果，不改写历史。

---

## 8. 建议节奏（实践）

- 同步频率：每周 1 次，或每个里程碑前 1 次
- 一次同步只做“同步”本身，不混入功能开发
- 每次 PR 都写清楚：
  - 同步来源（`origin/main` 的 commit）
  - 冲突文件清单
  - 验证范围与结果

---

## 9. 快速检查命令

查看 fork 与 upstream 的分叉差异：

```bash
git fetch origin && git fetch myfork
git rev-list --left-right --count origin/main...myfork/main
```

输出解释：

- 左值：`origin/main` 领先你的提交数
- 右值：`myfork/main` 领先 upstream 的提交数

---

## 10. 小结

对你当前仓库最稳的方式是：

- 保持 `origin` + `myfork` 双远程
- 用 `sync/upstream-*` 分支承接同步
- 通过 PR 合并回 `myfork/main`

这套方式可审查、可回滚、可持续，适合你现在这种“fork 已有较多自定义历史”的仓库状态。
