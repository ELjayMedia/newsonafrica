"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Avatar upload widget (NOA-99). Uploads straight from the browser to the
 * owner-scoped `profiles` bucket (`avatars/<uid>-<uuid>.<ext>`), previews the
 * result, and reports the public URL to the parent form via a hidden input.
 */
export function AvatarPicker({
  userId,
  displayName,
  initialAvatarUrl,
}: {
  userId: string;
  displayName: string;
  initialAvatarUrl: string | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const initial = (displayName.trim() || "?").slice(0, 1).toUpperCase();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      setError("Choose a JPEG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `avatars/${userId}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });

      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }

      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="ui-sm mb-1 block font-medium">Avatar</span>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted",
            !avatarUrl && "heading-md text-muted-foreground",
          )}
          aria-hidden={!avatarUrl}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase-storage-hosted avatar; remote patterns not configured for next/image
            <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>

        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : avatarUrl ? "Change avatar" : "Upload avatar"}
          </Button>
          <p className="body-sm text-muted-foreground">JPEG, PNG, WebP or GIF, up to 5 MB.</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={Object.keys(ALLOWED_TYPES).join(",")}
        onChange={handleFile}
        className="sr-only"
        aria-label="Choose avatar image"
        tabIndex={-1}
      />
      {/* The form submits the uploaded URL; the server verifies it points at this user's storage prefix. */}
      <input type="hidden" name="avatarUrl" value={avatarUrl ?? ""} />

      {error ? (
        <p role="alert" className="body-sm mt-2 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
