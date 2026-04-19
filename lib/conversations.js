import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

/** Separator for deterministic conversation document IDs (must match Firestore rules). */
const CONV_ID_SEP = "__";

/**
 * Deterministic id: `itemId__buyerId__sellerId` (Firestore-safe; item + uid segments avoid `__` collisions).
 */
export function conversationDocId(itemId, buyerId, sellerId) {
  return `${itemId}${CONV_ID_SEP}${buyerId}${CONV_ID_SEP}${sellerId}`;
}

/**
 * Ensures a conversation exists for this item + buyer + seller; returns the conversation id.
 */
export async function ensureConversation(db, { itemId, buyerId, sellerId }) {
  const sid = sellerId != null ? String(sellerId).trim() : "";
  const bid = buyerId != null ? String(buyerId).trim() : "";
  if (!db || !itemId || !bid || !sid) {
    throw new Error("Chat unavailable: seller not found");
  }
  const cid = conversationDocId(itemId, bid, sid);
  const ref = doc(db, "conversations", cid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      itemId,
      buyerId: bid,
      sellerId: sid,
      createdAt: serverTimestamp(),
    });
  }
  return cid;
}

/**
 * Send a message in a conversation (caller must be authenticated as sender).
 */
export async function sendConversationMessage(db, conversationId, senderId, text) {
  const trimmed = String(text ?? "").trim();
  if (!db || !conversationId || !senderId || !trimmed) return;
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}
