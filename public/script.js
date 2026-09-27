// =========================================================
// YazhGo — Frontend logic
// Sends the booking to the backend, which then forwards it
// to your WhatsApp automatically via the WhatsApp Cloud API.
// =========================================================

// If this frontend is hosted separately from the backend (e.g. this file
// on GitHub Pages, the backend on Render), set the full backend URL here.
// Leave it as an empty string if the frontend and backend are served from
// the same place (e.g. both from Express locally).
const API_BASE_URL = 'https://YOUR-RENDER-APP-NAME.onrender.com';

// ---------- Mobile nav toggle ----------
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---------- Scroll reveal animation ----------
const revealEls = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealEls.forEach((el) => revealObserver.observe(el));

// ---------- Booking form + fare calculation ----------
const form = document.getElementById('booking-form');
const fareDisplay = document.getElementById('fare-display');
const fareAmount = document.getElementById('fare-amount');
const formNote = document.getElementById('form-note');
const bookBtn = document.getElementById('book-btn');

const fields = ['name', 'phone', 'pickup', 'drop', 'vehicle', 'distance'];

function clearErrors() {
  fields.forEach((f) => {
    const errEl = document.getElementById(`err-${f}`);
    if (errEl) errEl.textContent = '';
  });
}

function getRate(vehicleSelect) {
  const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
  return selectedOption ? Number(selectedOption.dataset.rate || 0) : 0;
}

function calculateFare(rate, distance) {
  return Math.round(rate * distance);
}

function validate(data) {
  const errors = {};

  if (!data.name.trim()) errors.name = 'Name is required.';
  if (!/^[0-9]{10}$/.test(data.phone.trim())) errors.phone = 'Enter a valid 10-digit phone number.';
  if (!data.pickup.trim()) errors.pickup = 'Pickup location is required.';
  if (!data.drop.trim()) errors.drop = 'Drop location is required.';
  if (!data.vehicle) errors.vehicle = 'Please select a vehicle.';
  if (!(Number(data.distance) > 0)) errors.distance = 'Distance must be greater than 0.';

  return errors;
}

function showErrors(errors) {
  clearErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const errEl = document.getElementById(`err-${field}`);
    if (errEl) errEl.textContent = message;
  });
}

// Live fare preview as the user fills distance / vehicle
function updateFarePreview() {
  const vehicleSelect = document.getElementById('vehicle');
  const distanceInput = document.getElementById('distance');
  const rate = getRate(vehicleSelect);
  const distance = Number(distanceInput.value);

  if (rate > 0 && distance > 0) {
    fareDisplay.hidden = false;
    fareAmount.textContent = `₹${calculateFare(rate, distance)}`;
  } else {
    fareDisplay.hidden = true;
  }
}

document.getElementById('vehicle').addEventListener('change', updateFarePreview);
document.getElementById('distance').addEventListener('input', updateFarePreview);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formNote.textContent = '';
  formNote.className = 'form-note';

  const data = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    pickup: document.getElementById('pickup').value,
    drop: document.getElementById('drop').value,
    vehicle: document.getElementById('vehicle').value,
    distance: document.getElementById('distance').value,
  };

  const errors = validate(data);
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }
  clearErrors();

  const vehicleSelect = document.getElementById('vehicle');
  const rate = getRate(vehicleSelect);
  const distance = Number(data.distance);
  const fare = calculateFare(rate, distance);

  fareDisplay.hidden = false;
  fareAmount.textContent = `₹${fare}`;

  const payload = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    pickup: data.pickup.trim(),
    drop: data.drop.trim(),
    vehicle: data.vehicle,
    rate,
    distance,
    fare,
  };

  bookBtn.disabled = true;
  bookBtn.textContent = 'Booking...';

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Something went wrong. Please try again.');
    }

    formNote.textContent = `Booking confirmed! Your booking ID is ${result.booking.id}. We've received your details and will be in touch shortly.`;
    formNote.classList.add('success');
    form.reset();
    fareDisplay.hidden = true;
  } catch (err) {
    formNote.textContent = err.message || 'Unable to reach the server. Please call or WhatsApp us directly to book.';
    formNote.classList.add('error');
  } finally {
    bookBtn.disabled = false;
    bookBtn.textContent = 'Calculate Fare & Book';
  }
});
