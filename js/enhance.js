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

  document.addEventListener("DOMContentLoaded", () => {
    buildPalette();
    initTerminal();
    // Real-mouse check — matchMedia here, not viewport width, since a
    // touch laptop or a plugged-in mouse on a tablet should still get
    // these; a narrow desktop window should NOT lose them.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      initMagnetic();
      initCursor();
    }
  });
})();
