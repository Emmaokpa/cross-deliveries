# TODO — Get the CrossBorders deployment working (handoff instructions)

> **Who this is for:** Gemini (an AI assistant) working with a beginner user.
> **Goal:** Guide the user step-by-step until the backend is deployed and
> healthy on Coolify, and the site actually works end to end.
> **Do NOT touch the frontend** — the website stays on Vercel.

---

## Context (read first)

- The backend lives in `crossborders-api/` (Express API + PocketBase database).
- Everything is already pushed to GitHub: https://github.com/Emmaokpa/cross-deliveries
  (branch `main`, latest commit `dcef281`).
- **The startup crash is FIXED.** Previously the API demanded a PocketBase
  superuser login before starting; if credentials were missing or wrong, the
  process exited, `/api/health` failed, and Coolify rolled back every deploy.
  The fix (commit `dcef281`) changed the behavior to:
  - The server **always starts and listens first**, even with no admin
    credentials and even if PocketBase is down.
  - `/api/health` **always returns HTTP 200**. It now includes a `db` block:
    `{"configured","superuserConfigured","ready","authenticated","error"}` —
    use `db.error` to see what is wrong; it never fails the healthcheck.
  - Superuser login is **lazy**: it happens on first data access and retries
    every 30s in the background. Warnings in the logs are non-fatal.
- Their Coolify deployment is **Dockerfile-based** (healthcheck comes from
  `crossborders-api/Dockerfile`), and **PocketBase runs as a separate service**
  in Coolify — not inside the API container.
- The **mock admin** (`admin@gmail.com` / `password123`) is intentionally left
  in place — do NOT remove it yet.
- Email (Brevo/SMTP) is intentionally NOT configured yet — later session. Leave
  `SMTP_*`, `BREVO_API_KEY`, `MAIL_FROM` blank.

**Plain-English architecture:** Frontend = Vercel (`www.<domain>`).
Backend API = Coolify (`api.<domain>`). Database (PocketBase) = separate
service on the VPS, private, only reachable by the API. Never expose
PocketBase to the internet.

---

## STEPS

### STEP 1 — Redeploy the API in Coolify
The fix is on GitHub; the old crashing code is still what's deployed.

- [ ] In the Coolify dashboard, open the API resource → **Redeploy** (pull the
      latest `main`). If the resource isn't connected to the repo yet, create
      it from https://github.com/Emmaokpa/cross-deliveries with build pack
      **Dockerfile** and root directory `crossborders-api/`.
- [ ] Watch the logs. A healthy boot looks like:
      `[server] CrossBorders API running on http://localhost:8787`
      followed by either `[db] PocketBase connected: ...` or a **warning**
      (warnings are OK — the deploy no longer fails on them).

### STEP 2 — Set the environment variables on the API resource
Generate a fresh secret: `openssl rand -hex 32`.

| Variable | Value / notes |
|---|---|
| `JWT_SECRET` | The fresh 64-char hex output above |
| `POCKETBASE_URL` | Internal URL of the PocketBase **service** in Coolify, e.g. `http://pocketbase:8090` (same Docker network; NEVER a public URL) |
| `POCKETBASE_ADMIN_EMAIL` | Superuser email — must match the superuser that actually exists in PocketBase |
| `POCKETBASE_ADMIN_PASSWORD` | Superuser password — same rule |
| `CORS_ORIGINS` | `https://www.<domain>,https://<domain>` |
| `APP_DOMAIN` | `https://www.<domain>` |
| `BREVO_API_KEY`, `SMTP_*`, `MAIL_FROM` | (blank — later session) |

- [ ] **Create/confirm the superuser in PocketBase** (this is the #1 cause of
      the old "Failed to authenticate" error — credentials MUST match):
      ```bash
      docker exec -it <pocketbase-container> ./pocketbase superuser upsert admin@<domain> YOUR_PASSWORD
      ```
      then put the exact same email/password in the API's env vars.
- [ ] Confirm the PocketBase service is running and `POCKETBASE_URL` uses its
      **service name** (Coolify gives services on the same project a shared
      network; `http://<service-name>:8090`).

### STEP 3 — Domain + HTTPS (if not done yet)
- [ ] At the registrar: **A record**, host `api` → VPS IP (main domain stays
      on Vercel). Verify: `dig api.<domain> +short` → VPS IP.
- [ ] In Coolify, attach `https://api.<domain>` to the API service so
      Let's Encrypt issues a certificate. Redeploy if you just added it.

### STEP 4 — Verify it works
- [ ] `https://api.<domain>/api/health` → HTTP 200 with
      `"ok":true` and a `db` block. Check the `db` block:
      - `"ready":true,"authenticated":true` → fully working.
      - `"ready":false` → read `db.error`; it tells you exactly what to fix
        (missing URL, missing creds, auth failure). The endpoint still 200s.
- [ ] Log in with the mock admin: `admin@gmail.com` / `password123`.
- [ ] In the logs, confirm collections (`admins`, `shipments`, `audit_logs`)
      were auto-created on first successful boot.
- [ ] Confirm PocketBase is NOT publicly exposed (port 8090 closed to the
      internet).

### STEP 5 — Wrap up + what's next
- [ ] Tell the user what's done and what's next.
- [ ] PocketBase data lives in its Docker volume — that IS the backup target.
- [ ] NEXT session: email (Brevo + custom domain mailbox). Leave it for then.

---

## Troubleshooting quick hits
- **Deploy unhealthy / rolled back** → should be impossible now (health is
  always 200 while the process runs). If it still happens, the container
  isn't running at all — read the build logs, not the health logs.
- **Health says `"superuserConfigured":false`** → `POCKETBASE_ADMIN_EMAIL` /
  `POCKETBASE_ADMIN_PASSWORD` env vars missing on the API resource.
- **Health says `"authenticated":false` with an error** → credentials don't
  match PocketBase's superuser, or `POCKETBASE_URL` is wrong/not reachable.
  Re-run the `superuser upsert` command and check the internal URL. The API
  retries by itself every 30s — no redeploy needed after fixing PocketBase.
- **Data requests return 500 while health is 200** → that's by design: the
  healthcheck stays green while auth is broken; check `db.error` and the logs.
- **CORS error from the website** → add the exact frontend origin to
  `CORS_ORIGINS`.
- **HTTPS not issued** → `api` DNS must resolve to the VPS and the domain must
  be attached to the service before deploying.
