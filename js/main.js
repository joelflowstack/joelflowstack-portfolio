/**
 * JOEL FLOWSTACK — main.js
 * Partial includes, loader, navbar, mobile menu, scroll reveal, active link,
 * year stamp, contact form handling.
 */

(function () {
  "use strict";

  /* ── INCLUDE PARTIALS (nav / footer) ────────────────────────────────────
     Static multi-page site, no build step — fetch() same-origin HTML
     fragments so nav/footer stay in one place but every page stays a plain
     .html file for GitHub + Vercel static hosting. */
  const includes = document.querySelectorAll("[data-include]");
  let pending = includes.length;

  if (pending === 0) {
    boot();
  } else {
    includes.forEach((el) => {
      fetch(el.getAttribute("data-include"))
        .then((r) => r.text())
        .then((html) => {
          el.outerHTML = html;
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          if (pending === 0) boot();
        });
    });
  }

  function boot() {
    setActiveNav();
    initNavbar();
    initMobileMenu();
    initReveal();
    initYear();
    initForm();
    initCounters();
    initFlowLauncher();
    initLightTrails();
  }

  /* ── LIGHT TRAILS ─────────────────────────────────────────────────────
     Five small glints that ride fixed CSS motion paths behind the content
     (see .light-trail in style.css) — "light passing through the lines,
     consecutively." Injected once here instead of pasted into all six
     HTML pages. */
  function initLightTrails() {
    if (window.matchMedia("(max-width: 900px)").matches) return; // CSS also skips these; save the DOM nodes too
    if (document.querySelector(".light-trail")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = ['t1', 't2', 't3', 't4', 't5']
      .map((cls) => `<div class="light-trail ${cls}"></div>`)
      .join("");
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }

  /* ── FLOW CHAT — real backend, not a placeholder ─────────────────────────
     Calls the live flow-v3-mu.vercel.app/api/chat endpoint (open CORS,
     confirmed from the flow-V3 repo). System prompt below is deliberately
     scoped to public studio/portfolio questions — it does NOT include
     Joel's personal Flow V3 memory/context (facts, location, goals, notes),
     since anyone visiting this site can open this widget. Same real model
     chain (Cerebras → OpenRouter → Groq → HuggingFace) as the Flow V3
     project itself, just a different, public-safe brief. */
  const FLOW_API = "https://flow-v3-mu.vercel.app/api/chat";
  const FLOW_SYSTEM_PROMPT =
    "You are Flow, the AI assistant built by Joel Flowstack, running live on his studio's portfolio site as a real demo of what you can do. " +
    "Joel Flowstack is a solo digital studio: 3D interactive websites, AI bot automation (Discord/Telegram/WhatsApp), and n8n workflow automation, everything deployed via GitHub + Vercel. " +
    "You are the same assistant behind the Flow V3 project shown on the site's Work page. " +
    "Help visitors with questions about Joel's services, process, and pricing approach — a first working preview usually ships within days; cost depends entirely on scope, so point people to the contact form on this site for a real quote rather than guessing a number. " +
    "If asked something you genuinely don't know about Joel's specific business, say so plainly and point to the contact form. " +
    "Keep replies short and conversational — a few sentences, not an essay, unless the person clearly wants depth. " +
    "You can't actually send emails, book calls, or access Joel's calendar from this chat — be upfront about that and point to the contact form for those. " +
    "Never pretend to take an action you haven't actually taken.";

  let flowHistory = [];
  let flowSending = false;

  function initFlowLauncher() {
    const launcher = document.getElementById("flow-launcher");
    const panel = document.getElementById("flow-panel");
    const closeBtn = document.getElementById("flow-close");
    const form = document.getElementById("flow-form");
    const input = document.getElementById("flow-input");
    const messages = document.getElementById("flow-messages");
    if (!launcher || !panel || !form || !input || !messages) return;

    const setOpen = (open) => {
      panel.classList.toggle("open", open);
      launcher.classList.toggle("open", open);
      panel.setAttribute("aria-hidden", String(!open));
      if (open) setTimeout(() => input.focus(), 150);
    };

    launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
    closeBtn && closeBtn.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) setOpen(false);
    });

    function addMessage(text, role) {
      const el = document.createElement("div");
      el.className = `flow-msg flow-msg-${role}`;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
      return el;
    }

    function addThinking() {
      const el = document.createElement("div");
      el.className = "flow-msg flow-msg-thinking";
      el.innerHTML = "<span></span><span></span><span></span>";
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
      return el;
    }

    form.addEventListener("submit", async (e) => {
      // Enter key submits the <form> natively — no separate keydown
      // handler needed for that part.
      e.preventDefault();
      const text = input.value.trim();
      if (!text || flowSending) return;

      input.value = "";
      addMessage(text, "user");
      flowHistory.push({ role: "user", content: text });
      flowSending = true;
      input.disabled = true;

      const thinkingEl = addThinking();

      try {
        const res = await fetch(FLOW_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: FLOW_SYSTEM_PROMPT },
              ...flowHistory.slice(-16), // keep the request small; this is a widget, not the full app
            ],
          }),
        });

        thinkingEl.remove();

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.reply) throw new Error("empty reply");

        addMessage(data.reply, "bot");
        flowHistory.push({ role: "assistant", content: data.reply });
      } catch (err) {
        thinkingEl.remove();
        console.warn("[flow-chat] request failed:", err);
        addMessage(
          "Couldn't reach Flow just now — the connection might be down. Try again in a moment, or use the contact form above.",
          "error"
        );
      } finally {
        flowSending = false;
        input.disabled = false;
        input.focus();
      }
    });
  }

  /* ── LOADER ──────────────────────────────────────────────────────────── */
  window.addEventListener("load", () => {
    setTimeout(() => {
      const loader = document.getElementById("loader");
      if (loader) {
        loader.classList.add("hidden");
        setTimeout(() => (loader.style.display = "none"), 700);
      }
      animateHeroIn();
    }, 1400);
  });

  function animateHeroIn() {
    document.querySelectorAll("[data-hero-in]").forEach((el, i) => {
      setTimeout(() => el.classList.add("in-hero"), 120 + i * 110);
    });
    // scroll-indicator opacity is now owned by the --hero-p CSS var
    // (written every frame by cube.js), so nothing to do here.
  }

  /* ── NAVBAR SCROLL STATE ─────────────────────────────────────────────── */
  function initNavbar() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    const onScroll = () => {
      navbar.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ── ACTIVE NAV LINK (by page, since this is multi-page) ────────────── */
  function setActiveNav() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-link, .nav-mobile a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href === path || (path === "" && href === "index.html")) {
        a.classList.add("active");
      }
    });
  }

  /* ── MOBILE MENU ─────────────────────────────────────────────────────── */
  function initMobileMenu() {
    const hamburger = document.getElementById("nav-hamburger");
    const menu = document.getElementById("nav-mobile");
    const closeBtn = document.getElementById("nav-mobile-close");
    if (!hamburger || !menu) return;

    const toggle = (open) => {
      menu.classList.toggle("open", open);
      hamburger.setAttribute("aria-expanded", String(open));
    };
    hamburger.addEventListener("click", () => toggle(!menu.classList.contains("open")));
    closeBtn && closeBtn.addEventListener("click", () => toggle(false));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggle(false)));
  }

  /* ── SCROLL REVEAL ───────────────────────────────────────────────────── */
  function initReveal() {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || targets.length === 0) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* ── YEAR ────────────────────────────────────────────────────────────── */
  function initYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ── COUNTERS ────────────────────────────────────────────────────────── */
  function initCounters() {
    const counters = document.querySelectorAll("[data-count]");
    if (counters.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseFloat(el.getAttribute("data-count"));
          const suffix = el.getAttribute("data-suffix") || "";
          const dur = 1400;
          const start = performance.now();
          const step = (t) => {
            const p = Math.min((t - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => io.observe(c));
  }

  /* ── CONTACT FORM (Formspree) ───────────────────────────────────────────
     Replace FORM_ENDPOINT with your Formspree endpoint id. */
  function initForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const status = document.getElementById("form-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const original = btn.textContent;
      btn.textContent = "Sending…";
      btn.disabled = true;

      try {
        const res = await fetch(form.getAttribute("data-ajax-action") || form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          status.textContent = "Message sent — I'll reply within 24 hours.";
          status.style.color = "var(--cyan)";
          form.reset();
        } else {
          throw new Error("send failed");
        }
      } catch {
        status.textContent = "Something went wrong — email joelflowstack@gmail.com directly.";
        status.style.color = "#ff8080";
      } finally {
        btn.textContent = original;
        btn.disabled = false;
      }
    });
  }
})();
