/* shared.js — nav, footer, reveal. Auto-detects root path. */
(function () {
  var isPages = location.pathname.indexOf('/pages/') > -1;
  var root = isPages ? '../' : '';
  var cur  = location.pathname.split('/').pop() || 'index.html';

  /* ── Nav ── */
  var links = [
    ['home.html',      'Home'],
    ['about.html',     'About'],
    ['services.html',  'Services'],
    ['portfolio.html', 'Portfolio'],
    ['blog.html',      'Blog'],
    ['contact.html',   'Contact'],
  ];

  var liHTML = links.map(function(l) {
    var active = cur === l[0] ? ' class="active"' : '';
    return '<li><a href="' + root + 'pages/' + l[0] + '"' + active + '>' + l[1] + '</a></li>';
  }).join('');

  var mobHTML = links.map(function(l) {
    return '<a href="' + root + 'pages/' + l[0] + '">' + l[1] + '</a>';
  }).join('');

  var footLinks = links.map(function(l) {
    return '<a href="' + root + 'pages/' + l[0] + '">' + l[1] + '</a>';
  }).join('');

  document.body.insertAdjacentHTML('afterbegin',
    '<nav class="nav" id="jfNav">' +
      '<div class="nav-in">' +
        '<a href="' + root + 'index.html" class="nav-logo"><img src="' + root + 'assets/logo.png" alt="JF"/><span>Joel Flowstack</span></a>' +
        '<ul class="nav-links">' + liHTML + '</ul>' +
        '<div style="display:flex;align-items:center;gap:.75rem">' +
          '<a href="' + root + 'pages/contact.html" class="btn btn-p btn-sm nav-cta-d" style="display:inline-flex">Let\'s Build →</a>' +
          '<button class="nav-ham" id="jfHam"><span></span><span></span><span></span></button>' +
        '</div>' +
      '</div>' +
      '<div class="nav-mob" id="jfMob">' + mobHTML + '</div>' +
    '</nav>'
  );

  document.body.insertAdjacentHTML('beforeend',
    '<footer class="footer">' +
      '<div class="container foot-in">' +
        '<div class="foot-logo"><img src="' + root + 'assets/logo.png" alt="JF"/><span>Joel Flowstack</span></div>' +
        '<nav class="foot-links">' + footLinks + '</nav>' +
        '<p class="foot-copy">© 2026 Joel Flowstack</p>' +
      '</div>' +
    '</footer>'
  );

  /* ── Nav scroll ── */
  window.addEventListener('scroll', function() {
    document.getElementById('jfNav').classList.toggle('solid', window.scrollY > 60);
  }, { passive: true });

  /* ── Hamburger ── */
  document.getElementById('jfHam').addEventListener('click', function() {
    document.getElementById('jfMob').classList.toggle('open');
  });

  /* ── Scroll reveal ── */
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function(el) { obs.observe(el); });
})();
