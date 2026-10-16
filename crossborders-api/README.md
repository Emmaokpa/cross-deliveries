# CrossBordersDeliveries — API

Standalone Express + PocketBase backend. Serves JSON under `/api` — no frontend files. The website itself lives in the sibling repo/folder and is deployed on Vercel; it talks to this API over HTTP.

PocketBase is the database (self-hosted, SQLite). It stores its data in a single file inside its container, so **back up `pb_data/`** and you back up everything.

## Layout

```
crossborders-api/
├── src/
│   ├── index.js            # Express app + CORS + routes
│   ├── db.js               # PocketBase client + collections + super-admin seed
│   ├── routes/             # auth, shipments, public tracking, audit
│   └── services/           # email (Brevo), PDF invoices, shipment utils
├── scripts/
│   └── migrate-from-mongodb.mjs   # one-time MongoDB → PocketBase import
├── Dockerfile              # container image for Coolify / Docker
├── package.json
├── .env.example            # copy to .env and fill in
└── README.md
```

## Run locally

```bash
cp .env.example .env        # then fill in POCKETBASE_URL + superuser creds + JWT_SECRET
npm install
npm run dev                 # or: npm start
# API on http://localhost:8787  (health: /api/health)
```

### PocketBase (local dev)

```bash
mkdir -p pb_data
docker run -d --name pocketbase -p 8090:8090 \
  -v "$PWD/pb_data:/pb/pb_data" \
  pocketbase/pocketbase:latest

# create the superuser the API will use
docker exec -it pocketbase ./pocketbase superuser upsert admin@example.com YOUR_PASSWORD
```

On first boot the API creates its three collections automatically
(`admins`, `shipments`, `audit_logs`) — no manual schema setup needed.
All collection API rules are `null` (superuser only), so nothing outside this
API can read or write raw records.

## Migrating from MongoDB Atlas (one time)

```bash
# .env must have MONGODB_URI (Atlas) + POCKETBASE_URL + superuser creds
npm run migrate:mongodb
```

The script copies `admins`, `shipments` (with checkpoints + POD) and
`audit_logs` into PocketBase. It is idempotent (records are matched by their
original Mongo `_id`), can be safely re-run, and prints instructions if
PocketBase refuses to preserve the original `created`/`updated` timestamps.
Once you are happy with the result, delete `scripts/`, the `migrate:mongodb`
script entry and the `mongodb` devDependency — the app itself has no
MongoDB dependency.

## Deploy to a VPS with Docker + Coolify

```bash
docker build -t crossborders-api .
```

In Coolify: add the **PocketBase** service (image `pocketbase/pocketbase:latest`,
volume `pb_data:/pb/pb_data`, port `8090`) and the **API** service built from
this Dockerfile. Set the environment variables below on the API service,
point `POCKETBASE_URL` at PocketBase's internal Docker URL
(e.g. `http://pocketbase:8090`) and create the superuser once with:

```bash
docker exec -it <pocketbase-container> ./pocketbase superuser upsert admin@example.com YOUR_PASSWORD
```

## Environment variables

| Variable | Purpose |
|---|---|
| `POCKETBASE_URL` | URL of your self-hosted PocketBase instance (**required**) |
| `POCKETBASE_ADMIN_EMAIL` | PocketBase superuser email used by the API (**needed for data access; the server boots without it**) |
| `POCKETBASE_ADMIN_PASSWORD` | PocketBase superuser password (**needed for data access; the server boots without it**) |
| `JWT_SECRET` | Long random string for signing admin tokens (**required**) |
| `PORT` | Port to listen on (default `8787`) |
| `APP_DOMAIN` | Public frontend URL — used in tracking links inside emails/PDFs |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed by CORS |
| `BREVO_API_KEY` | Brevo key for shipment emails (emails are simulated in logs when empty) |
| `MAIL_FROM` | Sender address for shipment emails |
| `MONGODB_URI` | Only for `npm run migrate:mongodb` — safe to remove afterwards |

## Notes

- The server always starts and `/api/health` always answers, even if PocketBase is still booting or superuser credentials are missing/wrong — PocketBase init runs in the background and is retried every 30s.
- On first boot it seeds a super admin: `admin@gmail.com` / `password123`. Change it immediately.
- The API never serves the frontend build; point the frontend's `VITE_API_URL` at this server instead.
