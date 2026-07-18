export type TemplateSlug =
  | "place"
  | "plant"
  | "weather"
  | "animal"
  | "story"
  | "custom";

export type Template = {
  id: string;
  slug: TemplateSlug;
  name: string;
  description: string | null;
  field_schema: unknown[];
  is_system: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Entry = {
  id: string;
  user_id: string;
  template_id: string;
  title: string;
  description: string | null;
  body: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  collected_at: string;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EntryMedia = {
  id: string;
  entry_id: string;
  user_id: string;
  storage_path: string;
  public_url: string | null;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type CreateEntryInput = {
  template_slug: TemplateSlug;
  title: string;
  description?: string;
  body?: string;
  lat?: number;
  lng?: number;
  address?: string;
  collected_at?: string;
  tags?: string[];
  media_paths?: string[];
  extra?: Record<string, unknown>;
};
