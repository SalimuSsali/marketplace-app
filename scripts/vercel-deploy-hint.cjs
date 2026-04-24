/**
 * Reminder: local `npm run dev` (port 3000) and Vercel production use the same Next.js app.
 * Uploads hit POST /api/r2-upload with the same `lib/r2.js` code. For production uploads to
 * work like localhost, copy the same R2_* (and Firebase) values from `.env.local` into
 * Vercel → Project → Settings → Environment Variables (Production).
 */
console.log(
  "\n[deploy] Local: npm run dev → http://localhost:3000 (R2_* in .env.local).\n" +
    "Vercel: same R2_* + Firebase keys in Project → Environment Variables, then deploy.\n",
);
