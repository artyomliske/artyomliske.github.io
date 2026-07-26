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
      deck: 'Кейсы, листается вправо и влево',
      prevCase: 'Предыдущий кейс', nextCase: 'Следующий кейс', caseN: 'Кейс ',
      dialog: 'Экран проекта',
      prevShot: 'Предыдущий экран', nextShot: 'Следующий экран', close: 'Закрыть'
    },
    en: {
      toLight: 'Light', toDark: 'Dark',
      themeHint: ' theme', langHint: ' — switch language',
      deck: 'Case studies, swipe left and right',
      prevCase: 'Previous case', nextCase: 'Next case', caseN: 'Case ',
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
    Array.prototype.forEach.call(document.querySelectorAll('.case'), function (el) {
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

    /* Ленивая загрузка оставляла пустые рамки на первом кадре после переключения.
       Снимаем lazy только у соседей — грузить все 26 сразу дорого для мобильного. */
    function preload(i) {
      [i, i - 1, i + 1].forEach(function (k) {
        var slide = slides[k];
        if (!slide) return;
        Array.prototype.forEach.call(slide.querySelectorAll('img[loading="lazy"]'), function (im) {
          im.removeAttribute('loading');
        });
      });
    }

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

    /* Колода держит высоту активного кейса, а не самого длинного:
       иначе под коротким кейсом зияет пустота на пол-экрана. */
    function setHeight() {
      var el = slides[index];
      if (el) deck.style.height = el.offsetHeight + 'px';
    }

    var watcher = 'ResizeObserver' in window ? new ResizeObserver(setHeight) : null;

    function sync() {
      setHeight();
      if (watcher) { watcher.disconnect(); watcher.observe(slides[index]); }
      if (counter) counter.innerHTML = pad(index + 1) + '&thinsp;/&thinsp;' + pad(slides.length);
      if (prev && prev.disabled !== (index === 0)) {
        if (document.activeElement === prev && index === 0) deck.focus();
        prev.disabled = index === 0;
      }
      if (next && next.disabled !== (index === slides.length - 1)) {
        if (document.activeElement === next && index === slides.length - 1) deck.focus();
        next.disabled = index === slides.length - 1;
      }
      tickItems.forEach(function (li, i) {
        li.classList.toggle('is-active', i === index);
        li.firstChild.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
      preload(index);
    }

    localizers.push(function (l) {
      deck.setAttribute('aria-label', l.deck);
      if (prev) prev.setAttribute('aria-label', l.prevCase);
      if (next) next.setAttribute('aria-label', l.nextCase);
      tickItems.forEach(function (li, i) {
        li.firstChild.setAttribute('aria-label', l.caseN + (i + 1));
      });
    });
    localizers[localizers.length - 1](LABELS[currentLang()]);

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    /* Стрелки листают колоду только когда сфокусирована она сама: иначе
       ползунки и селекты внутри кейсов теряли нативное управление. */
    deck.addEventListener('keydown', function (e) {
      if (e.target !== deck) return;
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
    window.addEventListener('load', setHeight);
    Array.prototype.forEach.call(deck.querySelectorAll('img'), function (im) {
      if (!im.complete) im.addEventListener('load', setHeight, { once: true });
    });
    sync();
  }


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
