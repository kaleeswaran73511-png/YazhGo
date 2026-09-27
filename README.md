# YazhGo — Taxi Booking Website with Automatic Telegram Notifications

When a customer books a ride on this website, the backend **automatically sends the full booking details straight to your Telegram** — no tap or action needed on your side. This uses the official, free **Telegram Bot API**.

## 1. Project Description

YazhGo is a taxi and travel service booking site. A customer fills in trip details, sees an instant fare estimate, and submits the booking. The Node.js/Express backend validates it, recalculates the fare itself, saves it, and sends you a Telegram message with all the details automatically.

## 2. Features

- Premium dark, gold-accented, fully responsive design
- Instant fare estimate: `fare = distance × vehicle rate`
- Vehicle options: Sedan (₹12/km), SUV (₹16/km), Premium (₹22/km)
- Frontend + backend validation; backend always recalculates the fare itself
- **Automatic Telegram notification to you** the moment a booking is made
- Bookings also saved to `bookings.json` as a simple record
- Clean, commented, beginner-friendly code

## 3. Folder Structure

```
YazhGo-telegram/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js            # Express server, booking API, Telegram sender
├── package.json
├── bookings.json
├── .env.example
├── .gitignore
└── README.md
```

## 4. Telegram Setup (one-time, free, ~5 minutes)

1. **Create your bot:** open Telegram and search for **@BotFather** (the official bot for creating bots). Start a chat and send `/newbot`.
2. Follow the prompts — give your bot a display name (e.g. "YazhGo Alerts") and a username ending in `bot` (e.g. `YazhGoAlertsBot`).
3. BotFather replies with a **token** that looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` — this is your `TELEGRAM_BOT_TOKEN`.
4. **Start a chat with your own bot:** search for the bot's username you just created and send it any message (e.g. "hi"). This step is required — Telegram won't let a bot message you until you've messaged it first.
5. **Get your chat ID:** open this URL in a browser, replacing `<TOKEN>` with your real token:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   You'll see JSON containing `"chat":{"id":123456789, ...}` — that number is your `TELEGRAM_CHAT_ID`.
   (If you see an empty `"result":[]`, make sure you sent the bot a message first, then refresh.)
6. Copy `.env.example` to `.env` and fill in:
   ```
   TELEGRAM_BOT_TOKEN=<the token from step 3>
   TELEGRAM_CHAT_ID=<the chat ID from step 5>
   ```

That's it — no approval process, no waiting, and the token never expires (unless you regenerate it via BotFather).

> **Using a group instead:** create a Telegram group, add your bot to it, send a message in the group, then use the same `getUpdates` URL to find the group's chat ID (it will be a negative number). Use that as `TELEGRAM_CHAT_ID` instead.

## 5. Installation

```
npm install
cp .env.example .env
```
Then fill in `.env` as described above.

## 6. Run It

```
npm start
```
Visit `http://localhost:3000`. Submit a test booking — you should get a Telegram message within a second or two.

If the Telegram credentials aren't filled in yet, bookings still work and save normally — the server just logs a warning instead of sending a message, so nothing breaks while you're setting things up.

## 7. Hosting It Live: Backend on Render + Frontend on GitHub Pages

This project supports splitting the two pieces across two free hosts — the backend (Express + Telegram sending) on Render, and the static frontend (`public/` folder) on GitHub Pages. They talk to each other over the internet, so they don't need to live in the same place.

### Step A — Deploy the backend to Render

1. Push this whole project to a GitHub repo (`git init`, `git add .`, `git commit -m "Initial commit"`, then create a repo on GitHub and `git push`).
2. Go to https://render.com, sign up/log in, click **New → Web Service**, and connect that GitHub repo.
3. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Under Render's **Environment** tab, add the same variables from your `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — and set `ALLOWED_ORIGIN` to your GitHub Pages URL (you'll get this in Step B; you can come back and add it after).
5. Click **Deploy**. Once it's live, Render gives you a URL like `https://yazhgo-backend.onrender.com` — copy it.

