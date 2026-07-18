export default function Home() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-6 py-16 font-sans">
      <div>
        <p className="text-sm text-zinc-500">种种 · data-collection</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          信息收集系统后端
        </h1>
        <p className="mt-2 text-zinc-600">
          MVP：统一 Schema + Auth + Storage。六个模块共用 entries 表。
        </p>
      </div>

      <section className="space-y-2 text-sm text-zinc-700">
        <p>环境变量检查（仅检测是否已配置，不验证有效性）：</p>
        <ul className="list-inside list-disc space-y-1">
          <li>NEXT_PUBLIC_SUPABASE_URL：{hasUrl ? "已设置" : "缺失"}</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY：{hasAnon ? "已设置" : "缺失"}</li>
        </ul>
      </section>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>
          复制 <code className="rounded bg-zinc-100 px-1">.env.example</code> →{" "}
          <code className="rounded bg-zinc-100 px-1">.env.local</code>
        </li>
        <li>
          在 Supabase SQL Editor 执行{" "}
          <code className="rounded bg-zinc-100 px-1">
            supabase/migrations/20260718000000_init_info_collection.sql
          </code>
        </li>
        <li>开启 Authentication → Email</li>
        <li>详见 README.md</li>
      </ol>
    </main>
  );
}
