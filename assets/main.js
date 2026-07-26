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

  /* ── появление секций ─────────────────────────────────── */
  if ('IntersectionObserver' in window && !reduced.matches) {
    var targets = document.querySelectorAll('.case, .services li, .steps li, .stack li, .facts');
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
