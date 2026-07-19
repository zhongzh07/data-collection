import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  CreateEntryInput,
  Entry,
  EntryMedia,
  Template,
  TemplateSlug,
} from "@/types/collection";

export type CreateEntryOptions = {
  client?: SupabaseClient;
};

export type CreatedEntry = Entry & {
  template_slug: TemplateSlug;
  tags: string[];
  media: Pick<EntryMedia, "id" | "storage_path" | "mime_type" | "sort_order">[];
};

export type ListEntriesOptions = {
  client?: SupabaseClient;
  template_slug?: TemplateSlug;
  limit?: number;
};

function resolveClient(client?: SupabaseClient) {
  return client ?? createClient();
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("请先登录。");
  return user;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function resolveMedia(
  input: CreateEntryInput,
): Array<{ storage_path: string; mime_type: string | null }> {
  const fromMedia =
    input.media?.map((m) => ({
      storage_path: m.storage_path,
      mime_type: m.mime_type ?? null,
    })) ?? [];
  const fromPaths =
    input.media_paths?.map((storage_path) => ({
      storage_path,
      mime_type: null as string | null,
    })) ?? [];

  const seen = new Set<string>();
  const out: Array<{ storage_path: string; mime_type: string | null }> = [];
  for (const item of [...fromMedia, ...fromPaths]) {
    const path = item.storage_path.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ storage_path: path, mime_type: item.mime_type });
  }
  return out;
}

export async function listTemplates(
  options: { client?: SupabaseClient } = {},
): Promise<Template[]> {
  const supabase = resolveClient(options.client);
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("slug", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Template[];
}

/**
 * Create a collection entry with optional tags and media paths.
 * Media files must already be uploaded (e.g. via uploadImage).
 */
export async function createEntry(
  input: CreateEntryInput,
  options: CreateEntryOptions = {},
): Promise<CreatedEntry> {
  const supabase = resolveClient(options.client);
  const user = await requireUser(supabase);

  const title = input.title?.trim() ?? "";
  if (!title) {
    throw new Error("标题不能为空。");
  }

  if (input.lat != null && (input.lat < -90 || input.lat > 90)) {
    throw new Error("纬度超出范围（-90 ~ 90）。");
  }
  if (input.lng != null && (input.lng < -180 || input.lng > 180)) {
    throw new Error("经度超出范围（-180 ~ 180）。");
  }

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("id, slug")
    .eq("slug", input.template_slug)
    .maybeSingle();

  if (templateError) throw new Error(templateError.message);
  if (!template) {
    throw new Error(`未知模块：${input.template_slug}`);
  }

  const media = resolveMedia(input);
  for (const item of media) {
    if (!item.storage_path.startsWith(`${user.id}/`)) {
      throw new Error(
        `图片路径不属于当前用户：${item.storage_path}`,
      );
    }
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      template_id: template.id,
      title,
      description: input.description?.trim() || null,
      body: input.body?.trim() || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      address: input.address?.trim() || null,
      collected_at: input.collected_at || new Date().toISOString(),
      extra: input.extra ?? {},
    })
    .select("*")
    .single();

  if (entryError) throw new Error(entryError.message);

  const tagNames = normalizeTags(input.tags);
  const tagIds: string[] = [];

  for (const name of tagNames) {
    const { data: existing, error: findError } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name)
      .maybeSingle();

    if (findError) throw new Error(findError.message);

    if (existing) {
      tagIds.push(existing.id);
      continue;
    }

    const { data: createdTag, error: tagError } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name })
      .select("id")
      .single();

    if (tagError) {
      // Race: another request created the same tag
      const { data: again, error: againError } = await supabase
        .from("tags")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", name)
        .maybeSingle();
      if (againError || !again) throw new Error(tagError.message);
      tagIds.push(again.id);
      continue;
    }

    tagIds.push(createdTag.id);
  }

  if (tagIds.length) {
    const { error: linkError } = await supabase.from("entry_tags").insert(
      tagIds.map((tag_id) => ({
        entry_id: entry.id,
        tag_id,
      })),
    );
    if (linkError) throw new Error(linkError.message);
  }

  if (media.length) {
    const { error: mediaError } = await supabase.from("entry_media").insert(
      media.map((item, index) => ({
        entry_id: entry.id,
        user_id: user.id,
        storage_path: item.storage_path,
        mime_type: item.mime_type,
        sort_order: index,
      })),
    );
    if (mediaError) throw new Error(mediaError.message);
  }

  const { data: mediaRows, error: mediaReadError } = await supabase
    .from("entry_media")
    .select("id, storage_path, mime_type, sort_order")
    .eq("entry_id", entry.id)
    .order("sort_order", { ascending: true });

  if (mediaReadError) throw new Error(mediaReadError.message);

  return {
    ...(entry as Entry),
    template_slug: template.slug as TemplateSlug,
    tags: tagNames,
    media: mediaRows ?? [],
  };
}

export async function listEntries(
  options: ListEntriesOptions = {},
): Promise<
  Array<
    Entry & {
      templates: { slug: TemplateSlug; name: string } | null;
    }
  >
> {
  const supabase = resolveClient(options.client);
  await requireUser(supabase);

  let query = supabase
    .from("entries")
    .select("*, templates ( slug, name )")
    .order("collected_at", { ascending: false })
    .limit(options.limit ?? 20);

  if (options.template_slug) {
    const { data: template, error } = await supabase
      .from("templates")
      .select("id")
      .eq("slug", options.template_slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!template) return [];
    query = query.eq("template_id", template.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<
    Entry & { templates: { slug: TemplateSlug; name: string } | null }
  >;
}
