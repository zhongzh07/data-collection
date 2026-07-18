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

可选：Authentication → URL Configuration，把本地回调写成：

`http://localhost:3000/auth/callback`

（回调路由下一阶段再补。）

## 本地运行

```bash
npm install
npm run dev
```

## 目录

```
src/lib/supabase/   # browser / server / admin 客户端
src/types/           # 给前后端共用的类型
supabase/migrations/ # Schema 源文件
```

## Git

当前在 `main` 开发（按你的要求）。需要远程时：

```bash
git remote add origin <your-repo-url>
git push -u origin main
```
