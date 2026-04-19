"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useFirebaseAuthUser } from "../hooks/useFirebaseAuthUser";
import { ensureConversation, sendConversationMessage } from "../lib/conversations";
import { db } from "../lib/firebase";
import { devError } from "../lib/devLog";

function messageTime(m) {
  const v = m.createdAt;
  if (v?.toDate) return v.toDate().toLocaleString();
  if (v instanceof Date) return v.toLocaleString();
  return "";
}

/**
 * In-app chat between signed-in buyer and listing owner (`sellerUserId`).
 * Sellers can open existing threads for this item from the same block.
 */
export default function ItemSellerChat({ itemId, sellerUserId }) {
  const authUser = useFirebaseAuthUser();
  const uid = authUser?.uid ?? null;
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [sellerThreads, setSellerThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const isSeller = Boolean(uid && sellerUserId && uid === sellerUserId);

  useEffect(() => {
    if (!db || !itemId || !sellerUserId || !isSeller) {
      setSellerThreads([]);
      return;
    }
    const q = query(
      collection(db, "conversations"),
      where("itemId", "==", itemId),
      where("sellerId", "==", sellerUserId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSellerThreads(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );
      },
      (err) => {
        devError("ItemSellerChat sellerThreads", err);
      },
    );
    return () => unsub();
  }, [db, itemId, sellerUserId, isSeller]);

  useEffect(() => {
    if (!db || !conversationId || !open) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );
      },
      (err) => {
        devError("ItemSellerChat messages", err);
        setError("Could not load messages.");
      },
    );
    return () => unsub();
  }, [conversationId, open]);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const openBuyerChat = useCallback(async () => {
    setError(null);
    if (!db) {
      setError("Database is not available.");
      return;
    }
    if (!uid) {
      alert("Sign in to chat with the seller.");
      return;
    }
    if (!sellerUserId) {
      setError("Chat unavailable: seller not found");
      return;
    }
    if (uid === sellerUserId) {
      alert("You cannot start a chat on your own listing.");
      return;
    }
    setBusy(true);
    try {
      const cid = await ensureConversation(db, {
        itemId,
        buyerId: uid,
        sellerId: sellerUserId,
      });
      setConversationId(cid);
      setOpen(true);
    } catch (err) {
      devError("ItemSellerChat ensureConversation", err);
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg === "Chat unavailable: seller not found"
          ? "Chat unavailable: seller not found"
          : "Could not open chat. Check your connection and Firestore rules.",
      );
    } finally {
      setBusy(false);
    }
  }, [db, itemId, sellerUserId, uid]);

  function openSellerThread(threadDocId) {
    setError(null);
    setConversationId(threadDocId);
    setOpen(true);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!db || !conversationId || !uid) return;
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await sendConversationMessage(db, conversationId, uid, text);
      setDraft("");
    } catch (err) {
      devError("ItemSellerChat send", err);
      setError("Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (!sellerUserId) {
    return (
      <section
        className="mb-6 rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900"
        role="alert"
        aria-live="polite"
      >
        Chat unavailable: seller not found
      </section>
    );
  }

  const chatPanel = open && conversationId ? (
    <div className="mt-2 flex flex-col gap-2">
      <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-100 bg-neutral-50 px-2 py-2 text-sm">
        {messages.length === 0 ? (
          <p className="px-1 py-2 text-neutral-500">No messages yet. Say hello.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.senderId === uid;
              const who =
                mine ? "You" : m.senderId === sellerUserId ? "Seller" : "Buyer";
              return (
                <li
                  key={m.id}
                  className={`flex flex-col rounded-lg px-2 py-1.5 ${
                    mine
                      ? "ml-6 bg-blue-600 text-white"
                      : "mr-6 bg-white text-neutral-900 ring-1 ring-gray-200"
                  }`}
                >
                  <span className="text-[10px] opacity-80">
                    {who}{" "}
                    <span className="tabular-nums">{messageTime(m)}</span>
                  </span>
                  <span className="whitespace-pre-wrap break-words">{m.text}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSend} className="flex gap-2">
        <label className="sr-only" htmlFor={`item-chat-${itemId}`}>
          Message
        </label>
        <input
          id={`item-chat-${itemId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setConversationId(null);
        }}
        className="text-xs font-semibold text-neutral-600 underline"
      >
        Close chat
      </button>
    </div>
  ) : null;

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-base font-bold text-neutral-900">Chat with seller</h2>
      {!uid ? (
        <p className="text-sm text-neutral-600">Sign in to message the seller.</p>
      ) : isSeller ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600">
            When a buyer messages you about this item, open the thread here.
          </p>
          {sellerThreads.length === 0 ? (
            <p className="text-xs text-neutral-500">No conversations yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sellerThreads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openSellerThread(t.id)}
                    className="w-full rounded-lg border border-gray-200 bg-neutral-50 px-3 py-2 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                  >
                    Buyer <span className="font-mono text-xs">{String(t.buyerId).slice(0, 8)}…</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {chatPanel}
        </div>
      ) : (
        <>
          {!open ? (
            <button
              type="button"
              onClick={openBuyerChat}
              disabled={busy || !db}
              className="app-btn-primary disabled:opacity-60"
            >
              {busy ? "Opening…" : "Chat seller"}
            </button>
          ) : null}
          {chatPanel}
        </>
      )}
    </section>
  );
}
