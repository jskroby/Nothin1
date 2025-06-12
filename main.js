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

function setupLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const res = await fetch("/api/login", {
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
  setupLogin();
});
