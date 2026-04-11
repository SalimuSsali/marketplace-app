"use client";

import { useState } from "react";

const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function ContactSellerSection({ onSendMessage }) {
  const [buyerName, setBuyerName] = useState("");
  const [message, setMessage] = useState("");

  function handleSend() {
    onSendMessage?.();
    alert("Message sent to seller");
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-neutral-900">
        Contact Seller
      </h2>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-800">
          Your Name
          <input
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-800">
          Your Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your message..."
            className={`${fieldClass} min-h-[5rem]`}
          />
        </label>
        <button
          type="button"
          onClick={handleSend}
          className="app-btn-primary mt-1"
        >
          Send Message
        </button>
      </div>
    </section>
  );
}
