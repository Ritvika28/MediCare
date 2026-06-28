# Deployment Guide

## MongoDB Atlas

1. Create cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create database user and whitelist IP (0.0.0.0/0 for cloud deploy)
3. Copy connection string to `MONGODB_URI`

## Backend — Render

1. Create Web Service at [render.com](https://render.com)
2. Connect GitHub repository
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Environment variables (from `server/.env.example`):
   - `NODE_ENV=production`
   - `MONGODB_URI`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `CLIENT_URL=https://your-app.vercel.app`
   - `OPENAI_API_KEY`, `CLOUDINARY_*`, `SMTP_*`
5. Deploy

## Frontend — Vercel

1. Import project at [vercel.com](https://vercel.com)
2. Settings:
   - **Root Directory:** `client`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment variables:
   - `VITE_API_URL=https://your-api.onrender.com/api`
   - `VITE_SOCKET_URL=https://your-api.onrender.com`
4. Deploy

## Post-Deployment

```bash
# Seed production database (run once locally pointing to prod URI)
MONGODB_URI="your-prod-uri" node server/src/scripts/seed.js
```

## Health Check

- API: `GET /api/health`
- Expected: `{ "success": true, "message": "API is running" }`

## CI/CD (Optional)

Add `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd server && npm ci && npm test
```

## Environment Checklist

- [ ] Strong JWT secrets (32+ characters)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] CORS `CLIENT_URL` matches Vercel domain
- [ ] Cloudinary configured for uploads
- [ ] OpenAI API key for AI assistant
- [ ] SMTP for email notifications
