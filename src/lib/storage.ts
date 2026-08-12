import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for server-side storage operations.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for file storage");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 *
 * Bucket must exist in your Supabase project (create via dashboard or SQL).
 * Recommended bucket: "matter-documents" (private) or "matter-documents-public" (public).
 *
 * For private buckets, use getSignedUrl() instead of getPublicUrl().
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string,
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: false });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Generate a signed URL for a private file (valid for `expiresIn` seconds).
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

/**
 * Parse a Supabase Storage URL back into { bucket, path }.
 * Returns null if the URL doesn't match the expected pattern.
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    // Pattern: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (!match) return null;
    return { bucket: match[1], path: match[2] };
  } catch {
    return null;
  }
}

export const STORAGE_BUCKET = "matter-documents";
