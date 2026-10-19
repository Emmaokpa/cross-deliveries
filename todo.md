# TODO — CrossBorders: import the schema, then finish deployment

> **Who this is for:** Gemini (an AI assistant) working with a beginner user.
> **Hand this file to Gemini** (or tell Gemini to read `todo.md`) — it is the
> full current task list.
> **Do NOT touch the frontend** — the website stays on Vercel.

---

## Context (read first)

**Architecture (plain English):**
- Frontend = Vercel (`www.<domain>`)
- Backend API = Coolify on the VPS (`api.<domain>`), repo:
  https://github.com/Emmaokpa/cross-deliveries, folder `crossborders-api/`
- Database = PocketBase, currently reachable at
  `https://pocketbase.crossbordersdeliveries.site` (superuser account exists
  and the user is logged in to its admin dashboard)

**What already works / was done in previous sessions:**
- The API startup crash is FIXED (commit `dcef281`): the server always boots,
  `/api/health` always returns 200 and includes a `db` block:
  `{"configured","superuserConfigured","ready","authenticated","error"}`.
- API contract: all three collections (`admins`, `shipments`, `audit_logs`)
  with API rules `null` = superuser-only; the Express API is the only writer.
- Tracking updates (`checkpoints`) and customer details (`sender_*` /
  `recipient_*`) intentionally live **inside** each `shipments` record —
  there are deliberately NO separate `customers` / `tracking_updates` tables.
  Do not propose normalizing them; the app reads them embedded.
- The **mock admin** (`admin@gmail.com` / `password123`) is intentionally left
  in place — do NOT remove it yet.
- Email (Brevo/SMTP) is intentionally NOT configured yet — later session.

**What was done in the last session (schema work — the files are LOCAL, not
yet on GitHub):**

| File | What it is |
|---|---|
| `crossborders-api/schema/collections.blueprint.json` | **The schema blueprint** — JSON of all 3 collections in PocketBase's native import format |
| `crossborders-api/scripts/schema.mjs` | toolbox: `schema:export` / `schema:push` / `schema:verify` |
| `crossborders-api/package.json` | added the 3 `schema:*` npm scripts |
| `crossborders-api/src/db.js` | `SCHEMAS` is now exported (single source of truth; no behavior change) |
| `crossborders-api/README.md` | new "Database schema" section |

Everything was tested against a real PocketBase instance (create, re-run
idempotency, drift detect + repair, full API flow). It has **not** yet been
run against the live server.

---

## STEP 1 — Import the schema into PocketBase  ← Gemini: start here

The user must **open the file** `crossborders-api/schema/collections.blueprint.json`
and then do ONE of the two paths below.

### Path A — paste into the PocketBase admin dashboard (no terminal needed)

- [ ] User opens `crossborders-api/schema/collections.blueprint.json`, selects
      ALL of its contents, copies it.
- [ ] In the PocketBase dashboard → **Settings → Import collections** → paste
      → Save.
- [ ] If the import dialog offers a **"delete missing collections/fields"**
      option, it must be **OFF** (we only add/update, never delete).
- [ ] Verified behaviour: this works even though the 3 collections already
      exist — PocketBase matches them by name and updates them in place.
      No records are deleted.

### Path B — from the terminal with the schema scripts

- [ ] `cd crossborders-api` and make sure `.env` has:
      `POCKETBASE_URL=https://pocketbase.crossbordersdeliveries.site`,
      `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD` (must match the
      live superuser). Then:
      ```bash
      npm run schema:push      # create/update collections — idempotent, safe to re-run
      npm run schema:verify    # must print "server schema matches the code" and exit 0
      ```
- [ ] Note: the `schema:*` scripts and blueprint file are **only local right
      now** — commit + push them first (STEP 2) if you run this on the server.

---

## STEP 2 — Get the schema work onto GitHub

- [ ] Commit and push these paths from the repo root:
      - `crossborders-api/schema/` (new)
      - `crossborders-api/scripts/schema.mjs` (new)
      - `crossborders-api/package.json`, `crossborders-api/src/db.js`,
        `crossborders-api/README.md` (modified)
- [ ] If the API/Coolify is connected to the repo, redeploy so the server
      matches the local code.

---

## STEP 3 — Verify the schema import

- [ ] `npm run schema:verify` → `server schema matches the code` (exit 0).
- [ ] PocketBase dashboard → Collections shows exactly our three
      (`admins`, `shipments`, `audit_logs`) with their records intact —
      plus PocketBase's own system collections (`_superusers`, `users`, …).
      Those are normal, leave them alone.
- [ ] `https://api.<domain>/api/health` → `"ok":true` and
      `"db":{"ready":true,"authenticated":true}`.
- [ ] Log in with the mock admin (`admin@gmail.com` / `password123`) and open
      a shipment — its checkpoints timeline should render.

---

## STEP 4 — Lock down the public PocketBase (recommended, security)

PocketBase is on a **public** URL, which means its login dashboard is open
to the internet. Records are safe (API rules are superuser-only), but:

- [ ] Block the dashboard at the reverse proxy: deny `/_/` (and ideally
      anything except `/api/`) from the public internet, OR restrict the
      whole host by IP / basic auth.
- [ ] In the API's Coolify env, `POCKETBASE_URL` should use the **internal**
      URL of the PocketBase service (e.g. `http://pocketbase:8090`), not the
      public one — the API never needs to leave the VPS network.

---

## STEP 5 — Outstanding deployment checklist (from earlier — skip what's done)

- [ ] API env vars on the Coolify resource:
      `JWT_SECRET` (fresh `openssl rand -hex 32`), `POCKETBASE_URL` (internal),
      `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD` (must match the
      live superuser — `docker exec -it <pb-container> ./pocketbase superuser upsert <email> <pw>`),
      `CORS_ORIGINS` (`https://www.<domain>,https://<domain>`),
      `APP_DOMAIN`. Leave `SMTP_*`, `BREVO_API_KEY`, `MAIL_FROM` blank.
- [ ] `api.<domain>` A record → VPS IP, certificate issued, health returns 200.
- [ ] PocketBase port 8090 not directly exposed (see STEP 4).
- [ ] Backups = the PocketBase Docker volume (`pb_data`).

---

## STEP 6 — Next session (not now): email

Brevo SMTP + custom domain mailbox. `SMTP_*`, `BREVO_API_KEY`, `MAIL_FROM`
stay blank until then.

---

## Troubleshooting quick hits

- **`schema:verify` exits 1 / reports DRIFT** → the live schema differs from
  the code (a field was added to `SCHEMAS` or changed by hand). Fix:
  `npm run schema:push`, then re-verify.
- **Dashboard import says the collections already exist** → use Path B
  (`npm run schema:push`) instead; it attaches the existing ids.
- **Health `"superuserConfigured":false`** → `POCKETBASE_ADMIN_EMAIL` /
  `POCKETBASE_ADMIN_PASSWORD` missing on the API resource.
- **Health `"authenticated":false` with an error** → creds don't match the
  PocketBase superuser, or `POCKETBASE_URL` is wrong. Re-run the
  `superuser upsert` command; the API retries every 30s (no redeploy needed).
- **Data requests 500 while health is 200** → by design (health stays green
  while auth is broken); read `db.error` and the API logs.
- **CORS error from the website** → add the exact frontend origin to
  `CORS_ORIGINS`.
- **Schema questions** → the source of truth is `SCHEMAS` in
  `crossborders-api/src/db.js`; the blueprint JSON is generated from it
  (`npm run schema:export`) — never hand-edit the JSON.
