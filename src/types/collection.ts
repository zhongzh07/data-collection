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
  /** Shortcut: storage paths from uploadImage */
  media_paths?: string[];
  /** Prefer when you also have mime_type from uploadImage */
  media?: Array<{ storage_path: string; mime_type?: string | null }>;
  extra?: Record<string, unknown>;
};

export const TEMPLATE_SLUGS: TemplateSlug[] = [
  "place",
  "plant",
  "weather",
  "animal",
  "story",
  "custom",
];


/** Storage bucket for entry images (private). */
export const ENTRY_IMAGES_BUCKET = "entry-images" as const;

export const ENTRY_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB

export const ENTRY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type EntryImageMimeType = (typeof ENTRY_IMAGE_MIME_TYPES)[number];

export type UploadImageResult = {
  storage_path: string;
  mime_type: string;
  /** Signed URL for short-lived preview (private bucket). */
  signed_url: string | null;
};
