import { redirect } from "next/navigation";
import { CollectionForm } from "@/components/CollectionForm";
import { LogoutButton } from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: templates }, { data: entries }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("templates")
        .select("id, slug, name, description, field_schema, is_system, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("entries")
        .select("id, template_id, title, description, collected_at, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-5 py-8 font-sans sm:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-zinc-500">种种 · data-collection</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            信息采集台
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            按后端仓库 Schema 合并：六个模块共用 templates / entries，
            图片写入 entry-images，标签写入 tags / entry_tags。
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span>{profile?.display_name ?? user.email}</span>
          <LogoutButton />
        </div>
      </div>

      <CollectionForm
        templates={templates ?? []}
        initialEntries={entries ?? []}
      />
    </main>
  );
}
