/**
 * JOEL FLOWSTACK — enhance.js
 * Three independent polish features, each safe to fail on its own:
 *   1. Cmd/Ctrl+K command palette — jump to any page or trigger a
 *      quick action (open Flow chat, email Joel) without leaving the
 *      keyboard.
 *   2. Magnetic buttons — .btn elements pull slightly toward the
 *      cursor on hover.
 *   3. Custom cursor — a small glowing dot + trailing ring, replacing
 *      the system cursor.
 * (2) and (3) are gated behind a real-mouse check (`hover: hover` and
 * `pointer: fine`) so touch devices are completely untouched — no
 * custom cursor, no magnetic pull, just the normal system behavior.
 * The command palette works everywhere the keyboard shortcut can be
 * typed; on touch devices it's reachable via the "Search" pill in nav.
 */
(function () {
  "use strict";

  const PAGES = [
    { label: "Home", href: "home" },
    { label: "Services", href: "services" },
    { label: "Portfolio", href: "portfolio" },
    { label: "About", href: "about" },
    { label: "Blog", href: "blog" },
    { label: "Contact", href: "contact" },
  ];

  const ACTIONS = [
    { label: "Chat with Flow V3", hint: "Action", run: () => { const l = document.getElementById("flowbot-launcher"); if (l) l.click(); } },
    { label: "Email Joel", hint: "Action", run: () => { window.location.href = "mailto:joelflowstack@gmail.com"; } },
  ];

  // ---------- Command palette (works on every device) ----------
  function buildPalette() {
    const overlay = document.createElement("div");
    overlay.id = "cmdk-overlay";
    overlay.innerHTML = `
      <div id="cmdk-panel" role="dialog" aria-label="Quick navigation">
        <input id="cmdk-input" type="text" placeholder="Jump to a page or action..." autocomplete="off" />
        <div id="cmdk-list"></div>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#cmdk-input");
    const list = overlay.querySelector("#cmdk-list");
    const allItems = [
      ...PAGES.map(p => ({ label: p.label, hint: "Page", go: () => (window.location.href = p.href) })),
      ...ACTIONS.map(a => ({ label: a.label, hint: a.hint, go: a.run })),
    ];
    let activeIndex = 0;
    let shown = allItems;

    function render(filter) {
      const q = (filter || "").toLowerCase();
      shown = allItems.filter(i => i.label.toLowerCase().includes(q));
      list.innerHTML = shown.length
        ? shown.map((i, idx) =>
            `<div class="cmdk-item${idx === activeIndex ? " active" : ""}" data-idx="${idx}">
               <span>${i.label}</span><span class="cmdk-hint">${i.hint}</span>
             </div>`
          ).join("")
        : `<div class="cmdk-empty">No matches</div>`;
    }

    function open() {
      overlay.classList.add("open");
      input.value = "";
      activeIndex = 0;
      render("");
      setTimeout(() => input.focus(), 10);
    }
    function close() {
      overlay.classList.remove("open");
    }

    input.addEventListener("input", () => { activeIndex = 0; render(input.value); });

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, shown.length - 1);
        render(input.value);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render(input.value);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const chosen = shown[activeIndex];
        if (chosen) { close(); chosen.go(); }
      } else if (e.key === "Escape") {
        close();
      }
    });

    list.addEventListener("click", (e) => {
      const el = e.target.closest(".cmdk-item");
      if (!el) return;
      const chosen = shown[Number(el.dataset.idx)];
      if (chosen) { close(); chosen.go(); }
    });

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        overlay.classList.contains("open") ? close() : open();
      }
    });

    const trigger = document.getElementById("cmdk-trigger");
    if (trigger) trigger.addEventListener("click", open);
  }

  // ---------- Magnetic buttons (desktop only) ----------
  // Same batching fix as the cursor below: mousemove only updates plain
  // numbers, the actual style write happens once per frame.
  function initMagnetic() {
    const buttons = Array.from(document.querySelectorAll(".btn"));
    if (!buttons.length) return;
    const state = new Map(buttons.map(btn => [btn, { active: false, x: 0, y: 0 }]));

    buttons.forEach((btn) => {
      btn.addEventListener("mouseenter", () => { state.get(btn).active = true; });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const s = state.get(btn);
        s.x = (e.clientX - r.left - r.width / 2) * 0.18;
        s.y = (e.clientY - r.top - r.height / 2) * 0.28;
      }, { passive: true });
      btn.addEventListener("mouseleave", () => {
        const s = state.get(btn);
        s.active = false;
        btn.style.transform = "";
      });
    });

    let paused = document.hidden;
    document.addEventListener("visibilitychange", () => { paused = document.hidden; });

    (function loop() {
      if (!paused) {
        buttons.forEach((btn) => {
          const s = state.get(btn);
          if (s.active) btn.style.transform = `translate(${s.x}px, ${s.y}px)`;
        });
      }
      requestAnimationFrame(loop);
    })();
  }

  // ---------- Custom cursor (desktop only) ----------
  // A genuine small CSS 3D cube (6 real faces via preserve-3d, not a
  // flat icon) — matches how the site treats the nebula/particles as
  // real 3D objects rather than flat overlays. Position is read from
  // mousemove into two plain variables (near-zero cost) and only
  // written to the DOM once per animation frame inside the rAF loop —
  // that batching is the actual fix for the lag: the old version wrote
  // to style.transform on every raw mouse event, which can fire far
  // more often than the screen can even redraw.
  function initCursor() {
    document.documentElement.classList.add("custom-cursor-on");
    const cube = document.createElement("div");
    cube.id = "cursor-cube";
    cube.innerHTML = `
      <div class="cc-spin">
        <span class="cc-face cc-front"></span>
        <span class="cc-face cc-back"></span>
        <span class="cc-face cc-right"></span>
        <span class="cc-face cc-left"></span>
        <span class="cc-face cc-top"></span>
        <span class="cc-face cc-bottom"></span>
      </div>`;
    document.body.appendChild(cube);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;

    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

    document.addEventListener("mouseover", (e) => {
      if (e.target.closest("a, button, .card")) cube.classList.add("hovering");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("a, button, .card")) cube.classList.remove("hovering");
    });

    let paused = document.hidden;
    document.addEventListener("visibilitychange", () => { paused = document.hidden; });

    (function loop() {
      if (!paused) {
        cx += (mx - cx) * 0.35;
        cy += (my - cy) * 0.35;
        cube.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      }
      requestAnimationFrame(loop);
    })();
  }

  // ---------- Case-study terminal (portfolio.html only — gated on the
  // element existing, same pattern shared.js already uses for #scroll-hero
  // vs .page-hero specific behavior) ----------
  const TERMINAL_SCRIPT = [
    { who: "visitor", text: "what makes flow v3 fast?" },
    { who: "flow", text: "Low-latency LPU inference, plus automatic multi-provider failover — one provider hiccup never means downtime." },
    { who: "visitor", text: "can you post to social media?" },
    { who: "flow", text: "In the full app, yes — camera, image-gen, and social posting are all real tools I can call. This site's just the chat demo." },
  ];

  function initTerminal() {
    const body = document.getElementById("ft-body");
    if (!body) return;

    let i = 0;
    function typeLine(entry, done) {
      const line = document.createElement("div");
      line.className = "ft-line " + entry.who;
      const prompt = document.createElement("span");
      prompt.className = "ft-prompt";
      prompt.textContent = entry.who === "visitor" ? "visitor $ " : "flow $ ";
      const textEl = document.createElement("span");
      line.appendChild(prompt);
      line.appendChild(textEl);
      body.appendChild(line);

      let charIdx = 0;
      const speed = entry.who === "visitor" ? 42 : 16;
      (function type() {
        textEl.textContent += entry.text[charIdx];
        charIdx++;
        body.scrollTop = body.scrollHeight;
        if (charIdx < entry.text.length) {
          setTimeout(type, speed);
        } else {
          setTimeout(done, entry.who === "visitor" ? 500 : 1500);
        }
      })();
    }

    function playNext() {
      if (i >= TERMINAL_SCRIPT.length) {
        setTimeout(() => { body.innerHTML = ""; i = 0; playNext(); }, 2400);
        return;
      }
      typeLine(TERMINAL_SCRIPT[i], () => { i++; playNext(); });
    }
    playNext();
  }

  // ---------------------------------------------------------------
  // SERVICE QUIZ — two short questions max, always ending at one of
  // the four real services already listed above it on the page (or a
  // plain "let's talk" fallback). No-op on any page without
  // #service-quiz, so it's safe to call everywhere.
  // ---------------------------------------------------------------
  const QUIZ_STEPS = {
    start: {
      q: "What best describes what you need?",
      options: [
        { label: "A site that actually looks different", next: "web" },
        { label: "Something that talks to people", next: "channel" },
        { label: "Connect tools I already use", next: "auto" },
        { label: "Not sure yet", next: "unsure" },
      ],
    },
    channel: {
      q: "Where should it live?",
      options: [
        { label: "My own website or app", next: "ai" },
        { label: "Discord, Telegram, or WhatsApp", next: "bots" },
      ],
    },
  };
  const QUIZ_RESULTS = {
    web: { title: "3D interactive websites", pitch: "Three.js-driven sites where the visual is load-bearing, not decorative — scroll-driven scenes, WebGL heroes, product visualizers.", tab: "web" },
    ai: { title: "AI chatbots & agents", pitch: "Assistants wired to production LLM infrastructure with real conversation context and automatic reliability failover.", tab: "ai" },
    bots: { title: "Discord / Telegram / WhatsApp bots", pitch: "Community bots, support bots, and inquiry routers built directly on each platform's own API.", tab: "bots" },
    auto: { title: "n8n workflow automation", pitch: "Connecting the tools you already use — forms, CRMs, spreadsheets, notifications — so the manual steps between them disappear.", tab: "auto" },
    unsure: { title: "Let's just talk it through", pitch: "Most projects turn out more scoped than they first seem — describe what you're picturing and it'll get sorted honestly from there.", tab: null },
  };

  function initServiceQuiz() {
    const mount = document.getElementById("service-quiz");
    if (!mount) return;

    function renderStep(key) {
      const step = QUIZ_STEPS[key];
      mount.innerHTML = `
        <p class="quiz-q">${step.q}</p>
        <div class="quiz-options">
          ${step.options.map((o, i) => `<button type="button" class="quiz-opt" data-i="${i}">${o.label}</button>`).join("")}
        </div>`;
      mount.querySelectorAll(".quiz-opt").forEach((btn, i) => {
        btn.addEventListener("click", () => {
          const next = step.options[i].next;
          if (QUIZ_STEPS[next]) renderStep(next); else renderResult(next);
        });
      });
    }

    function renderResult(key) {
      const r = QUIZ_RESULTS[key];
      const href = "contact?" + new URLSearchParams({ service: key }).toString();
      mount.innerHTML = `
        <div class="quiz-result">
          <span class="quiz-result-label">Sounds like</span>
          <h3>${r.title}</h3>
          <p>${r.pitch}</p>
          <div class="quiz-actions">
            <a class="btn btn-solid" href="${href}">Start the conversation</a>
            ${r.tab ? `<button type="button" class="btn quiz-details">See full details</button>` : ""}
            <button type="button" class="quiz-restart">Start over</button>
          </div>
        </div>`;
      const detailsBtn = mount.querySelector(".quiz-details");
      if (detailsBtn) {
        detailsBtn.addEventListener("click", () => {
          const tabBtn = document.querySelector(`.tab-btn[data-tab="${r.tab}"]`);
          if (!tabBtn) return;
          tabBtn.click(); // reuses initTabs' own click handler in shared.js — no duplicate switching logic here
          tabBtn.closest("section").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      mount.querySelector(".quiz-restart").addEventListener("click", () => renderStep("start"));
    }

    renderStep("start");
  }

  // ---------------------------------------------------------------
  // EASTER EGG — the classic Konami code (↑↑↓↓←→←→BA). Purely a
  // delight, not surfaced anywhere in the UI. Ignored while focus is
  // in a text field so someone typing "a" or "b" in the contact form
  // never accidentally trips it.
  // ---------------------------------------------------------------
  function initEasterEgg() {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let pos = 0;
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === seq[pos]) {
        pos++;
        if (pos === seq.length) { pos = 0; triggerEasterEgg(); }
      } else {
        pos = key === seq[0] ? 1 : 0;
      }
    });
  }

  // Maps the quiz's ?service= key (see initServiceQuiz) to the existing
  // #project-type select on contact.html — no new field, just a
  // same-page connection between the two. No-op on any page without
  // #project-type or without the query param.
  function initContactPrefill() {
    const select = document.getElementById("project-type");
    if (!select) return;
    const service = new URLSearchParams(location.search).get("service");
    if (!service) return;
    const optionText = {
      web: "3D website",
      ai: "AI chatbot / agent",
      bots: "Discord / Telegram / WhatsApp bot",
      auto: "n8n automation",
    }[service];
    if (!optionText) return; // "unsure" falls through here on purpose — no wrong guess is better than a real one
    const match = Array.from(select.options).find(o => o.text === optionText);
    if (match) select.value = match.value;
    const message = document.getElementById("message");
    if (message) message.focus();
  }

  function triggerEasterEgg() {
    const colors = ["#3fa9e8", "#8b5cf6", "#eef8ff", "#7c3aed"];
    for (let i = 0; i < 28; i++) {
      const bit = document.createElement("div");
      bit.className = "egg-confetti";
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.4) + "s";
      bit.style.animationDuration = (1.6 + Math.random() * 1.2) + "s";
      document.body.appendChild(bit);
      bit.addEventListener("animationend", () => bit.remove());
    }
    const toast = document.createElement("div");
    toast.className = "egg-toast";
    toast.textContent = "You found it. — Joel";
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 20);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildPalette();
    initTerminal();
    initServiceQuiz();
    initContactPrefill();
    initEasterEgg();
    // Real-mouse check — matchMedia here, not viewport width, since a
    // touch laptop or a plugged-in mouse on a tablet should still get
    // these; a narrow desktop window should NOT lose them.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      initMagnetic();
      initCursor();
    }
  });
})();
