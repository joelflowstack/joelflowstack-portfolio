/**
 * FLOW BOT WIDGET + ANALYTICS — v2 (defensive build)
 * Wrapped in try/catch with console logging at every stage
 * so failures are visible instead of silent.
 */
(function () {
  'use strict';

  try {
    console.log('[Flow Widget] Initializing...');

    /* ═══════════════════════════════════
       CONFIG
    ═══════════════════════════════════ */
    var BOT_ENDPOINT = 'https://flow-v3-mu.vercel.app/api/chat';
    var SYSTEM_MSG = 'You are Flow, the AI assistant for Joel Flowstack. Joel builds 3D websites, Discord/Telegram/WhatsApp bots, AI automations, and n8n workflows. Help visitors understand the services, answer questions, and guide them to the contact page. Be concise and friendly. Keep replies under 3 sentences unless detail is asked for. For pricing questions, say it depends on scope and suggest getting in touch.';

    /* ═══════════════════════════════════
       ANALYTICS
    ═══════════════════════════════════ */
    var _t0 = Date.now();
    var _scrollMax = 0;
    var _clicks = 0;
    var _msgs = 0;
    var _engaged = false;

    window.addEventListener('scroll', function () {
      try {
        var d = document.documentElement;
        var p = Math.round(window.scrollY / Math.max(d.scrollHeight - d.clientHeight, 1) * 100);
        if (p > _scrollMax) { _scrollMax = p; if (p > 20) _engaged = true; }
      } catch (e) {}
    }, { passive: true });

    document.addEventListener('click', function () { _clicks++; _engaged = true; });

    window.addEventListener('beforeunload', function () {
      try {
        var sec = Math.round((Date.now() - _t0) / 1000);
        console.info('[JF Analytics]', {
          event: 'page_exit', page: location.href, title: document.title,
          time_on_page: sec, scroll_depth: _scrollMax, clicks: _clicks,
          messages: _msgs, bounced: !_engaged || sec < 8,
          ts: new Date().toISOString()
        });
      } catch (e) {}
    });

    function logEvent(name, extra) {
      try {
        var d = { event: name, page: location.href, ts: new Date().toISOString() };
        for (var k in (extra || {})) d[k] = extra[k];
        console.info('[JF Analytics]', d);
      } catch (e) {}
    }

    logEvent('page_view', { referrer: document.referrer });

    /* ═══════════════════════════════════
       STYLES
    ═══════════════════════════════════ */
    var cssText =
      '#jfBtn{position:fixed;bottom:1.6rem;right:1.6rem;z-index:2147483000;width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;padding:0;background:linear-gradient(135deg,#7B61FF,#06B6D4);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 26px rgba(123,97,255,.55);transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;outline:none;}' +
      '#jfBtn:hover{transform:scale(1.1);box-shadow:0 10px 34px rgba(123,97,255,.72)}' +
      '#jfBtn.open{transform:rotate(45deg) scale(1.05)}' +
      '#jfBtn::before{content:"";position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(123,97,255,.3);animation:jfPulse 2.8s ease-in-out infinite;}' +
      '@keyframes jfPulse{0%,100%{transform:scale(1);opacity:.8}60%{transform:scale(1.22);opacity:0}}' +
      '#jfBtn svg{width:22px;height:22px;fill:#fff;flex-shrink:0;transition:opacity .2s;pointer-events:none}' +
      '#jfDot{position:absolute;top:1px;right:1px;width:12px;height:12px;border-radius:50%;background:#10B981;border:2px solid #000;animation:jfBlink 3.5s ease-in-out infinite;pointer-events:none}' +
      '@keyframes jfBlink{0%,82%,100%{opacity:1}90%{opacity:.15}}' +
      '#jfTip{position:fixed;bottom:5rem;right:1.6rem;z-index:2147482999;background:rgba(8,6,18,.94);backdrop-filter:blur(14px);border:1px solid rgba(123,97,255,.3);border-radius:10px;padding:.55rem .95rem;font-family:"Space Grotesk",system-ui,sans-serif;font-size:.78rem;font-weight:500;color:#EDF0FF;white-space:nowrap;pointer-events:none;opacity:0;transform:translateY(5px);transition:opacity .22s,transform .22s;}' +
      '#jfTip.show{opacity:1;transform:translateY(0)}' +
      '#jfTip::after{content:"";position:absolute;bottom:-5px;right:18px;width:9px;height:5px;background:rgba(8,6,18,.94);clip-path:polygon(0 0,100% 0,50% 100%);}' +
      '#jfPanel{position:fixed;bottom:4.8rem;right:1.6rem;z-index:2147482998;width:min(370px,calc(100vw - 1.6rem));height:min(540px,calc(100dvh - 7rem));border-radius:18px;overflow:hidden;display:flex;flex-direction:column;background:#08060f;border:1px solid rgba(123,97,255,.25);box-shadow:0 22px 68px rgba(0,0,0,.72),0 0 0 1px rgba(123,97,255,.07);opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transition:opacity .26s ease,transform .26s cubic-bezier(.34,1.56,.64,1);}' +
      '#jfPanel.open{opacity:1;transform:none;pointer-events:all}' +
      '#jfHead{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;flex-shrink:0;background:rgba(6,4,14,.98);border-bottom:1px solid rgba(123,97,255,.15);}' +
      '.jfLogo{font-family:"Space Mono",monospace;font-size:1.05rem;font-weight:700;background:linear-gradient(130deg,#A78BFA,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}' +
      '.jfStatus{display:flex;align-items:center;gap:.35rem;font-family:"Space Mono",monospace;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:#10B981;}' +
      '.jfStatus::before{content:"";width:5px;height:5px;border-radius:50%;background:#10B981;animation:jfBlink 3.5s ease-in-out infinite;}' +
      '#jfClose{width:26px;height:26px;border-radius:7px;border:none;cursor:pointer;background:rgba(255,255,255,.06);color:rgba(255,255,255,.45);display:flex;align-items:center;justify-content:center;font-size:.88rem;transition:.18s;padding:0;font-family:inherit;}' +
      '#jfClose:hover{background:rgba(255,255,255,.14);color:#fff}' +
      '#jfMsgs{flex:1;overflow-y:auto;padding:.85rem .85rem .5rem;display:flex;flex-direction:column;gap:.65rem;}' +
      '#jfMsgs::-webkit-scrollbar{width:3px}#jfMsgs::-webkit-scrollbar-thumb{background:rgba(123,97,255,.18);border-radius:2px}' +
      '.jfMsg{display:flex;flex-direction:column;max-width:90%;animation:jfIn .2s ease both;}' +
      '@keyframes jfIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}' +
      '.jfMsg.bot{align-self:flex-start}.jfMsg.user{align-self:flex-end}' +
      '.jfMsgName{font-family:"Space Mono",monospace;font-size:.56rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(167,139,250,.5);margin-bottom:.22rem;padding-left:.08rem;}' +
      '.jfMsg.user .jfMsgName{text-align:right;color:rgba(255,255,255,.38)}' +
      '.jfBubble{padding:.55rem .85rem;border-radius:13px;font-family:"Space Grotesk",system-ui,sans-serif;font-size:.875rem;line-height:1.55;word-break:break-word;}' +
      '.jfMsg.bot .jfBubble{background:rgba(123,97,255,.12);border:1px solid rgba(123,97,255,.18);color:#E6DFFF;border-bottom-left-radius:3px;}' +
      '.jfMsg.user .jfBubble{background:linear-gradient(135deg,#7B61FF,#5B41DF);color:#fff;border-bottom-right-radius:3px;}' +
      '#jfTyping{display:none;align-self:flex-start;background:rgba(123,97,255,.1);border:1px solid rgba(123,97,255,.16);border-radius:13px;border-bottom-left-radius:3px;padding:.5rem .8rem;gap:.32rem;align-items:center;margin:0 .85rem;}' +
      '#jfTyping.show{display:flex}' +
      '#jfTyping span{width:6px;height:6px;border-radius:50%;background:rgba(167,139,250,.55);animation:jfDot 1.2s ease-in-out infinite;}' +
      '#jfTyping span:nth-child(2){animation-delay:.2s}#jfTyping span:nth-child(3){animation-delay:.4s}' +
      '@keyframes jfDot{0%,80%,100%{transform:scale(.75);opacity:.35}40%{transform:scale(1.1);opacity:1}}' +
      '#jfChips{display:flex;flex-wrap:wrap;gap:.35rem;padding:.5rem .85rem;flex-shrink:0;}' +
      '.jfChip{padding:.28rem .72rem;border-radius:50px;cursor:pointer;font-family:"Space Grotesk",system-ui,sans-serif;font-size:.74rem;background:rgba(123,97,255,.1);border:1px solid rgba(123,97,255,.2);color:rgba(167,139,250,.88);transition:.18s;white-space:nowrap;}' +
      '.jfChip:hover{background:rgba(123,97,255,.22);border-color:rgba(123,97,255,.5);color:#fff}' +
      '#jfFoot{padding:.65rem .85rem;flex-shrink:0;background:rgba(6,4,14,.98);border-top:1px solid rgba(123,97,255,.12);}' +
      '#jfForm{display:flex;gap:.45rem;align-items:flex-end;background:rgba(255,255,255,.04);border:1px solid rgba(123,97,255,.2);border-radius:11px;padding:.45rem .45rem .45rem .8rem;transition:border-color .18s;}' +
      '#jfForm.focus{border-color:rgba(123,97,255,.5)}' +
      '#jfInput{flex:1;background:none;border:none;outline:none;resize:none;font-family:"Space Grotesk",system-ui,sans-serif;font-size:.875rem;color:#EDF0FF;line-height:1.5;max-height:90px;}' +
      '#jfInput::placeholder{color:rgba(255,255,255,.22)}' +
      '#jfSend{width:32px;height:32px;border-radius:8px;border:none;cursor:pointer;flex-shrink:0;background:linear-gradient(135deg,#7B61FF,#5B41DF);display:flex;align-items:center;justify-content:center;transition:.18s;padding:0;}' +
      '#jfSend:hover:not(:disabled){transform:scale(1.08)}' +
      '#jfSend:disabled{opacity:.38;cursor:not-allowed}' +
      '#jfSend svg{width:15px;height:15px;fill:#fff;pointer-events:none}' +
      '#jfPowered{font-family:"Space Mono",monospace;font-size:.54rem;letter-spacing:.08em;color:rgba(255,255,255,.17);text-align:center;margin-top:.45rem;}' +
      '@media(max-width:460px){#jfPanel{right:.6rem;left:.6rem;width:auto;bottom:4.2rem;height:calc(100dvh - 5.8rem)}#jfBtn{bottom:1rem;right:1rem}#jfTip{right:1rem}}';

    var styleEl = document.createElement('style');
    styleEl.id = 'jf-flowbot-styles';
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
    console.log('[Flow Widget] Styles injected.');

    /* ═══════════════════════════════════
       DOM
    ═══════════════════════════════════ */
    var btn = document.createElement('button');
    btn.id = 'jfBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open Flow chat');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<div id="jfDot"></div>' +
      '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';

    var tip = document.createElement('div');
    tip.id = 'jfTip';
    tip.textContent = '⚡ Ask Flow anything';

    var panel = document.createElement('div');
    panel.id = 'jfPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Flow Chat');
    panel.innerHTML =
      '<div id="jfHead">' +
        '<div style="display:flex;align-items:center;gap:.6rem">' +
          '<span class="jfLogo">Flow</span>' +
          '<span class="jfStatus">Online</span>' +
        '</div>' +
        '<button id="jfClose" type="button" aria-label="Close">&#10005;</button>' +
      '</div>' +
      '<div id="jfMsgs"></div>' +
      '<div id="jfTyping"><span></span><span></span><span></span></div>' +
      '<div id="jfChips">' +
        '<button class="jfChip" type="button">What do you build?</button>' +
        '<button class="jfChip" type="button">Bot integrations</button>' +
        '<button class="jfChip" type="button">3D websites</button>' +
        '<button class="jfChip" type="button">Get a quote</button>' +
      '</div>' +
      '<div id="jfFoot">' +
        '<div id="jfForm">' +
          '<textarea id="jfInput" rows="1" placeholder="Message Flow..."></textarea>' +
          '<button id="jfSend" type="button" aria-label="Send">' +
            '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="jfPowered">Powered by Flow &middot; Joel Flowstack</div>' +
      '</div>';

    if (!document.body) {
      console.error('[Flow Widget] document.body not found! Script may be loading too early.');
      return;
    }

    document.body.appendChild(btn);
    document.body.appendChild(tip);
    document.body.appendChild(panel);
    console.log('[Flow Widget] DOM elements appended. Button should be visible bottom-right.');

    /* ═══════════════════════════════════
       REFERENCES
    ═══════════════════════════════════ */
    var msgs    = document.getElementById('jfMsgs');
    var input   = document.getElementById('jfInput');
    var sendBtn = document.getElementById('jfSend');
    var typing  = document.getElementById('jfTyping');
    var chips   = document.getElementById('jfChips');
    var form    = document.getElementById('jfForm');

    var history = [];
    var isOpen = false;
    var busy = false;
    var tipTimer = null;
    var welcomed = false;

    function addBubble(role, text) {
      var wrap = document.createElement('div');
      wrap.className = 'jfMsg ' + role;
      var name = document.createElement('div');
      name.className = 'jfMsgName';
      name.textContent = role === 'bot' ? 'Flow' : 'You';
      var bubble = document.createElement('div');
      bubble.className = 'jfBubble';
      bubble.textContent = text;
      wrap.appendChild(name);
      wrap.appendChild(bubble);
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function addWelcome() {
      if (welcomed) return;
      welcomed = true;
      addBubble('bot', "Hey \uD83D\uDC4B I'm Flow \u2014 Joel's AI assistant. Ask me about 3D websites, bots, automations, or anything else!");
    }

    /* ═══════════════════════════════════
       API CALL
    ═══════════════════════════════════ */
    function send(text) {
      text = (text || '').trim();
      if (!text || busy) return;
      busy = true;
      sendBtn.disabled = true;

      history.push({ role: 'user', content: text });
      addBubble('user', text);
      if (chips) chips.style.display = 'none';
      typing.classList.add('show');
      msgs.scrollTop = msgs.scrollHeight;

      _msgs++;
      _engaged = true;
      logEvent('chat_message', { count: _msgs, text_len: text.length });

      var payload = {
        messages: [{ role: 'system', content: SYSTEM_MSG }].concat(history),
        model: 'gpt-4o-mini',
        max_tokens: 300,
        stream: false
      };

      fetch(BOT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var reply =
          (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
          data.reply || data.message || data.response || data.text || data.content ||
          'Got it! Anything else I can help with?';
        history.push({ role: 'assistant', content: reply });
        typing.classList.remove('show');
        addBubble('bot', reply);
      })
      .catch(function (err) {
        typing.classList.remove('show');
        addBubble('bot', "Hmm, I'm having a brief connection issue. You can reach Joel directly at joelflowstack@gmail.com or via the Contact page!");
        console.warn('[Flow Widget] API error:', err && err.message);
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        try { input.focus(); } catch (e) {}
      });
    }

    /* ═══════════════════════════════════
       OPEN / CLOSE
    ═══════════════════════════════════ */
    function openPanel() {
      isOpen = true;
      btn.classList.add('open');
      panel.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      tip.classList.remove('show');
      clearTimeout(tipTimer);
      var dot = document.getElementById('jfDot');
      if (dot) dot.style.display = 'none';
      logEvent('chat_open', { time_sec: Math.round((Date.now() - _t0) / 1000) });
      addWelcome();
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 300);
    }

    function closePanel() {
      isOpen = false;
      btn.classList.remove('open');
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      isOpen ? closePanel() : openPanel();
    });

    document.getElementById('jfClose').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closePanel();
    });

    document.addEventListener('click', function (e) {
      if (isOpen && panel && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        closePanel();
      }
    });

    /* Stop clicks inside panel from bubbling to canvas/page handlers */
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    panel.addEventListener('mousedown', function (e) { e.stopPropagation(); });

    /* ═══════════════════════════════════
       INPUT
    ═══════════════════════════════════ */
    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    }
    input.addEventListener('input', autoGrow);
    input.addEventListener('focus', function () { if (form) form.classList.add('focus'); });
    input.addEventListener('blur', function () { if (form) form.classList.remove('focus'); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var t = input.value;
        input.value = '';
        autoGrow();
        send(t);
      }
    });
    sendBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var t = input.value;
      input.value = '';
      autoGrow();
      send(t);
    });

    var chipEls = document.querySelectorAll('.jfChip');
    for (var i = 0; i < chipEls.length; i++) {
      chipEls[i].addEventListener('click', function (e) {
        e.preventDefault();
        send(e.target.textContent);
      });
    }

    /* ═══════════════════════════════════
       TOOLTIP
    ═══════════════════════════════════ */
    btn.addEventListener('mouseenter', function () {
      if (!isOpen) { tip.classList.add('show'); clearTimeout(tipTimer); }
    });
    btn.addEventListener('mouseleave', function () {
      tipTimer = setTimeout(function () { tip.classList.remove('show'); }, 700);
    });
    setTimeout(function () {
      if (!isOpen) {
        tip.classList.add('show');
        tipTimer = setTimeout(function () { tip.classList.remove('show'); }, 4000);
      }
    }, 3000);

    console.log('[Flow Widget] Fully initialized. Click the button bottom-right to open.');

  } catch (fatalErr) {
    console.error('[Flow Widget] FATAL ERROR during init:', fatalErr);
  }

})();
