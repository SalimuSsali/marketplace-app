import { MAX_ITEM_IMAGES, uploadImageFileToR2 } from "./itemImages";

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
  const urls = [];
  for (const file of batch) {
    urls.push(await uploadImageFileToR2(file));
  }
  return urls;
}
