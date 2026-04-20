import { MAX_ITEM_IMAGES, optimizeImageFileForUpload, uploadImageFileToR2 } from "./itemImages";

/**
 * Decide how many new files can be added given existing image count.
 * @returns {{ action: "none" } | { action: "full" } | { action: "upload", batch: File[], truncated: boolean }}
 */
export function planItemImageFileBatch(files, existingUrlCount) {
  const list = Array.from(files ?? []);
  if (!list.length) return { action: "none" };
  const room = MAX_ITEM_IMAGES - existingUrlCount;
  if (room <= 0) return { action: "full" };
  const batch = list.slice(0, room);
  const truncated = list.length > batch.length;
  return { action: "upload", batch, truncated };
}

export async function uploadItemImageBatch(batch) {
  const files = Array.from(batch ?? []);
  if (!files.length) return [];

  // Mobile-friendly: keep concurrency small so we don't saturate memory/network.
  const CONCURRENCY = 3;
  const results = new Array(files.length);

  let nextIndex = 0;
  async function worker() {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= files.length) return;
      const optimized = await optimizeImageFileForUpload(files[i]);
      results[i] = await uploadImageFileToR2(optimized);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
