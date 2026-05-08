# eBay Seller Dashboard — Setup Guide

## 1. Create an eBay Developer App

1. Go to https://developer.ebay.com/my/keys
2. Sign in and click **Create a Keyset**
3. Choose **Production** (or Sandbox for testing)
4. Note your **App ID (Client ID)** and **Cert ID (Client Secret)**
5. Under **User Tokens**, add a **RuName** (Redirect URL):
   - Set the redirect URI to: `http://localhost:3001/api/auth/callback`
   - Copy the full **RuName** value (looks like: `YourName-AppName-PRD-abc123-abc12345`)

## 2. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```
EBAY_CLIENT_ID=your_app_id_here
EBAY_CLIENT_SECRET=your_cert_id_here
EBAY_REDIRECT_URI=http://localhost:3001/api/auth/callback
EBAY_ENVIRONMENT=production
EBAY_MARKETPLACE_ID=EBAY_US
PORT=3001
```

> Use `EBAY_ENVIRONMENT=sandbox` and your sandbox credentials if you want to test first.

## 3. Install dependencies

From the root of the project:
```bash
npm run install:all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

## 4. Start the app

```bash
npm run dev
```

This starts:
- Backend at http://localhost:3001
- Frontend at http://localhost:5173

## 5. Connect your eBay account

1. Open http://localhost:5173
2. Click **Connect with eBay**
3. Log in and authorize the app
4. You'll be redirected back to the dashboard

---

## Features

| Feature | Description |
|---|---|
| Dashboard | 30-day revenue, orders, CTR, conversion rate at a glance |
| Listings | All active listings with per-listing traffic metrics |
| Analytics | CTR, page views, sales conversion rate per listing with charts |
| Sales History | Revenue trend, best-selling listings highlighted (up to 1yr) |
| Promotions | Auto-promote listings after 30 days of no sales at 2% ad rate |

## Auto-Promotion

The server runs a daily cron job at 2 AM that:
1. Fetches all your published listings
2. Tracks how long each has been live (stored in `server/listing-tracking.json`)
3. Checks which listings have had no sales in the last 30 days
4. Automatically creates/adds them to an eBay Promoted Listings Standard campaign at 2%

You can also trigger this manually from the **Promotions** page → **Run Now**.

Settings (threshold days and ad rate) can be changed from the Promotions page.
