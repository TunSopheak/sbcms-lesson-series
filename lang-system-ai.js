/**
 * SBCMS Lesson Series — Controls v4
 * ✅ Language toggle  (🇰🇭 ខ្មែរ ↔ 🇬🇧 EN)  via Google Translate (free, no key)
 * ✅ Dark / Light mode toggle  (🌙 moon ↔ ☀️ sun)
 *
 * UI: #sbcms-ctrl panel — top-right on desktop, top-LEFT on mobile (≤820px)
 *     so it never overlaps the TOC hamburger button (top-right on mobile)
 *
 * Add before </body> in every page:
 *   <script src="lang-system-ai.js"></script>
 *
 * PUBLIC API:
 *   SBCMSLang.set('en')  SBCMSLang.set('km')  SBCMSLang.toggle()  SBCMSLang.clearCache()
 *   SBCMSDark.toggle()   SBCMSDark.set(bool)   SBCMSDark.get()
 */

(function () {
  'use strict';

  /* ─── STORAGE KEYS ─────────────────────────────────────────── */
  var LANG_KEY = 'sbcms-lang';
  var DARK_KEY = 'sbcms-dark';
  var GT_PRE   = 'sbcms-gt:';

  /* ─── INITIAL STATE ─────────────────────────────────────────── */
  var lang       = 'km'; // Always default to Khmer on every page load
  var dark       = localStorage.getItem(DARK_KEY) === 'true';
  var busy       = false;
  var registry   = []; // { node, orig }

  /* ─── APPLY DARK BEFORE FIRST PAINT ────────────────────────── */
  if (dark) document.documentElement.classList.add('dark');

  /* ─── INJECT KANTUMRUY PRO GOOGLE FONT ─── */
  if (!document.querySelector('link[href*="Kantumruy"]')) {
    var GF = document.createElement('link');
    GF.rel  = 'stylesheet';
    GF.href = 'https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&display=swap';
    document.head.appendChild(GF);
  }

  /* ─── INJECT STYLES ─────────────────────────────────────────── */
  var S = document.createElement('style');
  S.textContent =
    /* Force Kantumruy Pro on all Khmer characters everywhere */
    '@font-face{font-family:"SBCMS-Khmer";src:url("https://fonts.gstatic.com/s/kantumruypro/v8/1q2fY5WOGUNMYaMHmcXBk1vWKl8oBFSaRkI.woff2") format("woff2");unicode-range:U+1780-17FF,U+19E0-19FF,U+200C-200D,U+25CC;font-display:swap;}' +
    'body,*{font-family:"SBCMS-Khmer","Kantumruy Pro",inherit;}' +
    /* Controls wrapper */
    '#sbcms-ctrl{position:fixed;top:13px;right:16px;z-index:9999;' +
    'display:flex;flex-direction:column;gap:8px;align-items:flex-end;}' +
    /* Mobile: move LEFT so TOC button (top-right) has room */
    '@media(max-width:820px){#sbcms-ctrl{right:auto;left:12px;align-items:flex-start;}}' +

    /* ── Lang toggle pill ── */
    '#sbcms-lt{display:flex !important;align-items:center;' +
    'background:rgba(20,10,3,0.95);border:1px solid rgba(200,155,60,0.4);' +
    'border-radius:999px;overflow:hidden;cursor:pointer;' +
    'box-shadow:0 2px 16px rgba(0,0,0,0.55);' +
    'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
    "font-family:'Kantumruy Pro',sans-serif;user-select:none;" +
    'transition:border-color .2s,box-shadow .2s;}' +
    '#sbcms-lt:hover{border-color:rgba(200,155,60,0.85);box-shadow:0 4px 22px rgba(200,155,60,0.25);}' +

    /* Lang option buttons */
    '.sblt-o{padding:8px 15px;font-size:12px;font-weight:600;' +
    "font-family:'Kantumruy Pro',sans-serif;line-height:1.3;" +
    'color:rgba(253,246,236,0.38);transition:all .2s;white-space:nowrap;}' +
    '.sblt-o.on{background:linear-gradient(135deg,#c89b3c,#9a7224);' +
    'color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);}' +
    '.sblt-sep{width:1px;height:16px;background:rgba(200,155,60,0.22);flex-shrink:0;}' +

    /* ── Dark mode button ── */
    '#sbcms-dm{width:40px;height:40px;border-radius:12px;' +
    'background:rgba(20,10,3,0.95);border:1px solid rgba(200,155,60,0.4);' +
    'color:#C89B3C;cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 2px 14px rgba(0,0,0,0.5);' +
    'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
    'transition:all .2s ease;flex-shrink:0;padding:0;border-style:solid;}' +
    '#sbcms-dm:hover{background:rgba(200,155,60,0.18);border-color:#C89B3C;' +
    'box-shadow:0 4px 20px rgba(200,155,60,0.28);transform:scale(1.07);}' +
    '#sbcms-dm:active{transform:scale(0.91);}' +
    'html.dark #sbcms-dm{background:rgba(253,246,236,0.08);' +
    'border-color:rgba(253,246,236,0.3);color:#fdf6ec;}' +

    /* ── Loading overlay ── */
    '#sbcms-ov{display:none;position:fixed;inset:0;z-index:9998;' +
    'background:rgba(8,4,1,0.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
    'flex-direction:column;align-items:center;justify-content:center;gap:20px;}' +
    '#sbcms-ov.on{display:flex;}' +
    '.sbov-spin{width:44px;height:44px;border:3px solid rgba(200,155,60,0.15);' +
    'border-top-color:#c89b3c;border-radius:50%;animation:sbspin .7s linear infinite;}' +
    '@keyframes sbspin{to{transform:rotate(360deg);}}' +
    ".sbov-msg{color:rgba(253,246,236,0.82);font-size:14px;text-align:center;" +
    "line-height:1.9;font-family:'Kantumruy Pro',sans-serif;}" +
    '.sbov-msg strong{color:#c89b3c;font-size:15px;display:block;margin-bottom:4px;}' +
    ".sbov-msg small{font-size:11px;opacity:.4;font-family:'Consolas','Courier New',monospace;}" +
    '.sberr{background:rgba(120,20,20,0.25);border:1px solid rgba(200,60,60,0.35);' +
    'border-radius:14px;padding:22px 28px;max-width:340px;' +
    'color:rgba(253,246,236,0.88);font-size:13.5px;text-align:center;' +
    "line-height:1.8;font-family:'Kantumruy Pro',sans-serif;}" +
    '.sberr-ok{margin-top:14px;padding:8px 24px;background:#c89b3c;border:none;' +
    'border-radius:8px;color:#1c0f07;font-weight:700;font-size:13px;cursor:pointer;}' +
    /* Fade-in for translated nodes */
    '[data-sbtr]{animation:sbfade .3s ease;}' +
    '@keyframes sbfade{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}';

  document.head.appendChild(S);

  /* ─── SVG ICONS ─────────────────────────────────────────────── */
  var ICO_MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var ICO_SUN  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4.5"/>' +
    '<line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>' +
    '<line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/>' +
    '<line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>' +
    '<line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>' +
    '</svg>';

  /* ─── BUILD UI ──────────────────────────────────────────────── */
  function buildUI() {
    /* Wrapper panel */
    var ctrl = document.createElement('div');
    ctrl.id = 'sbcms-ctrl';

    /* Lang toggle pill */
    var lt = document.createElement('div');
    lt.id = 'sbcms-lt';
    lt.setAttribute('role', 'group');
    lt.setAttribute('aria-label', 'Language selector');
    lt.innerHTML =
      '<span class="sblt-o" data-l="km" role="button" tabindex="0">🇰🇭 ខ្មែរ</span>' +
      '<span class="sblt-sep" aria-hidden="true"></span>' +
      '<span class="sblt-o" data-l="en" role="button" tabindex="0">🇬🇧 EN</span>';
    lt.addEventListener('click', function (e) {
      var o = e.target.closest('.sblt-o');
      if (o) switchLang(o.dataset.l);
    });
    ctrl.appendChild(lt);

    /* Dark mode button */
    var dm = document.createElement('button');
    dm.id = 'sbcms-dm';
    dm.setAttribute('aria-label', 'Toggle dark/light mode');
    dm.innerHTML = dark ? ICO_SUN : ICO_MOON;
    dm.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    dm.addEventListener('click', toggleDark);
    ctrl.appendChild(dm);

    document.body.appendChild(ctrl);

    /* Loading overlay */
    var ov = document.createElement('div');
    ov.id = 'sbcms-ov';
    ov.innerHTML =
      '<div class="sbov-spin"></div>' +
      '<div class="sbov-msg">' +
        '<strong>☕ កំពុងបកប្រែ...</strong>' +
        'Translating with Google Translate<br>' +
        '<small>First time only · Cached after</small>' +
      '</div>';
    document.body.appendChild(ov);

    syncLangUI();
  }

  /* ─── SYNC UI ────────────────────────────────────────────────── */
  function syncLangUI() {
    document.querySelectorAll('.sblt-o').forEach(function (el) {
      el.classList.toggle('on', el.dataset.l === lang);
    });
  }

  function syncDarkUI() {
    var btn = document.getElementById('sbcms-dm');
    if (!btn) return;
    btn.innerHTML = dark ? ICO_SUN : ICO_MOON;
    btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  /* ─── DARK MODE ─────────────────────────────────────────────── */
  function toggleDark() { setDark(!dark); }

  function setDark(val) {
    dark = !!val;
    localStorage.setItem(DARK_KEY, dark ? 'true' : 'false');
    /* Add transition class: smooth color switch only on manual toggle,
       never on initial page load — avoids flash of transitioning colors */
    document.documentElement.classList.add('dark-transition');
    document.documentElement.classList.toggle('dark', dark);
    syncDarkUI();
    setTimeout(function () {
      document.documentElement.classList.remove('dark-transition');
    }, 280);
  }

  /* ─── OVERLAYS ──────────────────────────────────────────────── */
  function ovOn()  { document.getElementById('sbcms-ov').classList.add('on'); }
  function ovOff() { document.getElementById('sbcms-ov').classList.remove('on'); }
  function ovErr(msg) {
    var ov = document.getElementById('sbcms-ov');
    ov.innerHTML =
      '<div class="sberr">⚠️ <strong>Translation Failed</strong>' +
      msg + '<br><small>Check internet and try again.</small><br>' +
      '<button class="sberr-ok" onclick="document.getElementById(\'sbcms-ov\').classList.remove(\'on\')">OK</button></div>';
    ov.classList.add('on');
  }

  /* ─── COLLECT KHMER TEXT NODES ──────────────────────────────── */
  var SKIP = new Set(['SCRIPT','STYLE','CODE','PRE','NOSCRIPT','SVG','MATH','CANVAS','TEXTAREA','BUTTON']);

  function collectKhmer(root) {
    var out = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('#sbcms-ctrl,#sbcms-ov')) return NodeFilter.FILTER_REJECT;
        var t = n.textContent.trim();
        if (t.length < 2 || !/[\u1780-\u17FF]/.test(t)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  /* ─── GOOGLE TRANSLATE (FREE) ───────────────────────────────── */
  async function gtranslate(text) {
    var url = 'https://translate.googleapis.com/translate_a/single' +
      '?client=gtx&sl=km&tl=en&dt=t&q=' + encodeURIComponent(text);
    var r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var d = await r.json();
    var out = '';
    if (d && d[0]) d[0].forEach(function (p) { if (p && p[0]) out += p[0]; });
    return out.trim();
  }

  async function translateBatch(texts) {
    var key = GT_PRE + location.pathname;
    var cache = {};
    try { cache = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    var miss = texts.filter(function (t) { return !cache[t]; });
    for (var i = 0; i < miss.length; i++) {
      try { var tr = await gtranslate(miss[i]); if (tr) cache[miss[i]] = tr; }
      catch (e) { console.warn('[SBCMS Lang]', e); }
    }
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch (e) {}
    return cache;
  }

  /* ─── APPLY / REVERT ─────────────────────────────────────────── */
  function applyEN(map) {
    collectKhmer(document.body).forEach(function (node) {
      var orig = node.textContent.trim();
      if (!map[orig]) return;
      if (!registry.find(function (r) { return r.node === node; }))
        registry.push({ node: node, orig: node.textContent });
      node.textContent = node.textContent.replace(orig, map[orig]);
      if (node.parentElement) node.parentElement.setAttribute('data-sbtr', '1');
    });
    document.documentElement.lang = 'en';
  }

  function revertKM() {
    registry.forEach(function (r) {
      if (r.node.isConnected) {
        r.node.textContent = r.orig;
        if (r.node.parentElement) r.node.parentElement.removeAttribute('data-sbtr');
      }
    });
    registry = [];
    document.documentElement.lang = 'km';
  }

  /* ─── SWITCH LANGUAGE ───────────────────────────────────────── */
  async function switchLang(target) {
    if (target === lang || busy) return;
    lang = target;
    syncLangUI();
    localStorage.setItem(LANG_KEY, lang);

    if (lang === 'km') { revertKM(); return; }

    busy = true;
    ovOn();
    try {
      var nodes  = collectKhmer(document.body);
      var unique = Array.from(new Set(
        nodes.map(function (n) { return n.textContent.trim(); }).filter(function (t) { return t.length > 1; })
      ));
      var map = await translateBatch(unique);
      applyEN(map);
    } catch (err) {
      lang = 'km'; syncLangUI();
      localStorage.setItem(LANG_KEY, 'km');
      revertKM();
      ovErr(err.message);
      return;
    } finally {
      busy = false;
      ovOff();
    }
  }

  /* ─── INIT ──────────────────────────────────────────────────── */
  function init() {
    buildUI();
    document.documentElement.lang = lang;
    if (lang === 'en') switchLang('en');
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

  /* ─── PUBLIC API ────────────────────────────────────────────── */
  window.SBCMSLang = {
    set:        switchLang,
    get:        function () { return lang; },
    toggle:     function () { switchLang(lang === 'en' ? 'km' : 'en'); },
    clearCache: function () { localStorage.removeItem(GT_PRE + location.pathname); console.log('[SBCMS] Cache cleared'); }
  };
  window.SBCMSDark = {
    set:    setDark,
    get:    function () { return dark; },
    toggle: toggleDark
  };

})();