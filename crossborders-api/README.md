# CrossBordersDeliveries — API

Standalone Express + MongoDB backend. Serves JSON under `/api` — no frontend files. The website itself lives in the sibling repo/folder and is deployed on Vercel; it talks to this API over HTTP.

## Layout

```
crossborders-api/
├── src/
│   ├── index.js            # Express app + CORS + routes
│   ├── db.js               # Mongoose models + connection + super-admin seed
│   ├── routes/             # auth, shipments, public tracking, audit
│   └── services/           # email (Brevo), PDF invoices, shipment utils
├── package.json
├── .env.example            # copy to .env and fill in
└── README.md
```

## Run locally

```bash
cp .env.example .env        # then fill in MONGODB_URI + JWT_SECRET
npm install
npm run dev                 # or: npm start
# API on http://localhost:8787  (health: /api/health)
```

## Deploy to a VPS (first time)

```bash
# 1. Copy the folder to your VPS
scp -r crossborders-api/ root@YOUR_VPS_IP:/opt/crossborders-api

# 2. On the VPS: install Node 20+ and PM2, then run it
ssh root@YOUR_VPS_IP
cd /opt/crossborders-api
npm ci --omit=dev           # or npm install
cp .env.example .env && nano .env   # set MONGODB_URI, JWT_SECRET, CORS_ORIGINS, APP_DOMAIN
npm i -g pm2
pm2 start src/index.js --name crossborders-api
pm2 save && pm2 startup     # auto-restart on reboot
```

Then put Nginx or Caddy in front for HTTPS and reverse-proxy to port 8787 (a minimal Nginx location block: `proxy_pass http://127.0.0.1:8787;`). Point your `CORS_ORIGINS` at your Vercel domain, e.g. `https://your-site.vercel.app,https://your-custom-domain.com`.

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas/VPS MongoDB connection string (**required**) |
| `JWT_SECRET` | Long random string for signing admin tokens (**required**) |
| `PORT` | Port to listen on (default `8787`) |
| `APP_DOMAIN` | Public frontend URL — used in tracking links inside emails/PDFs |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed by CORS |
| `BREVO_API_KEY` | Brevo key for shipment emails (emails are simulated in logs when empty) |
| `MAIL_FROM` | Sender address for shipment emails |

## Notes

- On first boot with an empty database it seeds a super admin: `admin@gmail.com` / `password123` (forced password reset on first login). Change it immediately.
- The API never serves the frontend build; point the frontend's `VITE_API_URL` at this server instead.
