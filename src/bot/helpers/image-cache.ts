import fs from 'fs';
import path from 'path';

export type ImageKey =
  | 'banner'
  | 'premium'
  | 'sfw'
  | 'nsfw'
  | `character:${string}`;

const IMAGE_DIR = path.join(process.cwd(), 'image');
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Caches Telegram file_id after first upload to avoid re-sending binary data
const fileIdCache = new Map<string, string>();

export interface LocalImage {
  source: Buffer;
  key: ImageKey;
}

function resolveFilePath(key: ImageKey): string | null {
  let candidates: string[];

  if (key.startsWith('character:')) {
    const slug = key.slice('character:'.length);
    candidates = [
      path.join(IMAGE_DIR, 'characters', slug),
      path.join(IMAGE_DIR, 'characters', 'default'),
    ];
  } else {
    candidates = [path.join(IMAGE_DIR, key as string)];
  }

  for (const base of candidates) {
    for (const ext of EXTENSIONS) {
      const full = base + ext;
      if (fs.existsSync(full)) return full;
    }
  }
  return null;
}

export function getImage(key: ImageKey): string | LocalImage | null {
  const cached = fileIdCache.get(key);
  if (cached) return cached;

  const filePath = resolveFilePath(key);
  if (!filePath) return null;

  try {
    return { source: fs.readFileSync(filePath), key };
  } catch {
    return null;
  }
}

export function cacheFileId(key: ImageKey, fileId: string): void {
  fileIdCache.set(key, fileId);
}

export function extractFileId(msg: unknown): string | null {
  if (!msg || typeof msg !== 'object') return null;
  const photo = (msg as Record<string, unknown>).photo;
  if (!Array.isArray(photo) || photo.length === 0) return null;
  const largest = photo[photo.length - 1] as { file_id?: string };
  return largest.file_id ?? null;
}
