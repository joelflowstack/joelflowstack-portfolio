/**
 * JOEL FLOWSTACK — flowbot.js
 * Floating chat widget, bottom-right, on every page. Calls the live
 * Flow V3 API directly (POST /api/chat) — this is NOT an iframe.
 * CORS is already open on the backend (Access-Control-Allow-Origin: *,
 * confirmed in api/chat.js), so no domain whitelisting is needed.
 *
 * API CONTRACT (confirmed against Joel44118/flow-V3's api/chat.js):
 *   Request:  POST { messages: [{ role, content }, ...] }
 *             — NOT { message: "..." }. The endpoint expects the full
 *             OpenAI-style chat history, including an optional leading
 *             { role: "system", content: "..." } message.
 *   Response: { reply, model, intent, clientAction?, clientArgs? }
 *             clientAction shows up when Flow's model chose to call a
 *             tool that only makes sense inside the full Flow app
 *             (camera, image-gen, Bluesky posting, etc.) — this simple
 *             website widget can't execute those, so it just falls back
 *             to a plain-language explanation when that happens.
 */
(function () {
  "use strict";

  const API_URL = "https://flow-v3-mu.vercel.app/api/chat";

  const SYSTEM_PROMPT =
    "You are Flow, the AI agent Joel Flowstack built, embedded as a live " +
    "capability demo on his studio's public portfolio site. You're talking " +
    "to a website visitor, not Joel himself — don't call them 'Boss'. Be " +
    "helpful, friendly, and concise. You can discuss Joel's studio " +
    "(3D websites, AI chatbots/agents, Discord/Telegram/WhatsApp bots, n8n " +
    "automation) and your own capabilities in general terms. If asked to do " +
    "something that needs a camera, image generation, or posting to social " +
    "accounts, explain that those features are part of the full Flow app, " +
    "not this website demo, and suggest contacting Joel directly instead.";

  // In-memory only — resets on page reload, which is fine for a demo widget.
  let conversation = [{ role: "system", content: SYSTEM_PROMPT }];

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

    launcher.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!panel.classList.contains("open")) return;
      if (panel.contains(e.target) || launcher.contains(e.target)) return;
      panel.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") panel.classList.remove("open");
    });

    const log = panel.querySelector("#fb-log");
    const input = panel.querySelector("#fb-text");
    const sendBtn = panel.querySelector("#fb-send");

    function addMsg(text, who) {
      const div = document.createElement("div");
      div.className = "fb-msg " + who;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      addMsg(text, "user");
      conversation.push({ role: "user", content: text });
      input.value = "";
      const thinking = addMsg("...", "bot");

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversation }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        let replyText = (data.reply || "").trim();
        if (!replyText && data.clientAction) {
          replyText = "That's something I can only do inside the full Flow app, not this website demo — ask me anything else, or reach out to Joel directly for that.";
        }
        if (!replyText) replyText = "Hmm, I didn't get a clean reply — try asking again?";

        thinking.textContent = replyText;
        conversation.push({ role: "assistant", content: replyText });
      } catch (err) {
        console.warn("[flowbot] request failed:", err);
        thinking.textContent = "Couldn't reach Flow right now — try again in a moment, or email joelflowstack@gmail.com.";
      }
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  }

  document.addEventListener("DOMContentLoaded", buildWidget);
})();
