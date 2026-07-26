/* Портфолио — язык, тема, табло занятости, появление секций. */
(function () {
  'use strict';

  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── язык ─────────────────────────────────────────────── */
  var TITLES = {
    ru: 'Артём Лиске — автоматизация бизнес-процессов',
    en: 'Artyom Liske — business process automation'
  };
  var LABELS = {
    ru: { toLight: 'Светлая', toDark: 'Тёмная', theme: 'Сменить тему', lang: 'Switch to English' },
    en: { toLight: 'Light',   toDark: 'Dark',   theme: 'Switch theme', lang: 'Переключить на русский' }
  };

  function currentLang() { return root.getAttribute('data-lang') === 'en' ? 'en' : 'ru'; }

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    document.title = TITLES[lang];
    syncThemeLabel();
    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.setAttribute('aria-label', LABELS[lang].lang);
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  var savedLang = store.get('lang');
  if (savedLang !== 'ru' && savedLang !== 'en') savedLang = 'ru';
  applyLang(savedLang);

  var langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', function () {
      var next = currentLang() === 'ru' ? 'en' : 'ru';
      applyLang(next);
      store.set('lang', next);
    });
  }

  /* ── тема ─────────────────────────────────────────────── */
  var themeLabel = document.getElementById('theme-label');
  var themeToggle = document.getElementById('theme-toggle');
  var darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

  function effectiveTheme() {
    var set = root.getAttribute('data-theme');
    if (set === 'dark' || set === 'light') return set;
    return darkMedia.matches ? 'dark' : 'light';
  }

  function syncThemeLabel() {
    var l = LABELS[currentLang()];
    if (themeLabel) themeLabel.textContent = effectiveTheme() === 'dark' ? l.toLight : l.toDark;
    if (themeToggle) themeToggle.setAttribute('aria-label', l.theme);
  }

  var savedTheme = store.get('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') root.setAttribute('data-theme', savedTheme);
  syncThemeLabel();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('theme', next);
      syncThemeLabel();
    });
  }
  darkMedia.addEventListener('change', syncThemeLabel);

  /* ── табло занятости ──────────────────────────────────── */
  var board = document.getElementById('board');
  if (board) {
    var slots = Array.prototype.slice.call(board.querySelectorAll('.slot'));
    slots.forEach(function (slot) {
      var step = parseFloat(slot.getAttribute('data-delay')) || 0;
      var d = reduced.matches ? 0 : step * 0.32;
      slot.style.setProperty('--d', d + 's');
      slot.style.setProperty('--ad', (d + 0.5) + 's');
    });

    var run = function () { board.classList.add('is-running'); };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { run(); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(board);
    } else {
      run();
    }

    var replay = document.getElementById('board-replay');
    if (replay) {
      replay.addEventListener('click', function () {
        board.classList.remove('is-running');
        void board.offsetWidth; /* сброс анимации */
        run();
      });
    }
  }


  /* ── колода кейсов ────────────────────────────────────── */
  var deck = document.getElementById('deck');
  if (deck) {
    var slides = Array.prototype.slice.call(deck.children);
    var counter = document.getElementById('deck-counter');
    var prev = document.getElementById('deck-prev');
    var next = document.getElementById('deck-next');
    var ticks = document.getElementById('deck-ticks');
    var index = 0;

    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    slides.forEach(function (slide, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Кейс ' + (i + 1));
      btn.addEventListener('click', function () { go(i); });
      li.appendChild(btn);
      ticks.appendChild(li);
    });
    var tickItems = Array.prototype.slice.call(ticks.children);

    function step() {
      if (slides.length < 2) return deck.clientWidth;
      return slides[1].offsetLeft - slides[0].offsetLeft;
    }

    function go(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      deck.scrollTo({
        left: index * step(),
        behavior: reduced.matches ? 'auto' : 'smooth'
      });
      sync();
    }

    function sync() {
      if (counter) counter.innerHTML = pad(index + 1) + '&thinsp;/&thinsp;' + pad(slides.length);
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
      tickItems.forEach(function (li, i) { li.classList.toggle('is-active', i === index); });
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });

    var ticking = false;
    deck.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var s = step();
        var i = s ? Math.round(deck.scrollLeft / s) : 0;
        if (i !== index) { index = Math.max(0, Math.min(slides.length - 1, i)); sync(); }
      });
    }, { passive: true });

    window.addEventListener('resize', sync);
    sync();
  }

  /* ── появление секций ─────────────────────────────────── */
  if ('IntersectionObserver' in window && !reduced.matches) {
    var targets = document.querySelectorAll('.services li, .steps li, .stack li, .facts');
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add('reveal');
      revealer.observe(el);
    });
  }
})();
