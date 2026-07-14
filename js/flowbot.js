/**
 * JOEL FLOWSTACK — flowbot.js
 * Floating chat widget, bottom-right, on every page. Calls the live
 * Flow V3 API directly (POST /api/chat) — this is NOT an iframe.
 * Note: you'll see a 403 CORS error until this site's live domain is
 * whitelisted in the Flow V3 backend — that's expected, not a bug here.
 */
(function () {
  "use strict";

  const API_URL = "https://flow-v3-mu.vercel.app/api/chat";

  const analytics = {
    start: Date.now(),
    maxScroll: 0,
    clicks: 0,
    bounced: true,
  };

  function trackScroll() {
    const pct = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    analytics.maxScroll = Math.max(analytics.maxScroll, pct);
  }
  window.addEventListener("scroll", trackScroll, { passive: true });
  document.addEventListener("click", () => { analytics.clicks++; analytics.bounced = false; });
  window.addEventListener("beforeunload", () => {
    const payload = {
      timeOnPageMs: Date.now() - analytics.start,
      maxScrollPct: Math.round(analytics.maxScroll * 100),
      clicks: analytics.clicks,
      bounced: analytics.bounced,
      page: window.location.pathname,
    };
    console.info("[flowbot analytics]", payload);
    // Not yet wired to a real backend. To send this for real, swap the
    // console.info above for one of:
    //
    // navigator.sendBeacon("/api/analytics", JSON.stringify(payload));
    //
    // or, for GA4:
    // gtag("event", "page_engagement", payload);
  });

  const LOGO_SVG = `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="46" height="46" rx="10" fill="#0c0c0d" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
      <text x="24" y="31" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="19" fill="#f0f0ee">JF</text>
    </svg>`;

  function buildWidget() {
    const launcher = document.createElement("button");
    launcher.id = "flowbot-launcher";
    launcher.setAttribute("aria-label", "Chat with Flow");
    launcher.innerHTML = LOGO_SVG;
    document.body.appendChild(launcher);

    const panel = document.createElement("div");
    panel.id = "flowbot-panel";
    panel.innerHTML = `
      <div class="fb-head">${LOGO_SVG.replace('viewBox="0 0 48 48"', 'viewBox="0 0 48 48" width="18" height="18"')} Flow V3 — capability demo</div>
      <div class="fb-log" id="fb-log">
        <div class="fb-msg bot">Hey — I'm Flow, a live demo of the kind of AI agent Joel builds. Ask me anything about the studio's services.</div>
      </div>
      <div class="fb-input">
        <input id="fb-text" type="text" placeholder="Type a message..." autocomplete="off" />
        <button id="fb-send">Send</button>
      </div>`;
    document.body.appendChild(panel);

    launcher.addEventListener("click", () => panel.classList.toggle("open"));

    const log = panel.querySelector("#fb-log");
    const input = panel.querySelector("#fb-text");
    const sendBtn = panel.querySelector("#fb-send");

    function addMsg(text, who) {
      const div = document.createElement("div");
      div.className = "fb-msg " + who;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      addMsg(text, "user");
      input.value = "";
      addMsg("...", "bot");
      const thinking = log.lastElementChild;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        thinking.textContent = data.reply || data.message || "Hmm, I didn't get a clean reply — try again?";
      } catch (err) {
        console.warn("[flowbot] request failed (expected if domain isn't whitelisted yet):", err);
        thinking.textContent = "Can't reach Flow's API from this domain yet — Joel needs to whitelist it on the backend. Email joelflowstack@gmail.com in the meantime.";
      }
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  }

  document.addEventListener("DOMContentLoaded", buildWidget);
})();
