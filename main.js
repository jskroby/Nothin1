function autoBio() {
  console.log("🔥 Auto Bio triggered");
}

function autoBlog() {
  console.log("✩ Auto Blog started");
}

function autoReply() {
  console.log("📵 Auto Reply activated");
}

function autoRevisit() {
  console.log("✩ Revisit logic pinged");
}

function autoMessage() {
  console.log("📾 Auto Message dispatch");
}

function trackVisitors() {
  const count = Number(localStorage.getItem('visits') || '0') + 1;
  localStorage.setItem('visits', String(count));
  const el = document.getElementById('visitor-count');
  if (el) el.textContent = `Visits: ${count}`;
}

function setupBioOptimization() {
  const form = document.getElementById('bio-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bio = document.getElementById('bio-input').value;
    try {
      const res = await fetch('/api/bio-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      const data = await res.json();
      document.getElementById('bio-result').textContent = data.optimizedBio || 'No result';
    } catch (err) {
      console.error('Bio optimize error', err);
    }
  });
}

function setupBooking() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const time = document.getElementById('time').value;
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, time }),
      });
      if (res.ok) {
        alert('Booked!');
      }
    } catch (err) {
      console.error('Booking error', err);
    }
  });
}

function setupLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const res = await fetch("/api/rentmasseur-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        console.log("Login successful");
      } else {
        console.error("Login failed");
      }
    } catch (err) {
      console.error("Network error", err);
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  autoBio();
  autoBlog();
  autoReply();
  autoRevisit();
  autoMessage();
  trackVisitors();
  setupLogin();
  setupBioOptimization();
  setupBooking();
});
