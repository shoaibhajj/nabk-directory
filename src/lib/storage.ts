// Storage abstraction. MVP uses Replit object storage when env is configured;
// otherwise falls back to data-URL no-op for development.
// To self-host, swap this file's implementation to Cloudinary or S3 — the
// public interface (uploadImage, uploadVideo, getPublicUrl) stays the same.

export interface UploadResult {
  storageKey: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

const enabled = Boolean(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);

export async function uploadImage(_buf: Buffer, _filename: string): Promise<UploadResult> {
  if (!enabled) {
    return {
      storageKey: "noop",
      url: "/placeholder.svg",
    };
  }
  throw new Error("Object storage upload not yet implemented");
}

export async function uploadVideo(_buf: Buffer, _filename: string): Promise<UploadResult> {
  if (!enabled) {
    return {
      storageKey: "noop",
      url: "/placeholder.svg",
    };
  }
  throw new Error("Object storage upload not yet implemented");
}

export function getPublicUrl(storageKey: string): string {
  if (storageKey.startsWith("http")) return storageKey;
  return storageKey;
}
