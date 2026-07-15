/**
 * JOEL FLOWSTACK — shared.js
 * Injects the site nav + footer on every inner page (so there's one
 * place to edit links) and runs a lightweight scroll-reveal for any
 * element with [data-reveal]. No dependencies, no build step.
 */
(function () {
  "use strict";

  const NAV_LINKS = [
    { label: "Home",      href: "home.html" },
    { label: "About",     href: "about.html" },
    { label: "Services",  href: "services.html" },
    { label: "Portfolio", href: "portfolio.html" },
    { label: "Blog",      href: "blog.html" },
    { label: "Contact",   href: "contact.html" },
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
    return parts[parts.length - 1] || "home.html";
  }

  function injectNav() {
    const mount = document.getElementById("site-nav");
    if (!mount) return;
    const here = currentFile();

    const links = NAV_LINKS.map(l =>
      `<li><a href="${l.href}" ${l.href === here ? 'class="active" aria-current="page"' : ""}>${l.label}</a></li>`
    ).join("");

    mount.innerHTML = `
      <nav class="site-nav">
        <a class="logo" href="index.html"><img src="assets/logo.png" alt="" width="26" height="26" style="border-radius:6px;vertical-align:middle;margin-right:8px;" /><b>JOEL</b> FLOWSTACK</a>
        <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
        <ul id="nav-links">${links}</ul>
      </nav>`;

    const toggle = mount.querySelector(".nav-toggle");
    const list = mount.querySelector("#nav-links");
    toggle.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
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
          <div class="fine">&copy; ${new Date().getFullYear()} Joel Flowstack. Built with Three.js, no build step.</div>
        </div>
      </footer>`;
  }

  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
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

  document.addEventListener("DOMContentLoaded", () => {
    injectNav();
    injectFooter();
    initReveal();
    initTabs();
  });
})();
