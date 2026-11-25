# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

The app works end to end against a real Supabase project (URL and publishable key are in `js/config.js`; `supabase/schema.sql` is applied, sign-ups are disabled, the single user exists). Plain JavaScript, no framework, no build step, no Node. Not yet published to GitHub Pages/the custom domain, and no backup job exists yet.

## Commands

There is no package manager, build, lint or test tooling. Files are served as-is.

- Run locally: just double-click `index.html` (works from `file://`; no server needed). Needs internet only to reach Supabase.
- Deploy: GitHub Pages serves the repo root directly (no workflow needed); `CNAME` holds the custom domain.
- First-time backend setup: run `supabase/schema.sql` in the Supabase SQL editor, disable sign-ups, create the one user by hand, then fill in `js/config.js` (URL + public anon/publishable key only). Check `GET <url>/auth/v1/settings` shows `disable_signup: true`; the write policies trust any authenticated user, so open sign-ups would let anyone write.

## Code structure

- **Classic `<script>` tags only, no ES modules and no CDN** (modules are blocked on `file://`, which gave a blank page). Files share one global scope and load in the order listed in `index.html`; add new files there. `supabase-js` 2.45.4 is vendored as `js/vendor/supabase.js` (UMD); `js/db.js` creates the client `db`. Views are IIFEs registering on `Views.<name>` (see `js/ui.js`).
- `js/app.js`: header, floating Add button, and a **hash router** (`#/`, `#/work/:id`, `#/category/:id`, `#/add`, `#/edit/:id`, `#/login`). Hash routing is deliberate: GitHub Pages cannot rewrite URLs and Supabase auth redirects are not used. Each view in `js/views/` provides `render(el, ...routeParams)`.
- **Demo mode**: while `js/config.js` still has the placeholder URL (`isConfigured` is false in `js/db.js`), every function in `js/api.js` delegates to `js/demo.js` (in-memory sample works, generated placeholder pictures, auto "logged in", banner in the header). Nothing persists across refresh. Setting the real Supabase URL switches to the real backend with no other change. Keep `Demo` function signatures identical to `api.js` when changing either.
- `js/api.js` is the only place that talks to Supabase (DB + storage). `createArtwork` generates the UUID client-side, inserts the row, then uploads for each photo: the untouched **original**, a 1600px **web** JPEG and a 480px **thumb** JPEG (resized in the browser, `js/images.js`); on any failure it rolls back rows and files.
- **PDF export** (`js/pdf.js`, button on the home page): builds the whole catalog in the browser with jsPDF (vendored `js/vendor/jspdf.js` 2.5.1): cover, contents (chapters with page numbers), then one chapter per category (chapters ordered by earliest work, works without a category in a final "Overige werken" chapter, works oldest first). One A4 page per work: main picture (web version re-encoded to <=1200px), up to 4 extra pictures as thumbnails, title, date and type, description (truncated with an ellipsis if too long). Pictures are fetched cross-origin, which relies on Supabase storage sending CORS headers. Built-in PDF fonts only: characters outside Latin-1/WinAnsi will not render.
- `js/dom.js` `h()` builds elements (text only, never `innerHTML`). `js/strings.js` holds all UI text (Dutch). `js/dates.js` stores approximate dates as first-of-period plus `date_precision`.
- Login is **email + password** (one account, created by hand; sign-ups disabled). `auth.loggedIn` in `js/db.js` toggles the Add/Edit/Delete UI; the real protection is the RLS in `schema.sql`.
- Edit changes text fields only; adding/removing pictures on an existing work is not built yet.

## Project purpose

A catalog/archive of the artworks made by one of the owner's parents over many years. Works are 3D (sculptures), drawings, paintings and watercolours. The user is not technical, so **ease of archiving is the top design constraint**: adding a work must be a single obvious action with minimal required input.

Scope is deliberately **one artist, one user, one database, one deployment**. Do not build multi-artist, multi-tenant, role or sign-up features. (A second parent was considered and dropped; if it returns, it would be a fully separate copy of this project with its own Supabase project and subdomain.)

## Requirements (from the owner)

