# 种种 · 信息收集系统（data-collection）

Priority 1 MVP：六个信息采集模块共用统一 Schema，可提交、可存储、可对接前端。

## 技术栈

- Next.js (App Router) + TypeScript
- Supabase（Auth / Postgres / Storage）

## 你现在要做的（顺序）

1. **填环境变量**（现在就做）
2. **在 Supabase SQL Editor 跑 Schema**（现在就做）
3. **开 Auth 登录方式**（Schema 之后立刻做，RLS 依赖 `auth.uid()`）
4. 再写上传 / CRUD API，给前端 B 对接

> Windows 上 npm 版 Supabase CLI 暂不可用，本仓库用 `supabase/migrations/*.sql`，请在 Dashboard 手动执行。

## 1. 环境变量

```bash
cp .env.example .env.local
```

到 Supabase → **Project Settings → API** 填入：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key（可进浏览器） |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role（仅服务端，勿提交、勿加 NEXT_PUBLIC_） |

`.env.local` 已被 gitignore，不会进仓库。

## 2. 执行 Schema

打开 Supabase → **SQL Editor**，粘贴并运行：

`supabase/migrations/20260718000000_init_info_collection.sql`

会创建：

- `templates`（六个预设模块）
- `profiles`（用户资料，注册自动创建）
- `entries`（统一采集主表）
- `entry_media` / `tags` / `entry_tags`
- RLS（本人可读写）
- Storage bucket `entry-images`

## 3. Auth

Dashboard → **Authentication → Providers**，至少开启 **Email**。

Authentication → **URL Configuration**：

- Site URL：`http://localhost:3000`
- Redirect URLs：`http://localhost:3000/auth/callback`

开发阶段建议关闭 **Confirm email**，否则注册后须点邮件才能登录。

## 本地运行

```bash
npm install
npm run dev
```

打开：

- `/signup` 注册
- `/login` 登录
- `/` 查看当前 user_id / profiles（未登录会跳到登录页）

## 目录

```
src/app/login|signup     # 极简登录注册（后端验收用）
src/app/auth/callback    # Auth 回调
src/middleware.ts        # 刷新 session + 未登录保护
src/lib/supabase/        # browser / server / admin / middleware
src/types/               # 给前后端共用的类型
supabase/migrations/     # Schema 源文件
```

## Git

当前在 `main` 开发（按你的要求）。需要远程时：

```bash
git remote add origin <your-repo-url>
git push -u origin main
```
