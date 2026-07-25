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
  // Same endpoint as chat, routed by req.body.action — Vercel's Hobby plan
  // caps a project at 12 serverless functions, and flow-V3 was already at
  // that limit, so this is folded into api/chat.js rather than its own file.
  const ADMIN_URL = "https://flow-v3-mu.vercel.app/api/chat";

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

  function sendEvent(event) {
    try {
      const payload = JSON.stringify({ action: "track_event", event });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ADMIN_URL, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      }
    } catch (err) {
      console.warn("[flowbot] analytics event failed:", err);
    }
  }

  // A real pageview, sent on load rather than on unload, so it isn't
  // lost if the tab gets killed before beforeunload fires.
  sendEvent({ type: "pageview", page: window.location.pathname || "/" });

  function trackScroll() {
    const pct = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    analytics.maxScroll = Math.max(analytics.maxScroll, pct);
  }
  window.addEventListener("scroll", trackScroll, { passive: true });
  document.addEventListener("click", () => { analytics.clicks++; analytics.bounced = false; });
  window.addEventListener("beforeunload", () => {
    if (analytics.bounced && analytics.maxScroll < 0.15) {
      sendEvent({ type: "bounce", page: window.location.pathname || "/" });
    }
    console.info("[flowbot analytics]", {
      timeOnPageMs: Date.now() - analytics.start,
      maxScrollPct: Math.round(analytics.maxScroll * 100),
      clicks: analytics.clicks,
      bounced: analytics.bounced,
      page: window.location.pathname,
    });
  });

  const LOGO_SVG = `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="46" height="46" rx="10" fill="#0c0c0d" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
      <text x="24" y="31" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="19" fill="#f0f0ee">JF</text>
    </svg>`;

  // A HEAD request costs nothing (no LLM call, no token spend) but still
  // proves the backend is actually reachable — any response at all, even
  // an error status, means the server answered. Only a network-level
  // failure or timeout counts as "offline". Re-checked periodically so
  // the badge doesn't just reflect whatever was true at page load.
  function checkStatus(onResult) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const startedAt = performance.now();
    fetch(API_URL, { method: "HEAD", signal: controller.signal })
      .then(() => onResult(true, Math.round(performance.now() - startedAt)))
      .catch(() => onResult(false, null))
      .finally(() => clearTimeout(timeout));
  }

  const PING_HISTORY_KEY = "flowv3_ping_history";
  const PING_HISTORY_MAX = 40;

  // Every 90s check gets appended to a small rolling history in
  // localStorage — same pings already being made for the badge, just
  // kept instead of thrown away. Builds a genuine record over repeat
  // visits rather than a mock chart with fake numbers in it.
  function recordPing(online, ms) {
    let history = [];
    try { history = JSON.parse(localStorage.getItem(PING_HISTORY_KEY)) || []; } catch (e) { history = []; }
    history.push({ t: Date.now(), ok: online, ms: ms });
    if (history.length > PING_HISTORY_MAX) history = history.slice(history.length - PING_HISTORY_MAX);
    try { localStorage.setItem(PING_HISTORY_KEY, JSON.stringify(history)); } catch (e) { /* private browsing etc — fine, just won't persist */ }
  }

  // Renders into #flow-status-panel if it's present on the page (only
  // index.html has it). A plain inline SVG bar chart — bar height is
  // real response time scaled against the worst response in the
  // window, full-height red bar for a check that got no response at
  // all. Native <title> per bar gives a hover tooltip for free.
  function renderStatusPanel() {
    const mount = document.getElementById("flow-status-panel");
    if (!mount) return;
    let history = [];
    try { history = JSON.parse(localStorage.getItem(PING_HISTORY_KEY)) || []; } catch (e) { history = []; }
    if (!history.length) { mount.innerHTML = ""; return; }

    const total = history.length;
    const okCount = history.filter(h => h.ok).length;
    const uptimePct = Math.round((okCount / total) * 1000) / 10;
    const maxMs = Math.max(1, ...history.filter(h => h.ok).map(h => h.ms));
    const barW = 6, gap = 3, barH = 36;
    const bars = history.map((h, i) => {
      const x = i * (barW + gap);
      const bh = h.ok ? Math.max(4, Math.round((h.ms / maxMs) * barH)) : barH;
      const y = barH - bh;
      const title = h.ok ? `${h.ms}ms` : "no response";
      return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="1.5" class="${h.ok ? "ping-ok" : "ping-fail"}"><title>${title}</title></rect>`;
    }).join("");
    const svgW = total * (barW + gap) - gap;
    const firstLabel = new Date(history[0].t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

    mount.innerHTML = `
      <div class="flow-status-head">
        <span class="flow-status-title">Flow V3 &mdash; live status</span>
        <span class="flow-status-uptime">${uptimePct}% uptime</span>
      </div>
      <svg class="flow-status-spark" viewBox="0 0 ${svgW} ${barH}" preserveAspectRatio="none">${bars}</svg>
      <span class="flow-status-caption">Last ${total} checks &middot; tracking since ${firstLabel}</span>`;
  }

  function applyStatus(online, ms) {
    const dots = document.querySelectorAll(".fb-dot");
    const text = document.getElementById("fb-status-text");
    dots.forEach(d => d.className = "fb-dot " + (online ? "online" : "offline"));
    if (text) {
      text.className = "fb-status " + (online ? "online" : "offline");
      text.innerHTML = `<span class="fb-dot ${online ? "online" : "offline"}"></span>${online ? "online" : "offline — try email instead"}`;
    }
    // Only present on index.html's stats section — same real ping, just
    // also surfaced as a number rather than a dot, so it's not a second
    // separate request/cost.
    const liveStat = document.getElementById("live-ping");
    if (liveStat) liveStat.textContent = online ? ms + "ms" : "n/a";

    recordPing(online, ms);
    renderStatusPanel();
  }

  function pollStatus() {
    renderStatusPanel(); // paint whatever history already exists from past visits immediately
    checkStatus(applyStatus);
    setInterval(() => checkStatus(applyStatus), 90000); // re-check every 90s while the tab is open
  }

  function buildWidget() {
    const launcher = document.createElement("button");
    launcher.id = "flowbot-launcher";
    launcher.setAttribute("aria-label", "Chat with Flow");
    launcher.innerHTML = LOGO_SVG + '<span id="fb-status-dot" class="fb-dot checking"></span>';
    document.body.appendChild(launcher);

    const panel = document.createElement("div");
    panel.id = "flowbot-panel";
    panel.innerHTML = `
      <div class="fb-head">
        ${LOGO_SVG.replace('viewBox="0 0 48 48"', 'viewBox="0 0 48 48" width="18" height="18"')}
        Flow V3 — capability demo
        <span id="fb-status-text" class="fb-status checking"><span class="fb-dot checking"></span>checking&hellip;</span>
      </div>
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

  document.addEventListener("DOMContentLoaded", () => {
    buildWidget();
    pollStatus();
  });
})();
