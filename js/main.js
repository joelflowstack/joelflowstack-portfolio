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
  }

  /* ── FLOW LAUNCHER (placeholder) ─────────────────────────────────────────
     When the real Flow bot is ready: replace the body of this click
     handler with whatever mounts/opens the actual widget into
     #flow-widget-root, and delete the tooltip fallback below it. */
  function initFlowLauncher() {
    const btn = document.getElementById("flow-launcher");
    if (!btn) return;
    btn.addEventListener("click", () => {
      console.info("[flow-launcher] Flow bot isn't wired in yet — this is the placeholder click handler in js/main.js.");
      btn.animate(
        [{ transform: "scale(1)" }, { transform: "scale(0.9)" }, { transform: "scale(1)" }],
        { duration: 260, easing: "ease-out" }
      );
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
