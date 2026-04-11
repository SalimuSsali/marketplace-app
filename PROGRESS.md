# Project progress (handoff)

Last reviewed: **2026-04-11** — Profile supports **email/password** and **Google** sign-in; guest browsing; `validateSellerEmailForPost` respects chosen posting mode.

## What is completed

- **Next.js app (App Router)** with shared layout, bottom navigation, and Tailwind styling (`app/globals.css`).
- **Firebase**: Firestore listings, Auth on Profile (**email/password** + **Google**). Client config in `lib/firebase.js` (long-polling for flaky networks).
- **Seller identity**: Posting uses signed-in user email via `lib/sellerIdentity.js` (`validateSellerEmailForPost`, `SELLER_SIGNUP_MODE`). Guests browse without an account.
- **Marketplace data**: Items (multi-image, `title` + `tags[]`, legacy `name`, expiry/renew), shops (optional images, `tags[]`), requests, services, rentals (Firestore collection `properties`; routes `/rentals`). **No categories**: global search via `lib/globalSearch.js` + `lib/itemFields.js`. Old `/categories` URLs redirect to `/items`; `/property` → `/rentals`.
- **Images**: Multi-image upload through `POST /api/r2-upload` (`lib/itemImages.js`, Cloudflare R2 via `lib/r2.js`).
- **Shared utilities**: `lib/descriptionWords.js`, `lib/formatSubmitError.js`, `lib/itemImageUpload.js`, `lib/digitsOnly.js`, `lib/locationNearby.js`, hooks under `hooks/`.

## What is currently working

- Browse home, items, shops, requests, services, rentals without signing in.
- Profile: create account, sign in, forgot password, sign out; Google pop-up or full-page redirect.
- Posting flows that require identity (Add item/shop/service modes, shop item post) when signed in and Firestore rules allow it.
- **Services** page “Offer Service” uses the **signed-in account email** on the listing (no separate email field in the form).

## What is unfinished / placeholder

- **Messages** (`app/messages/page.js`): static “No messages yet”.
- **Favorites** (`app/favorites/page.js`): placeholder copy only.
- **Notifications** (`app/notifications/page.js`): reads notification docs for the signed-in user’s email.
- **`lib/types.ts`**: example type only; not wired across the app.
- **Broader hardening**: no automated tests; `console.error` in catch paths for diagnostics; Firestore rules outside this repo.

## Resume / extend

1. Read **`README.md`** for setup (`cp .env.example .env.local`, Firebase + R2).
2. Run **`npm run dev`** (Turbopack disabled on Windows in the script).
3. Extend via `app/`, `lib/`, `components/`, `hooks/` — see README architecture table.

## Folder map (high level)

| Area | Location |
|------|----------|
| Routes / pages | `app/` |
| API | `app/api/` |
| React components | `components/` |
| Hooks | `hooks/` |
| Domain & Firebase/R2 helpers | `lib/` |
| Global styles | `app/globals.css` |
