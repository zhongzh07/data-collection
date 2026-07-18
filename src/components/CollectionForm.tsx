"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Entry, Template } from "@/types/collection";

type EntryPreview = Pick<
  Entry,
  "id" | "template_id" | "title" | "description" | "collected_at" | "created_at"
>;

type CollectionFormProps = {
  templates: Template[];
  initialEntries: EntryPreview[];
};

type FormState = {
  title: string;
  description: string;
  body: string;
  address: string;
  lat: string;
  lng: string;
  collectedAt: string;
  tags: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  body: "",
  address: "",
  lat: "",
  lng: "",
  collectedAt: toLocalDateTimeValue(new Date()),
  tags: "",
};

function toLocalDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function parseOptionalNumber(value: string, min: number, max: number) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`定位数值需要在 ${min} 到 ${max} 之间。`);
  }
  return parsed;
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function sanitizeFileName(name: string) {
  const normalized = name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(-80) || "image";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CollectionForm({
  templates,
  initialEntries,
}: CollectionFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id ?? "",
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const templateNameById = useMemo(
    () => new Map(templates.map((template) => [template.id, template.name])),
    [templates],
  );

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
  }

  function fillCurrentLocation() {
    if (!navigator.geolocation) {
      setError("当前浏览器不支持定位。");
      return;
    }

    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError("定位失败，可以手动填写经纬度。");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function uploadEntryImages(userId: string, entryId: string) {
    if (!files.length) return;

    const mediaRows = [];
    for (const [index, file] of files.entries()) {
      if (!file.type.startsWith("image/")) {
        throw new Error("只能上传图片文件。");
      }

      const path = `${userId}/${entryId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("entry-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      mediaRows.push({
        entry_id: entryId,
        user_id: userId,
        storage_path: path,
        mime_type: file.type || null,
        sort_order: index,
      });
    }

    const { error: mediaError } = await supabase
      .from("entry_media")
      .insert(mediaRows);

    if (mediaError) throw mediaError;
  }

  async function saveTags(userId: string, entryId: string, tags: string[]) {
    if (!tags.length) return;

    const { data: savedTags, error: tagError } = await supabase
      .from("tags")
      .upsert(
        tags.map((name) => ({ user_id: userId, name })),
        { onConflict: "user_id,name" },
      )
      .select("id");

    if (tagError) throw tagError;
    if (!savedTags?.length) return;

    const { error: relationError } = await supabase.from("entry_tags").insert(
      savedTags.map((tag) => ({
        entry_id: entryId,
        tag_id: tag.id,
      })),
    );

    if (relationError) throw relationError;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!selectedTemplate) {
        throw new Error("请先选择一个采集模块。");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("登录已过期，请重新登录。");

      const lat = parseOptionalNumber(form.lat, -90, 90);
      const lng = parseOptionalNumber(form.lng, -180, 180);
      const tags = parseTags(form.tags);

      const { data: entry, error: entryError } = await supabase
        .from("entries")
        .insert({
          user_id: user.id,
          template_id: selectedTemplate.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          body: form.body.trim() || null,
          lat,
          lng,
          address: form.address.trim() || null,
          collected_at: new Date(form.collectedAt).toISOString(),
          extra: {
            template_slug: selectedTemplate.slug,
            source: "collection-page",
          },
        })
        .select("id, template_id, title, description, collected_at, created_at")
        .single();

      if (entryError) throw entryError;
      if (!entry) throw new Error("提交失败，请重试。");

      await uploadEntryImages(user.id, entry.id);
      await saveTags(user.id, entry.id, tags);

      setEntries((current) => [entry, ...current].slice(0, 8));
      setForm({
        ...EMPTY_FORM,
        collectedAt: toLocalDateTimeValue(new Date()),
      });
      setFiles([]);
      formElement.reset();
      setMessage("已提交并存入 Supabase。");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "提交失败，请重试。",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!templates.length) {
    return (
      <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        还没有读到 templates。请先按 README 在 Supabase SQL Editor 执行
        <code className="mx-1 rounded bg-amber-100 px-1">
          supabase/migrations/20260718000000_init_info_collection.sql
        </code>
        。
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5 rounded border border-zinc-200 bg-white p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900">采集模块</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`rounded border px-3 py-2 text-left text-sm transition ${
                  template.id === selectedTemplateId
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                <span className="block font-medium">{template.name}</span>
                <span
                  className={`mt-1 block text-xs ${
                    template.id === selectedTemplateId
                      ? "text-zinc-200"
                      : "text-zinc-500"
                  }`}
                >
                  {template.description ?? template.slug}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800">标题</span>
            <input
              required
              maxLength={80}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="这条信息最短的名字"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800">描述</span>
            <input
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="一句话概括"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800">文本输入</span>
            <textarea
              rows={5}
              value={form.body}
              onChange={(event) => updateField("body", event.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="记录观察、故事、补充说明或现场线索"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">时间</span>
              <input
                type="datetime-local"
                required
                value={form.collectedAt}
                onChange={(event) =>
                  updateField("collectedAt", event.target.value)
                }
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">标签</span>
              <input
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder="逗号分隔，例如：现场, 植物"
              />
            </label>
          </div>

          <div className="space-y-3 rounded border border-zinc-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-800">定位</p>
              <button
                type="button"
                onClick={fillCurrentLocation}
                disabled={locating}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-60"
              >
                {locating ? "定位中..." : "使用当前位置"}
              </button>
            </div>
            <input
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="地址或地点说明"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                inputMode="decimal"
                value={form.lat}
                onChange={(event) => updateField("lat", event.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="纬度 lat"
              />
              <input
                inputMode="decimal"
                value={form.lng}
                onChange={(event) => updateField("lng", event.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="经度 lng"
              />
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800">图片上传</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={onFilesChange}
              className="rounded border border-zinc-300 px-3 py-2"
            />
            {files.length ? (
              <span className="text-xs text-zinc-500">
                已选择 {files.length} 张，提交后写入 entry-images。
              </span>
            ) : null}
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "提交中..." : "提交采集信息"}
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="rounded border border-zinc-200 bg-white p-4 text-sm">
          <p className="font-medium text-zinc-900">当前模块</p>
          <p className="mt-2 text-zinc-700">{selectedTemplate?.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            slug: {selectedTemplate?.slug}
          </p>
        </section>

        <section className="rounded border border-zinc-200 bg-white p-4 text-sm">
          <p className="font-medium text-zinc-900">最近提交</p>
          <div className="mt-3 space-y-3">
            {entries.length ? (
              entries.map((entry) => (
                <article
                  key={entry.id}
                  className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
                >
                  <p className="font-medium text-zinc-900">{entry.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {templateNameById.get(entry.template_id) ?? "未知模块"} ·{" "}
                    {formatDateTime(entry.collected_at)}
                  </p>
                  {entry.description ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      {entry.description}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-zinc-500">还没有提交记录。</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
