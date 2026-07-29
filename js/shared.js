/**
 * JOEL FLOWSTACK — shared.js
 * Injects the site nav + footer on every inner page (so there's one
 * place to edit links) and runs a lightweight scroll-reveal for any
 * element with [data-reveal]. No dependencies, no build step.
 */
(function () {
  "use strict";

  const NAV_LINKS = [
    { label: "Home",      href: "home" },
    { label: "About",     href: "about" },
    { label: "Services",  href: "services" },
    { label: "Portfolio", href: "portfolio" },
    { label: "Blog",      href: "blog" },
    { label: "Contact",   href: "contact" },
  ];

  const SOCIALS = [
    { label: "X",        href: "https://x.com/Joelfowstack" },
    { label: "Instagram",href: "https://instagram.com/joel.fflowstack" },
    { label: "Threads",  href: "https://threads.net/@joel.fflowstack" },
    { label: "YouTube",  href: "https://youtube.com/@joelflowstack" },
    { label: "TikTok",   href: "https://tiktok.com/@joelflowstack" },
    { label: "Medium",   href: "https://medium.com/@joelflowstack" },
  ];

  function currentFile() {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || ""; // empty on the root/landing page — correctly matches none of NAV_LINKS, rather than incorrectly highlighting Home
  }

  function injectNav() {
    const mount = document.getElementById("site-nav");
    if (!mount) return;
    const here = currentFile();

    const linkItems = () => NAV_LINKS.map(l =>
      `<li><a href="${l.href}" ${l.href === here ? 'class="active" aria-current="page"' : ""}>${l.label}</a></li>`
    ).join("");

    // The mobile dropdown is deliberately built as a SEPARATE element,
    // a sibling of .site-nav rather than a child of it. .site-nav has
    // its own `transform` (for the GPU-layer scroll-flicker fix), and a
    // transform on an ancestor makes it the containing block for any
    // `position: fixed` descendant — exactly the same class of bug as
    // the documented perspective/position:fixed issue elsewhere in this
    // file. That silently made the old dropdown position itself relative
    // to the ~62px nav pill instead of the viewport, which is why it
    // wasn't visibly showing the page list. Keeping it outside .site-nav
    // (but still inside the plain, untransformed #site-nav mount) means
    // its position:fixed genuinely means "relative to the viewport".
    mount.innerHTML = `
      <nav class="site-nav">
        <a class="logo" href="/"><img src="assets/logo.png" alt="" width="26" height="26" style="border-radius:6px;vertical-align:middle;margin-right:8px;" /><b>JOEL</b> FLOWSTACK</a>
        <button id="cmdk-trigger" type="button" aria-label="Quick navigation (Ctrl+K)">
          <span>Search</span><kbd>&#8984;K</kbd>
        </button>
        <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
        <ul id="nav-links">${linkItems()}</ul>
      </nav>
      <div id="mobile-nav-overlay"><ul>${linkItems()}</ul></div>`;

    const toggle = mount.querySelector(".nav-toggle");
    const overlay = mount.querySelector("#mobile-nav-overlay");
    const setOpen = (open) => {
      overlay.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open ? "&#10005;" : "&#9776;"; // ✕ vs ☰ — a real close affordance, not the same icon doing double duty
    };
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!overlay.classList.contains("open"));
    });
    document.addEventListener("click", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (overlay.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
    // Closing the mobile menu on link tap avoids it staying open while
    // the browser's native view transition plays over the new page.
    overlay.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  }

  function injectFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    const socials = SOCIALS.map(s => `<a href="${s.href}" target="_blank" rel="noopener">${s.label}</a>`).join("");

    mount.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="foot-grid">
            <div>
              <div class="logo" style="margin-bottom:10px;"><img src="assets/logo.png" alt="" width="22" height="22" style="border-radius:5px;vertical-align:middle;margin-right:8px;" />JOEL FLOWSTACK</div>
              <a href="mailto:joelflowstack@gmail.com">joelflowstack@gmail.com</a>
            </div>
            <div class="socials">${socials}</div>
          </div>
          <div id="changelog-strip" class="changelog-strip" aria-label="Recently shipped on this site"></div>
          <div class="fine">&copy; ${new Date().getFullYear()} Joel Flowstack. Built with Three.js, no build step.</div>
        </div>
      </footer>`;

    loadChangelog();
  }

  // Most portfolio sites are static once launched — this one visibly
  // isn't. content/changelog.json is a plain, hand-editable list (same
  // "just a JSON file, no build step" philosophy as content/projects.json)
  // — add a line, it shows up site-wide via this one shared footer.
  async function loadChangelog() {
    const mount = document.getElementById("changelog-strip");
    if (!mount) return;
    try {
      const res = await fetch("content/changelog.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const entries = (data.entries || []).slice(0, 3);
      if (!entries.length) { mount.remove(); return; }
      mount.innerHTML = `
        <span class="changelog-label">Recently shipped on this site</span>
        <ul>${entries.map(e => `<li><span class="changelog-date">${e.date}</span>${e.text}</li>`).join("")}</ul>`;
    } catch (err) {
      console.warn("[changelog] couldn't load content/changelog.json:", err);
      mount.remove();
    }
  }

  function animateCount(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^(-?\d+)(.*)$/); // leading integer + suffix (%, +, etc.)
    if (!match) { el.classList.add("counted"); return; } // non-numeric stat, e.g. "GitHub → Vercel"
    const target = parseInt(match[1], 10);
    const suffix = match[2] || "";
    if (Math.abs(target) > 999 || Number.isNaN(target)) { el.classList.add("counted"); return; }
    const duration = 900;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.classList.add("counted");
    }
    requestAnimationFrame(frame);
  }

  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          entry.target.querySelectorAll(".stat .num").forEach(animateCount);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
  }

  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach((group) => {
      const buttons = group.querySelectorAll(".tab-btn");
      const panels = group.querySelectorAll(".tab-panel");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-tab");
          buttons.forEach(b => b.classList.toggle("active", b === btn));
          panels.forEach(p => p.classList.toggle("active", p.getAttribute("data-panel") === target));
        });
      });
    });
  }

  function initScrollProgress() {
    const bar = document.createElement("div");
    bar.id = "scroll-progress";
    document.body.appendChild(bar);
    const update = () => {
      const h = document.documentElement;
      const pct = h.scrollHeight > h.clientHeight
        ? (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100
        : 0;
      bar.style.width = pct + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Typewriter effect for the landing hero's left-side brand block — types
  // the company name once, then cycles through a rotating set of taglines
  // (type out, pause, delete, next) indefinitely. No-op on any page
  // without these elements, and skips straight to final text for anyone
  // with reduced-motion set.
  // Cross-document view transitions can abort silently — no error, no
  // visual sign, just a normal instant navigation as if the CSS wasn't
  // there at all. This logs the actual reason to the console when that
  // happens, so "it's not working" becomes a concrete, checkable cause
  // instead of a guess.
  window.addEventListener("pageswap", (event) => {
    if (event.viewTransition) {
      event.viewTransition.finished.catch((err) => {
        console.warn("[view-transition] outgoing transition aborted:", err.name, err.message);
      });
    }
  });
  window.addEventListener("pagereveal", (event) => {
    if (event.viewTransition) {
      event.viewTransition.finished.catch((err) => {
        console.warn("[view-transition] incoming transition aborted:", err.name, err.message);
      });
    }
  });

  function initHeroTypewriter() {
    const nameEl = document.querySelector(".hero-brand-name");
    const sloganEl = document.querySelector(".hero-brand-slogan");
    if (!nameEl || !sloganEl) return;

    const companyName = "JOEL FLOWSTACK";
    const taglines = [
      "Building workflows that scale.",
      "Interfaces that think back.",
      "One person. Every layer, top to bottom.",
      "The bots ship. The workflows don't break.",
      "3D web. Real intelligence.",
      "Built once. No handoffs, no drift.",
    ];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nameEl.textContent = companyName;
      sloganEl.textContent = taglines[0];
      return;
    }

    nameEl.textContent = "";
    sloganEl.textContent = "";

    let ci = 0;
    function typeName() {
      if (ci <= companyName.length) {
        nameEl.textContent = companyName.slice(0, ci) + (ci < companyName.length ? "▍" : "");
        ci++;
        setTimeout(typeName, 55);
      } else {
        nameEl.textContent = companyName;
        setTimeout(() => typeTagline(0), 300);
      }
    }

    function typeTagline(ti) {
      const text = taglines[ti];
      let i = 0;
      function type() {
        if (i <= text.length) {
          sloganEl.textContent = text.slice(0, i) + (i < text.length ? "▍" : "");
          i++;
          setTimeout(type, 42);
        } else {
          setTimeout(erase, 1900);
        }
      }
      function erase() {
        if (i >= 0) {
          sloganEl.textContent = text.slice(0, i) + "▍";
          i--;
          setTimeout(erase, 22);
        } else {
          setTimeout(() => typeTagline((ti + 1) % taglines.length), 350);
        }
      }
      type();
    }

    typeName();
  }

  function initNavScrollState() {
    let lastY = window.scrollY;
    let idleTimer = null;
    const update = () => {
      const nav = document.querySelector(".site-nav");
      if (!nav) return;
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 40);

      if (y <= 40) {
        nav.classList.remove("nav-faded"); // always fully visible near the top
      } else if (y < lastY) {
        // Scrolling up — the person is looking back at content the pill
        // would otherwise sit on top of, so fade it out of the way.
        nav.classList.add("nav-faded");
      } else if (y > lastY) {
        nav.classList.remove("nav-faded");
      }
      lastY = y;

      // Never leave it stuck faded — settle back to full opacity once
      // scrolling actually stops, so it's always reachable just by
      // pausing (the CSS hover rule covers reaching it mid-fade too).
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => nav.classList.remove("nav-faded"), 900);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Cube-face page transitions — like switching virtual desktops on a
  // Compiz-style desktop cube: the outgoing page rotates away as if it's
  // one face of a box, the incoming page (a separate page load) rotates
  // in from the opposite face. Since these are genuinely different page
  // loads (not client-side routing), the two halves coordinate through
  // one sessionStorage flag: the outgoing click decides a direction and
  // stashes it; the incoming page reads it on load and animates in.
  // Page-to-page transitions are now handled natively by the browser's
  // View Transitions API (see the @view-transition rule in global.css) —
  // no click interception or manual routing needed here anymore. This
  // list is kept only for prefetching order/targets below.
  const PAGE_ORDER = ["home", "about", "services", "portfolio", "blog", "contact"];

  // Prefetches every page in the background shortly after load, so by the
  // time someone actually clicks a nav link, the browser already has it
  // cached and the real navigation underneath the view transition is
  // close to instant.
  function prefetchPages() {
    const here = window.location.pathname.split("/").pop() || "";
    const targets = ["/", ...PAGE_ORDER].filter(p => p !== here);
    setTimeout(() => {
      targets.forEach((p) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = p;
        document.head.appendChild(link);
      });
    }, 1200); // waits until shortly after this page's own load finishes, so it doesn't compete with it for bandwidth
  }

  // On the landing page only (where #scroll-hero exists), the nav is
  // genuinely removed from the DOM — not hidden via CSS — while the cube
  // hero is on screen. It only gets created once the person has scrolled
  // past it into regular page content, i.e. once they've come out the
  // "back door" below the cube. Real erasure, not a display/opacity trick.
  function initHeroNavVisibility() {
    const hero = document.getElementById("scroll-hero");
    const mount = document.getElementById("site-nav");
    if (!hero || !mount) return; // not the landing page — nav stays as normal

    let navExists = true;
    const eraseNav = () => { if (navExists) { mount.innerHTML = ""; navExists = false; } };
    const restoreNav = () => { if (!navExists) { injectNav(); navExists = true; } };

    eraseNav(); // starts fully removed, before any scroll

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const scrolled = -hero.getBoundingClientRect().top;
      const pastHero = total > 0 ? scrolled >= total - 4 : true;
      if (pastHero) restoreNav(); else eraseNav();
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Lets specific same-origin links opt OUT of the page-transition animation
  // (e.g. the index.html "backdoor" card grid) while every other normal
  // nav link still gets it. A plain <a href> click is real, user-initiated
  // navigation, so the browser fires the transition by default unless told
  // otherwise for that specific navigation — a sessionStorage flag set at
  // click time, read once in pageswap, does that per-navigation opt-out.
  function initTransitionSkipping() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-no-transition]");
      if (link) sessionStorage.setItem("skip-vt", "1");
    });
    window.addEventListener("pageswap", (event) => {
      if (event.viewTransition && sessionStorage.getItem("skip-vt")) {
        sessionStorage.removeItem("skip-vt");
        event.viewTransition.skipTransition();
      }
    });
  }

  // ---------------------------------------------------------------
  // LEAD CAPTURE POPUP — shows once per new visitor, a few seconds
  // after landing on any page. Closing it (X, "No thanks", backdrop
  // click, or Escape) is treated as a real answer, not a snooze: it
  // sets the same "don't show again" flag as actually submitting, so
  // no one — including Joel testing his own site — gets nagged by it
  // on a later visit.
  //
  // Submits to Flow V3's existing /api/chat endpoint with
  // { action: "capture_lead" }, a small addition to that file's
  // handler (not a new serverless function — Vercel Hobby's 12-
  // function cap on that project is already maxed) that appends to
  // content/leads.json in this repo via GitHub's Contents API. Open
  // that file on GitHub anytime to see everyone who's signed up.
  // ---------------------------------------------------------------
  const LEAD_API_URL = "https://flow-v3-mu.vercel.app/api/chat";
  const LEAD_STORAGE_KEY = "leadPromptDone";

  function initLeadCapture() {
    if (localStorage.getItem(LEAD_STORAGE_KEY)) return;
    if (document.title.startsWith("404")) return; // an error page is a bad first impression to pitch on
    setTimeout(showLeadModal, 5000);
  }

  function markLeadPromptDone() {
    try { localStorage.setItem(LEAD_STORAGE_KEY, "1"); } catch (_) { /* private browsing — fine, just may reappear next visit */ }
  }

  function showLeadModal() {
    // Don't stack on top of the mobile menu or the command palette if
    // either happens to be open right as the timer fires.
    if (document.querySelector("#mobile-nav-overlay.open, #cmdk-overlay.open")) return;

    const overlay = document.createElement("div");
    overlay.id = "lead-modal-overlay";
    overlay.innerHTML = `
      <div class="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        <button type="button" class="lead-modal-close" aria-label="Close">&#10005;</button>
        <span class="eyebrow">Have a project in mind?</span>
        <h3 id="lead-modal-title">Leave your email — I'll reach out.</h3>
        <form id="lead-form" novalidate>
          <input type="text" name="website" class="lead-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <input type="text" name="name" placeholder="Name (optional)" autocomplete="name" />
          <input type="email" name="email" placeholder="Email" autocomplete="email" required />
          <select name="interest">
            <option value="">What are you interested in? (optional)</option>
            <option>3D website</option>
            <option>AI chatbot / agent</option>
            <option>Discord / Telegram / WhatsApp bot</option>
            <option>n8n automation</option>
            <option>Something else</option>
          </select>
          <button type="submit" class="btn btn-solid">Keep me posted</button>
          <p class="lead-error" hidden></p>
        </form>
        <button type="button" class="lead-no-thanks">No thanks</button>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      overlay.classList.remove("open");
      markLeadPromptDone();
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector(".lead-modal-close").addEventListener("click", close);
    overlay.querySelector(".lead-no-thanks").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); }
    });

    const form = overlay.querySelector("#lead-form");
    const errorEl = overlay.querySelector(".lead-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending\u2026";
      errorEl.hidden = true;

      try {
        const res = await fetch(LEAD_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "capture_lead",
            lead: {
              name: fd.get("name") || "",
              email: fd.get("email") || "",
              interest: fd.get("interest") || "",
              page: location.pathname,
              honeypot: fd.get("website") || "",
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Something went wrong.");

        overlay.querySelector(".lead-modal").innerHTML = `<p class="lead-thanks">Thanks \u2014 I'll be in touch.</p>`;
        markLeadPromptDone();
        setTimeout(close, 1800);
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Keep me posted";
        errorEl.textContent = "Couldn't send that \u2014 try again, or just email joelflowstack@gmail.com directly.";
        errorEl.hidden = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectNav();
    injectFooter();
    initReveal();
    initTabs();
    initScrollProgress();
    // Floating-glass particles now live inside cube.js's own Three.js
    // scene (genuinely behind the cube, properly occluded by it) rather
    // than as a separate flat 2D overlay — see buildFloatingGlass() there.
    initNavScrollState();
    initHeroTypewriter();
    initHeroNavVisibility();
    initTransitionSkipping();
    initLeadCapture();
    prefetchPages();
  });
})();