- A prominent, simple **Add** button: upload one or more pictures, a **title**, a **date**, and an optional short description.
- Artwork type: sculpture / drawing / painting / watercolour (a simple choice, not a form full of fields).
- **Categories (series):** some works exist in several versions over time (e.g. a category "oil barrel"). A record can optionally belong to one category; each record in it is still just pictures + date + short description. Viewing a category shows its versions in chronological order. Category is separate from the artwork *type*. Creating a category must be possible inline from the Add screen (pick existing or type a new name), not a separate admin step.
- Browse the archive as cards on a **timeline**.
- Data lives in an **online hosted database** (not on the owner's own server).

## Architecture and decisions

- **Static browser-only web app**: only HTML/JS/CSS, no server-side code of our own; the browser talks to Supabase directly. **Plain JavaScript only: no framework, no bundler, no Node tooling (owner's decision).** Mobile-first and responsive; **no native app and no install required** (a plain URL works; an optional web manifest is fine). The public view must be fast and easy to display on phones, tablets and desktops.
- **Supabase** provides Postgres, image storage and auth. The owner already has an account (signed in via GitHub). Create one Supabase project for this archive. Keep project keys in a local env file; never commit them. Do not put the owner's account/login details in this file.
- Core data model: `category` (name, optional description) and `artwork` (**title**, date, type, short description, optional `category_id`) with a one-to-many `artwork_image` (storage path, order, original filename). The **title is stored in the database on every archive record** (the DB must be able to identify a work even if its image files are lost). Images are stored in object storage; only paths are kept in the DB.
- Images need client-side resize/compression before upload (phone photos are large), and thumbnails for the timeline.
- Dates are often approximate for old works: allow year-only or month-only precision rather than forcing a full date.
- Access control: **exactly one user**, no roles, no sign-up flow (create the user once by hand in Supabase). That user logs in to add/edit; login is email + password (the browser remembers it; magic links were rejected because opening them in a different browser/app breaks the flow). **The archive is public**: anyone can view without logging in; only the single user can add/edit/delete.
- Security model (no backend of ours): Postgres Row Level Security on every table and the storage bucket: `select` open to everyone (`anon`), `insert/update/delete` only for the one authenticated user. Only the public anon key may reach the browser; the `service_role` key must never be in client code (use it only in the server-side backup job).

## Hosting and URLs

- Domain: **`catalog.ameije.com`**, hosted on **GitHub Pages** (`ameije.com` itself is already a GitHub Pages site under the owner's GitHub account; its DNS is managed at Cloudflare, so the new subdomain record is a CNAME to `<github-user>.github.io` set to DNS-only, not proxied). Set the custom domain in the repo's Pages settings (plus a `CNAME` file in the published output) and add a DNS `CNAME` record for the subdomain pointing at GitHub Pages. Build and publish with a GitHub Actions workflow. The Supabase URL and anon key are public values and may live in the build config; never the `service_role` key.
- GitHub Pages has no server-side rewrites: so client-side routes survive a refresh, the app uses hash-based routing. Pages sites are public and have size/bandwidth limits, so images live in Supabase storage, not in the repo.

## Durability (owner is worried about free tiers and losing pictures)

Treat the hosted free tier as *not trustworthy for the only copy of the images*. Free tiers can pause inactive projects, have limits, and usually offer no backups.

- Supabase free projects are paused after about a week of inactivity and have no automatic backups, which is exactly the risk here: either use the paid plan or rely on the mirror below plus a keep-alive. Verify current limits in Supabase's docs before deciding.
- Prefer a paid plan or cheap S3-compatible storage (e.g. Backblaze B2 / Cloudflare R2) for images over free-tier storage.
- Keep a second copy: a scheduled job on the owner's personal server that mirrors all full-resolution originals and dumps the database (JSON/CSV plus images in plain folders named by date/title), so the archive stays readable without the app.
- Keep the original full-resolution file; only thumbnails/web sizes are derived.
- Build an "export everything" command early, and test a restore.

## Open decisions to confirm with the owner

- Whether old works will be bulk-imported (affects the date-precision and batch-upload design).
- Exact backup target (personal server mirror vs. cloud bucket) and who pays for storage.