> Render's free tier "sleeps" after inactivity and takes ~30-60 seconds to wake up on the next request — normal for free hosting, not a bug.

### Step B — Deploy the frontend to GitHub Pages

1. In `public/script.js`, find this line near the top:
   ```js
   const API_BASE_URL = 'https://YOUR-RENDER-APP-NAME.onrender.com';
   ```
   Replace it with the real Render URL you copied in Step A (no trailing slash).
2. Commit and push that change.
3. In your GitHub repo, go to **Settings → Pages**.
4. Under "Build and deployment," set **Source** to "Deploy from a branch," pick your branch, and set the folder to `/public` (or move the contents of `public/` to the repo root if GitHub Pages' folder options don't include `/public` in your account).
5. Save — GitHub gives you a live URL like `https://yourusername.github.io/yourrepo/`.
6. Go back to Render's **Environment** tab and set `ALLOWED_ORIGIN` to that exact GitHub Pages URL (e.g. `https://yourusername.github.io`), so the backend accepts requests from it. Redeploy the backend for the change to take effect.

Now customers visit the GitHub Pages link, the booking form calls your Render backend, and you get the Telegram message automatically — all for free.

### Alternative — everything on Render (simpler, one URL)

If you'd rather not split it, just deploy this whole project (frontend + backend together) to Render as-is — Express already serves the `public/` folder itself, so `API_BASE_URL` can stay `''` (empty string) and everything works from one URL. This skips Step B and the CORS setup entirely.

## 8. API Endpoints

| Method | Endpoint         | Description                                  |
|--------|------------------|-----------------------------------------------|
| GET    | `/api/health`    | Server status check                           |
| POST   | `/api/bookings`  | Creates a booking, saves it, and sends you a Telegram message |
| GET    | `/api/bookings`  | Returns all stored bookings                   |

## 9. How Booking Data Is Stored

Every booking is saved to `bookings.json` (id, name, phone, pickup, drop, vehicle, rate, distance, fare, timestamp) **and** sent to your Telegram automatically. If you later want a real database instead of a JSON file, swap `readBookings`/`writeBookings` in `server.js` for calls to MongoDB, PostgreSQL, etc. — the rest of the code doesn't need to change.

## 10. Customizing

- **Notification recipient:** change `TELEGRAM_CHAT_ID` in `.env` — nothing else needs editing.
- **Notification content/format:** edit the `text` template inside `sendTelegramNotification()` in `server.js` (it uses Telegram's Markdown formatting — `*bold*`).
- **Customer-facing phone/WhatsApp buttons** (header, footer, CTA, floating buttons) are unrelated to this notification system and still work as before — search `public/index.html` for `tel:+919489038346` and `wa.me/919489038346` if you want to change that number.
- **Vehicle rates:** update the `VEHICLE_RATES` object in `server.js` (and the matching `<option>` values in `index.html`).

## 11. Troubleshooting

- **"[Telegram] Skipped" in the server log:** `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing — double check `.env` was created (not just `.env.example`) and the server was restarted after editing it.
- **"[Telegram] API error" in the log, `"description":"Forbidden: bot was blocked by the user"`:** you haven't started a chat with your bot yet — send it any message first (step 4 above).
- **`getUpdates` returns an empty `result`:** you need to message the bot before its chat ID appears — send it a message, then reload the `getUpdates` URL.
- **Booking succeeds but no Telegram message arrives:** check the server terminal for `[Telegram]` log lines — they'll say exactly what happened.

## 12. Future Improvements

- Replace `bookings.json` with a real database
- Add an admin dashboard to view bookings
- Add Telegram inline buttons (e.g. "Accept" / "Decline") to act on bookings directly from the chat
- Add a fallback notification channel (e.g. email) if Telegram fails
