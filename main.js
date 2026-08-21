/* Живые демонстрации обязательств. Ванильный JS, без зависимостей.
   Каждая демонстрация показывает ровно то, что обещано в своём пункте. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── шапка отбивается линией, когда страница уехала ── */
  var top = document.getElementById('top');
  if (top && 'IntersectionObserver' in window) {
    var probe = document.createElement('div');
    document.body.prepend(probe);
    new IntersectionObserver(function (e) {
      top.classList.toggle('is-stuck', !e[0].isIntersecting);
    }, { threshold: 1 }).observe(probe);
  }

  /* ── появление секций ──────────────────────────────────────────
     Класс js ставится ЗДЕСЬ, а не в разметке: если скрипт не
     загрузился или упал, ничего не спрятано и страница читается. */
  (function () {
    var root = document.documentElement;
    if (!('IntersectionObserver' in window)) return;
    try {
      root.classList.add('js');
      var rise = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); rise.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      var nodes = document.querySelectorAll('.rise');
      if (!nodes.length) { root.classList.remove('js'); return; }
      nodes.forEach(function (n) { rise.observe(n); });
      /* страховка: если наблюдатель почему-то молчит — показать всё */
      setTimeout(function () {
        document.querySelectorAll('.rise:not(.in)').forEach(function (n) {
          if (n.getBoundingClientRect().top < innerHeight) n.classList.add('in');
        });
      }, 1500);
    } catch (err) {
      root.classList.remove('js');
    }
  })();

  /* ── лента обязательств ────────────────────────────────────────
     Привязку прокрутки делает CSS. Здесь только счётчик, стрелки,
     засечки и клавиши. Колёсико не трогаем — страница листается
     вертикально как обычно, вбок ведут жест, стрелки и клавиатура. */
  (function () {
    var track = document.querySelector('.track');
    if (!track) return;
    var panels = [].slice.call(track.querySelectorAll('.ob'));
    var dots = [].slice.call(document.querySelectorAll('.track__dot'));
    var cur = document.querySelector('[data-cur]');
    var prev = document.querySelector('[data-prev]');
    var next = document.querySelector('[data-next]');
    var at = 0;


    function show(i) {
      at = Math.max(0, Math.min(panels.length - 1, i));
      if (cur) cur.textContent = ('0' + (at + 1)).slice(-2);
      dots.forEach(function (d, n) { d.setAttribute('aria-current', n === at ? 'true' : 'false'); });
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === panels.length - 1;
    }
    function go(i) {
      var n = Math.max(0, Math.min(panels.length - 1, i));
      var p = panels[n];
      if (!p) return;
      show(n);
      track.scrollTo({ left: p.offsetLeft - panels[0].offsetLeft,
                       behavior: calm ? 'auto' : 'smooth' });
    }

    /* Позиция считается прямо из прокрутки: панели ровно по ширине
       ленты, поэтому деление точное и ничего не теряется. */
    var tick = 0;
    function sync() {
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(function () {
        var w = track.clientWidth || 1;
        show(Math.round(track.scrollLeft / w));
      });
    }
    track.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);

    if (prev) prev.addEventListener('click', function () { go(at - 1); });
    if (next) next.addEventListener('click', function () { go(at + 1); });
    dots.forEach(function (d) {
      d.addEventListener('click', function () { go(+d.getAttribute('data-go') - 1); });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(at - 1); }
      if (e.key === 'Home')       { e.preventDefault(); go(0); }
      if (e.key === 'End')        { e.preventDefault(); go(panels.length - 1); }
    });

    /* ссылки вида #ob-04 (в том числе из раскрытых карточек) ведут к панели */
    window.__toObligation = function (id) {
      var i = panels.map(function (p) { return '#' + p.id; }).indexOf(id);
      if (i < 0) return false;
      track.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
      setTimeout(function () { go(i); }, calm ? 0 : 320);
      return true;
    };
    document.querySelectorAll('a[href^="#ob-"]').forEach(function (a) {
      if (a.closest('dialog')) return;
      a.addEventListener('click', function (e) {
        if (window.__toObligation(a.getAttribute('href'))) e.preventDefault();
      });
    });

    show(0);
  })();

  /* ── 01 · двойная бронь ────────────────────────────────────────
     Две кассы жмут на один слот. Вторую отклоняет не код, а база. */
  (function () {
    var root = document.querySelector('[data-demo="booking"]');
    if (!root) return;
    var taken = false;
    var btns = root.querySelectorAll('.tap[data-who]');
    var outs = root.querySelectorAll('.slot__state');
    var reset = root.querySelector('[data-reset]');
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        if (!taken) {
          taken = true;
          outs[i].textContent = 'записано · 19:00 занято';
          outs[i].className = 'slot__state ok';
        } else {
          outs[i].textContent = 'отклонено базой · слот уже занят';
          outs[i].className = 'slot__state no';
        }
        b.disabled = true;
        if (reset) reset.hidden = false;
      });
    });
    if (reset) reset.addEventListener('click', function () {
      taken = false; reset.hidden = true;
      btns.forEach(function (b) { b.disabled = false; });
      outs.forEach(function (o) { o.textContent = ''; o.className = 'slot__state'; });
    });
  })();

  /* ── 02 · прайс поднимается, прошлое стоит ── */
  (function () {
    var root = document.querySelector('[data-demo="price"]');
    if (!root) return;
    var rng = root.querySelector('.rng');
    var now = root.querySelector('[data-now]');
    var old = root.querySelector('[data-old]');
    function fmt(v) { return v.toLocaleString('ru-RU') + ' ₽'; }
    function draw() {
      now.textContent = fmt(+rng.value);
      old.textContent = fmt(4500);
    }
    rng.addEventListener('input', draw); draw();
  })();

  /* ── 04 · очки по правилу клуба ────────────────────────────────
     Формула ровно та, что работает в системе: base·√N / √place. */
  (function () {
    var root = document.querySelector('[data-demo="points"]');
    if (!root) return;
    var field = root.querySelector('[data-field]');
    var out = root.querySelector('[data-pts]');
    var fieldOut = root.querySelector('[data-fieldn]');
    var bars = root.querySelectorAll('.bars i');
    function pts(place, n, base) { return Math.round((base * Math.sqrt(n)) / Math.sqrt(place)); }
    function draw() {
      var n = +field.value;
      fieldOut.textContent = n;
      out.textContent = pts(1, n, 10);
      var top = pts(1, n, 10) || 1;
      bars.forEach(function (b, i) {
        var v = pts(i + 1, n, 10);
        b.style.height = Math.max(3, (v / top) * 100) + '%';
        b.title = (i + 1) + '-е место — ' + v;
        b.classList.toggle('hot', i === 0);
      });
    }
    field.addEventListener('input', draw); draw();
  })();

  /* ── 06 · ночь: проверка, падение, тревога ── */
  (function () {
    var root = document.querySelector('[data-demo="night"]');
    if (!root) return;
    var clock = root.querySelector('.clock');
    var lines = root.querySelectorAll('.log p');
    var again = root.querySelector('[data-again]');
    var timers = [];
    function run() {
      timers.forEach(clearTimeout); timers = [];
      lines.forEach(function (l) { l.classList.remove('on'); });
      var t = 0, mins = ['02:58', '02:59', '03:00', '03:00', '03:01'];
      if (calm) { lines.forEach(function (l) { l.classList.add('on'); }); clock.textContent = '03:01'; return; }
      mins.forEach(function (m, i) {
        timers.push(setTimeout(function () {
          clock.textContent = m;
          if (lines[i]) lines[i].classList.add('on');
          if (i === mins.length - 1 && again) again.hidden = false;
        }, t += 900));
      });
    }
    if ('IntersectionObserver' in window) {
      var once = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { run(); once.disconnect(); }
      }, { rootMargin: '0px 0px -25% 0px' });
      once.observe(root);
    } else { run(); }
    if (again) again.addEventListener('click', function () { again.hidden = true; run(); });
  })();

  /* ── карточки дел: раскрытие ──────────────────────────────────
     Нативный <dialog>: Esc, возврат фокуса и блокировка фона — даром. */
  (function () {
    var opens = document.querySelectorAll('[data-open]');
    if (!opens.length) return;
    var lock = false;

    function shut(d) {
      if (d && d.open) d.close();
      document.documentElement.style.overflow = '';
    }

    function openCase(key) {
      var d = document.getElementById('d-' + key);
      if (!d || d.open) return false;
      /* Первый кадр нужен сразу после открытия; остальные остаются lazy. */
      var firstShot = d.querySelector('[data-gal] img[loading="lazy"]');
      if (firstShot) {
        firstShot.loading = 'eager';
        firstShot.fetchPriority = 'high';
      }
      if (typeof d.showModal === 'function') { d.showModal(); } else { d.setAttribute('open', ''); }
      document.documentElement.style.overflow = 'hidden';
      /* размеры лент внутри стали настоящими только сейчас */
      requestAnimationFrame(function () {
        galleries.forEach(function (g) { if (d.contains(g.root)) g.sync(); });
      });
      return true;
    }

    opens.forEach(function (b) {
      b.addEventListener('click', function () { openCase(b.getAttribute('data-open')); });
    });

    /* Публичные case-репозитории ведут сразу к нужному раскрытию. */
    var caseByHash = { 'case-chcrm': 'ch', 'case-studio': 'st', 'case-commandex': 'cx' };
    var requestedCase = caseByHash[location.hash.slice(1)];
    if (requestedCase) {
      setTimeout(function () { openCase(requestedCase); }, calm ? 0 : 120);
    }

    document.querySelectorAll('dialog.sheet').forEach(function (d) {
      /* клик мимо содержимого — закрыть */
      d.addEventListener('click', function (e) {
        if (e.target === d) shut(d);
      });
      d.addEventListener('close', function () { document.documentElement.style.overflow = ''; });
      /* ссылка на обязательство: закрыть и доехать */
      d.querySelectorAll('[data-jump]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          if (lock) return; lock = true;
          var id = a.getAttribute('href');
          shut(d);
          setTimeout(function () {
            if (!(window.__toObligation && window.__toObligation(id))) {
              var t = document.querySelector(id);
              if (t) t.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
            }
            lock = false;
          }, 60);
        });
      });
    });
  })();

  /* ── контактный лист кадров ───────────────────────────────────
     Кадры разной ширины, поэтому позиция — ближайший кадр по
     смещению. Состояние стрелок считается ОТ НОМЕРА, а не от
     размеров ленты: пока карточка закрыта, размеры нулевые, и
     «вперёд» ложно выглядела упёршейся в конец. */
  var galleries = [];
  (function () {
    document.querySelectorAll('[data-gal]').forEach(function (gal) {
      var track = gal.querySelector('.gal__track');
      var shots = [].slice.call(track.querySelectorAll('figure'));
      if (shots.length < 2) return;
      var num = gal.querySelector('[data-i]');
      var prev = gal.querySelector('[data-gprev]');
      var next = gal.querySelector('[data-gnext]');
      var at = 0, tick = 0;

      function nearest() {
        var x = track.scrollLeft, best = 0, dist = Infinity;
        shots.forEach(function (s, i) {
          var d = Math.abs((s.offsetLeft - shots[0].offsetLeft) - x);
          if (d < dist) { dist = d; best = i; }
        });
        return best;
      }
      function show(i) {
        at = Math.max(0, Math.min(shots.length - 1, i));
        if (num) num.textContent = at + 1;
        /* хвост ленты может показывать сразу несколько кадров —
           тогда дальше листать некуда, даже если номер не последний */
        var scrollable = track.scrollWidth > track.clientWidth + 2;
        var atEnd = scrollable && track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        if (prev) prev.disabled = at === 0;
        if (next) next.disabled = at === shots.length - 1 || atEnd;
      }
      function go(i) {
        var n = Math.max(0, Math.min(shots.length - 1, i));
        track.scrollTo({ left: shots[n].offsetLeft - shots[0].offsetLeft,
                         behavior: calm ? 'auto' : 'smooth' });
        show(n);
      }
      track.addEventListener('scroll', function () {
        cancelAnimationFrame(tick);
        tick = requestAnimationFrame(function () { show(nearest()); });
      }, { passive: true });
      if (prev) prev.addEventListener('click', function () { go(at - 1); });
      if (next) next.addEventListener('click', function () { go(at + 1); });
      track.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); go(at - 1); }
      });
      show(0);
      /* пересчёт, когда дело раскрыли и размеры наконец настоящие */
      galleries.push({ root: gal, sync: function () { show(nearest()); } });
    });
  })();

  /* ── кадр во весь экран ────────────────────────────────────────
     Тоже лента с родной привязкой: тачпад и палец листают сами.
     Колесо мыши даёт только вертикальную дельту, поэтому здесь —
     и только здесь, внутри полноэкранного просмотра, где ничего
     другого прокручивать не нужно, — она переводится в шаг вбок. */
  (function () {
    var lb = document.querySelector('.lb');
    if (!lb) return;
    var track = lb.querySelector('[data-lbtrack]');
    var cap = lb.querySelector('[data-lbcap]');
    var iEl = lb.querySelector('[data-lbi]');
    var nEl = lb.querySelector('[data-lbn]');
    var prev = lb.querySelector('[data-lbprev]');
    var next = lb.querySelector('[data-lbnext]');
    var list = [], at = 0, tick = 0, lock = 0;

    function state(i) {
      at = Math.max(0, Math.min(list.length - 1, i));
      cap.textContent = list[at] ? list[at].cap : '';
      iEl.textContent = at + 1;
      prev.disabled = at === 0;
      next.disabled = at === list.length - 1;
    }
    function go(i, instant) {
      var n = Math.max(0, Math.min(list.length - 1, i));
      state(n);
      track.scrollTo({ left: n * track.clientWidth,
                       behavior: (instant || calm) ? 'auto' : 'smooth' });
    }
    function open(shots, i) {
      list = shots;
      track.innerHTML = shots.map(function (s, n) {
        var eager = n === i;
        return '<figure><img src="' + s.src + '" alt="' + s.alt.replace(/"/g, '&quot;') + '" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async"' + (eager ? ' fetchpriority="high"' : '') + '></figure>';
      }).join('');
      nEl.textContent = shots.length;
      prev.hidden = next.hidden = shots.length < 2;
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      requestAnimationFrame(function () { go(i, true); track.focus({ preventScroll: true }); });
    }

    track.addEventListener('scroll', function () {
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(function () {
        state(Math.round(track.scrollLeft / (track.clientWidth || 1)));
      });
    }, { passive: true });

    track.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   /* горизонтальный жест — родной */
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      var now = Date.now();
      if (now - lock < 320) return;
      lock = now;
      go(at + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    prev.addEventListener('click', function () { go(at - 1); });
    next.addEventListener('click', function () { go(at + 1); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(at - 1); }
    });
    lb.addEventListener('click', function (e) {
      if (e.target.tagName !== 'IMG' && e.target.closest('.lb__bar, .lb__x') === null) lb.close();
    });
    lb.addEventListener('close', function () { track.innerHTML = ''; });
    addEventListener('resize', function () { if (lb.open) go(at, true); });

    document.querySelectorAll('[data-gal] .gal__track').forEach(function (t) {
      var figs = [].slice.call(t.querySelectorAll('figure'));
      var shots = figs.map(function (f) {
        var im = f.querySelector('img'), fc = f.querySelector('figcaption');
        return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '',
                 cap: fc ? fc.textContent.trim() : '' };
      });
      figs.forEach(function (f, i) {
        var b = f.querySelector('.gal__zoom');
        if (b) b.addEventListener('click', function () { open(shots, i); });
      });
    });
  })();

  /* ── лента дел ────────────────────────────────────────────────
     Ближайшая к центру карточка — текущая. Так лента работает как
     Dock: остальные дела остаются видимыми по краям, но одно ведёт взгляд. */
  (function () {
    var track = document.querySelector('.deals__track');
    if (!track) return;
    /* Порядок ленты осознанный: 5 кейсов слева, центральная тройка,
       затем 5 оставшихся и приглашение как шестая карточка справа. */
    var order = ['th', 'es', 'sp', 'sb', 'chc', 'ch', 'st', 'cx', 'rb', 'bd', 'at', 'cv', 'hb'];
    var all = [].slice.call(track.children);
    var byId = {};
    var invitation = null;
    all.forEach(function (item) {
      if (item.hasAttribute('data-open')) byId[item.getAttribute('data-open')] = item;
      else invitation = item;
    });
    order.forEach(function (id) { if (byId[id]) track.appendChild(byId[id]); });
    if (invitation) track.appendChild(invitation);
    var items = [].slice.call(track.children);
    var num = document.querySelector('[data-di]');
    var title = document.querySelector('[data-dtitle]');
    var prev = document.querySelector('[data-dprev]');
    var next = document.querySelector('[data-dnext]');
    var at = 0, tick = 0, switchTimer = 0, pointerTarget = -1;

    function titleOf(item) {
      var name = item.querySelector('.card__name');
      return name ? name.textContent : 'Следующее дело';
    }
    function nearestToCenter() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0, distance = Infinity;
      items.forEach(function (item, i) {
        var itemCenter = item.offsetLeft + item.offsetWidth / 2;
        var delta = Math.abs(itemCenter - center);
        if (delta < distance) { distance = delta; best = i; }
      });
      return best;
    }
    function show(i) {
      at = Math.max(0, Math.min(items.length - 1, i));
      items.forEach(function (item, index) {
        item.dataset.active = index === at ? 'true' : 'false';
        item.dataset.neighbor = Math.abs(index - at) === 1 ? 'true' : 'false';
      });
      if (num) num.textContent = at + 1;
      if (title) title.textContent = titleOf(items[at]);
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === items.length - 1;
    }
    function centeredLeft(i) {
      var item = items[i];
      return Math.max(0, Math.min(track.scrollWidth - track.clientWidth,
        item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2));
    }
    function go(i, behavior) {
      var n = Math.max(0, Math.min(items.length - 1, i));
      var mode = behavior || (calm ? 'auto' : 'smooth');
      show(n);
      if (!calm && mode === 'smooth') {
        track.classList.remove('is-switching');
        void track.offsetWidth;
        track.classList.add('is-switching');
        clearTimeout(switchTimer);
        switchTimer = setTimeout(function () { track.classList.remove('is-switching'); }, 520);
      }
      track.scrollTo({ left: centeredLeft(n), behavior: mode });
    }
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(function () { show(nearestToCenter()); });
    }, { passive: true });
    if (prev) prev.addEventListener('click', function () { go(at - 1); });
    if (next) next.addEventListener('click', function () { go(at + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(items.length - 1); }
    });
    /* Первый клик на соседнюю карточку плавно приводит её в центр.
       Только повторный клик по уже активной карточке открывает подробный кейс. */
    track.addEventListener('pointerdown', function (e) {
      var item = e.target.closest('.card[data-open]');
      pointerTarget = item && track.contains(item) ? items.indexOf(item) : -1;
    }, { passive: true });
    track.addEventListener('click', function (e) {
      var item = e.target.closest('.card[data-open]');
      if (!item || !track.contains(item)) return;
      var index = items.indexOf(item);
      pointerTarget = -1;
      if (index === at) return;
      e.preventDefault();
      e.stopPropagation();
      go(index, 'smooth');
    }, true);
    items.forEach(function (item, index) {
      item.addEventListener('focus', function () {
        if (pointerTarget !== index) go(index);
      });
    });
    var featured = items.reduce(function (result, item, index) {
      if (item.hasAttribute('data-featured')) result.push(index);
      return result;
    }, []);
    var initial = featured.length ? featured[Math.floor(featured.length / 2)] : 0;
    show(initial);
    requestAnimationFrame(function () { go(initial, 'auto'); });
    window.addEventListener('resize', function () { go(at, 'auto'); });
  })();
})();
