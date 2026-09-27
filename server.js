// =========================================================
// YazhGo — Backend server (Node.js + Express)
//
// What this does:
//  1. Receives a booking from the website
//  2. Validates it and recalculates the fare (never trusts the browser)
//  3. Saves it to bookings.json
//  4. Automatically sends YOU a Telegram message with the full
//     booking details, using the official Telegram Bot API
//
// Setup required before step 4 works — see README.md.
// =========================================================

require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// ---------- Telegram Bot API config (see .env.example) ----------
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // your personal chat ID (or a group's)

// ---------- Vehicle rates (source of truth — never trust the frontend) ----------
const VEHICLE_RATES = {
  Sedan: 12,
  SUV: 16,
  Premium: 22,
};

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Allow the frontend (e.g. hosted on GitHub Pages, a different domain)
// to call this API. Set ALLOWED_ORIGIN in .env to your GitHub Pages URL
// once you have it, e.g. https://yourusername.github.io — or leave it
// unset during local testing to allow any origin.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- Helpers ----------
function readBookings() {
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
}

function generateBookingId() {
  return `YZ${Date.now()}`;
}

function sanitize(value) {
  return String(value || '').trim().replace(/[<>]/g, '');
}

function validateBookingInput(body) {
  const errors = [];

  const name = sanitize(body.name);
  const phone = sanitize(body.phone);
  const pickup = sanitize(body.pickup);
  const drop = sanitize(body.drop);
  const vehicle = sanitize(body.vehicle);
  const distance = Number(body.distance);

  if (!name) errors.push('Name is required.');
  if (!/^[0-9]{10}$/.test(phone)) errors.push('A valid 10-digit phone number is required.');
  if (!pickup) errors.push('Pickup location is required.');
  if (!drop) errors.push('Drop location is required.');
  if (!vehicle || !VEHICLE_RATES[vehicle]) errors.push('A valid vehicle type is required.');
  if (!(distance > 0)) errors.push('Distance must be greater than 0.');

  return { errors, clean: { name, phone, pickup, drop, vehicle, distance } };
}

// Sends the booking straight to your Telegram chat using the official Bot API.
// If the bot credentials aren't set up yet, this just logs a warning
// instead of crashing the booking — the booking is still saved either way.
async function sendTelegramNotification(booking) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Skipped — TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set in .env');
    return { sent: false, reason: 'not_configured' };
  }

  const text =
    `🚕 *New YazhGo Booking!*\n\n` +
    `*Booking ID:* ${booking.id}\n` +
    `*Name:* ${booking.name}\n` +
    `*Phone:* ${booking.phone}\n` +
    `*Pickup:* ${booking.pickup}\n` +
    `*Drop:* ${booking.drop}\n` +
    `*Vehicle:* ${booking.vehicle} (₹${booking.rate}/km)\n` +
    `*Distance:* ${booking.distance} km\n` +
    `*Estimated Fare:* ₹${booking.fare}\n` +
    `*Time:* ${new Date(booking.createdAt).toLocaleString('en-IN')}`;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error('[Telegram] API error:', JSON.stringify(result));
      return { sent: false, reason: 'api_error', details: result };
    }

    console.log('[Telegram] Notification sent for booking', booking.id);
    return { sent: true };
  } catch (err) {
    console.error('[Telegram] Request failed:', err.message);
    return { sent: false, reason: 'request_failed' };
  }
}

// ---------- Routes ----------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'YazhGo API', timestamp: new Date().toISOString() });
});

// Create a booking — validates, saves, and notifies Telegram
app.post('/api/bookings', async (req, res) => {
  const { errors, clean } = validateBookingInput(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(' ') });
  }

  // Recalculate the fare on the server — never trust a fare sent by the client.
  const rate = VEHICLE_RATES[clean.vehicle];
  const fare = Math.round(rate * clean.distance);

  const booking = {
    id: generateBookingId(),
    name: clean.name,
    phone: clean.phone,
    pickup: clean.pickup,
    drop: clean.drop,
    vehicle: clean.vehicle,
    rate,
    distance: clean.distance,
    fare,
    createdAt: new Date().toISOString(),
  };

  const bookings = readBookings();
  bookings.push(booking);
  writeBookings(bookings);

  // Fire off the Telegram notification. We don't fail the booking if this
  // fails — the customer still gets their confirmation either way.
  const telegramResult = await sendTelegramNotification(booking);

  res.status(201).json({
    message: 'Booking created successfully.',
    booking,
    telegramNotified: telegramResult.sent,
  });
});

// List all bookings
app.get('/api/bookings', (req, res) => {
  res.json({ bookings: readBookings() });
});

// Fallback: serve the frontend for any other GET route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`YazhGo server running at http://localhost:${PORT}`);
});
