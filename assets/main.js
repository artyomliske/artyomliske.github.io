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
    ru: {
      toLight: 'Светлая', toDark: 'Тёмная',
      themeHint: ' тема', langHint: ' — переключить язык',
      dialog: 'Экран проекта',
      prevShot: 'Предыдущий экран', nextShot: 'Следующий экран', close: 'Закрыть'
    },
    en: {
      toLight: 'Light', toDark: 'Dark',
      themeHint: ' theme', langHint: ' — switch language',
      dialog: 'Project screen',
      prevShot: 'Previous screen', nextShot: 'Next screen', close: 'Close'
    }
  };

  /* Подписи, которые живут в других блоках, обновляются через это событие. */
  var localizers = [];

  function currentLang() { return root.getAttribute('data-lang') === 'en' ? 'en' : 'ru'; }

  function applyLang(lang) {
    var l = LABELS[lang];
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    document.title = TITLES[lang];
    syncThemeLabel();

    var hint = document.getElementById('lang-hint');
    if (hint) hint.textContent = l.langHint;

    /* Кейсы, миниатюры: имена берём из тех же данных, что и видимые подписи. */
    Array.prototype.forEach.call(document.querySelectorAll('.spread[data-label-ru]'), function (el) {
      var name = el.getAttribute('data-label-' + lang);
      if (name) el.setAttribute('aria-label', name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.shot__btn'), function (btn) {
      var name = btn.getAttribute('data-title-' + lang);
      if (name) btn.setAttribute('aria-label', name);
    });

    localizers.forEach(function (fn) { fn(l, lang); });
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  /* Приоритет: адрес → прошлый выбор → русский. Адрес важнее, чтобы ссылка
     на английскую версию открывалась по-английски у любого читателя. */
  var fromUrl = null;
  try { fromUrl = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  var savedLang = fromUrl === 'ru' || fromUrl === 'en' ? fromUrl : store.get('lang');
  if (savedLang !== 'ru' && savedLang !== 'en') savedLang = 'ru';
  applyLang(savedLang);

  var langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', function () {
      var next = currentLang() === 'ru' ? 'en' : 'ru';
      applyLang(next);
      store.set('lang', next);
      try {
        var u = new URL(location.href);
        u.searchParams.set('lang', next);
        history.replaceState(null, '', u);
      } catch (e) {}
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
    var hint = document.getElementById('theme-hint');
    if (hint) hint.textContent = l.themeHint;
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

  /* ── развороты продуктов ──────────────────────────────────
     Кейсы идут вертикальной чередой полноэкранных разворотов, каждый
     в палитре своего проекта. Шапка липкая, поэтому она забирает себе
     палитру того разворота, над которым сейчас стоит: иначе бумажная
     плашка висела бы поверх чёрно-золотого театра. Палитра — обычный
     класс .pal-*, он же переопределяет токены внутри разворота.        */
  (function () {
    var topbar = document.querySelector('.topbar');
    var now = document.getElementById('topbar-now');
    var spreads = Array.prototype.slice.call(document.querySelectorAll('.spread'));
    if (!topbar || !spreads.length) return;

    var palOf = function (el) {
      var m = /(^|\s)(pal-[\w-]+)/.exec(el.className);
      return m ? m[2] : '';
    };
    var current = '';
    var ticking = false;

    function apply(force) {
      /* Якорь приземляется не в ноль: у документа есть scroll-padding-top,
         оставленный ради фокуса под липкой шапкой. Если опрашивать разворот
         по высоте шапки, в момент приезда попадаешь ещё в предыдущий — и
         шапка называет не тот продукт. Линию опроса держим ниже приземления. */
      var pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      var line = Math.max(topbar.offsetHeight, pad) + 8;
      var hit = null;
      for (var i = 0; i < spreads.length; i++) {
        var r = spreads[i].getBoundingClientRect();
        if (r.top <= line && r.bottom > line) { hit = spreads[i]; break; }
      }
      var pal = hit ? palOf(hit) : '';
      if (pal === current && !force) return;
      /* класс палитры на шапке ровно один: собираем имя целиком,
         иначе при смене языка старая палитра оставалась висеть */
      topbar.className = pal ? 'topbar ' + pal : 'topbar';
      current = pal;
      if (now) {
        var lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'ru';
        var label = hit && hit.getAttribute('data-label-' + lang);
        now.textContent = label ? (hit.getAttribute('data-no') || '') + ' · ' + label : '';
        now.classList.toggle('is-on', !!label);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; apply(); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('langchange', function () { apply(true); });
    apply();
  })();


  /* ── просмотр экранов во весь экран ───────────────────── */
  (function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.shot__btn'));
    if (!buttons.length) return;

    var box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', LABELS[currentLang()].dialog);
    box.innerHTML =
      '<div class="lb__stage"><img alt=""></div>' +
      '<div class="lb__bar">' +
        '<span class="lb__title"></span>' +
        '<span class="lb__cap"></span>' +
        '<span class="lb__count" role="status" aria-atomic="true"></span>' +
        '<span class="lb__nav">' +
          '<button type="button" class="navbtn" data-lb="prev">&#8592;</button>' +
          '<button type="button" class="navbtn" data-lb="next">&#8594;</button>' +
          '<button type="button" class="navbtn" data-lb="close">&#10005;</button>' +
        '</span>' +
      '</div>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var elTitle = box.querySelector('.lb__title');
    var elCap = box.querySelector('.lb__cap');
    var elCount = box.querySelector('.lb__count');
    var group = [];
    var at = 0;
    var opener = null;

    function fill() {
      var btn = group[at];
      if (!btn) return;
      var l = root.getAttribute('data-lang') === 'en' ? 'en' : 'ru';
      img.src = btn.getAttribute('data-full');
      img.alt = btn.getAttribute('data-title-' + l) || '';
      elTitle.textContent = btn.getAttribute('data-title-' + l) || '';
      elCap.textContent = btn.getAttribute('data-' + l) || '';
      elCount.textContent = (at + 1) + ' / ' + group.length;
    }

    /* Остальная страница выключается на время просмотра: без этого Tab первым же
       нажатием уходил под оверлей, хотя диалог объявлен модальным. */
    function shield(on) {
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== box) el.inert = on;
      });
    }

    localizers.push(function (l) {
      box.setAttribute('aria-label', l.dialog);
      box.querySelector('[data-lb="prev"]').setAttribute('aria-label', l.prevShot);
      box.querySelector('[data-lb="next"]').setAttribute('aria-label', l.nextShot);
      box.querySelector('[data-lb="close"]').setAttribute('aria-label', l.close);
    });
    localizers[localizers.length - 1](LABELS[currentLang()]);

    function open(btn) {
      var gallery = btn.closest('[data-gallery]');
      group = gallery ? Array.prototype.slice.call(gallery.querySelectorAll('.shot__btn')) : [btn];
      at = group.indexOf(btn);
      opener = btn;
      fill();
      box.classList.add('is-open');
      shield(true);
      document.body.style.overflow = 'hidden';
      box.querySelector('[data-lb="close"]').focus();
    }

    function close() {
      box.classList.remove('is-open');
      shield(false);
      document.body.style.overflow = '';
      img.removeAttribute('src');
      if (opener) opener.focus();
      opener = null;
    }

    function step(d) {
      if (!group.length) return;
      at = (at + d + group.length) % group.length;
      fill();
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { open(btn); });
    });

    box.addEventListener('click', function (e) {
      var act = e.target.closest('[data-lb]');
      if (act) {
        var a = act.getAttribute('data-lb');
        if (a === 'close') close();
        if (a === 'prev') step(-1);
        if (a === 'next') step(1);
        return;
      }
      if (e.target === img) { step(1); return; }
      close();
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); step(-1); }
    }, true);

    window.addEventListener('langchange', function () {
      if (box.classList.contains('is-open')) fill();
    });
  })();

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
