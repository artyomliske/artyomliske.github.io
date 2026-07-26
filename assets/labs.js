/* Живые стенды кейсов.
   В каждом стенде слева — код, скопированный из репозитория проекта,
   справа — он же в работе. Логика ниже повторяет исходники строка в строку;
   для Python-проектов это перенос на JS, для TypeScript — та же функция. */
(function () {
  'use strict';

  var root = document.documentElement;
  function lang() { return root.getAttribute('data-lang') === 'en' ? 'en' : 'ru'; }
  function t(o) { return o[lang()]; }
  function num(n, d) {
    return Number(n).toLocaleString(lang() === 'en' ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: d || 0, maximumFractionDigits: d || 0
    });
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── подсветка кода ───────────────────────────────────── */
  var KEYWORDS = {
    py: 'def|return|if|elif|else|raise|await|async|try|except|from|import|and|or|not|None|True|False|class|in|is|for|while|lambda',
    ts: 'export|function|const|let|var|return|for|of|in|if|else|new|interface|type|break|while|null|true|false|number|string|boolean|Infinity|Math',
    js: 'function|const|let|var|return|for|of|in|if|else|new|break|while|null|true|false|Math|Date',
    sql: 'ALTER|TABLE|ADD|CONSTRAINT|EXCLUDE|USING|gist|WHERE|IN|WITH|AND|OR|NOT|NULL'
  };

  function highlight(line, kind) {
    var trimmed = line.trim();
    if (trimmed.slice(0, 2) === '/*' || trimmed[0] === '*' || trimmed.slice(0, 2) === '*/') {
      return '<span class="t-c">' + esc(line) + '</span>';
    }
    var safe = esc(line);
    var kw = KEYWORDS[kind] || KEYWORDS.js;
    var re = new RegExp(
      '(#[^\\n]*|//[^\\n]*|--[^\\n]*)' +          // комментарий
      '|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')' + // строка
      '|\\b(' + kw + ')\\b' +                     // ключевое слово
      '|\\b(\\d+(?:\\.\\d+)?)\\b',                // число
      'g'
    );
    return safe.replace(re, function (m, c, s, k, n) {
      if (c) return '<span class="t-c">' + c + '</span>';
      if (s) return '<span class="t-s">' + s + '</span>';
      if (k) return '<span class="t-k">' + k + '</span>';
      return '<span class="t-n">' + n + '</span>';
    });
  }

  function paint(pre) {
    var code = pre.querySelector('code');
    var kind = pre.getAttribute('data-code');
    var lines = code.textContent.replace(/\s+$/, '').split('\n');
    code.innerHTML = lines.map(function (l, i) {
      return '<span class="ln" data-line="' + (i + 1) + '">' + (highlight(l, kind) || '&nbsp;') + '</span>';
    }).join('');
  }

  /* Подсветить строки блока кода: mark(lab, 0, [3,4], 'is-hot') */
  function mark(lab, blockIndex, lines, cls) {
    var pres = lab.querySelectorAll('.code');
    Array.prototype.forEach.call(pres, function (pre) {
      Array.prototype.forEach.call(pre.querySelectorAll('.ln'), function (ln) {
        ln.classList.remove('is-hot', 'is-bad');
      });
    });
    var pre = pres[blockIndex];
    if (!pre) return;
    lines.forEach(function (n) {
      var ln = pre.querySelector('.ln[data-line="' + n + '"]');
      if (ln) ln.classList.add(cls || 'is-hot');
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.code'), paint);

  var renderers = [];
  function register(fn) { renderers.push(fn); fn(); }
  window.addEventListener('langchange', function () {
    renderers.forEach(function (fn) { fn(); });
  });

  function labEl(name) { return document.querySelector('[data-lab="' + name + '"]'); }

  /* ══════════════════════════════════════════════════════════
     1 · StudioCRM — occupied_interval + EXCLUDE
     ══════════════════════════════════════════════════════════ */
  (function () {
    var lab = labEl('booking');
    if (!lab) return;

    var DAY_START = 600, DAY_END = 1320;         // 10:00 … 22:00 в минутах
    var BOOKED = [
      { start: 660, end: 780, buf: 30 },          // 11:00–13:00
      { start: 960, end: 1080, buf: 30 }          // 16:00–18:00
    ];
    var view = lab.querySelector('[data-view]');
    var out = lab.querySelector('[data-out]');
    var inputs = {
      start: lab.querySelector('[data-in="start"]'),
      dur: lab.querySelector('[data-in="dur"]'),
      buf: lab.querySelector('[data-in="buf"]')
    };
    var accepted = [];

    function fmt(m) {
      var h = Math.floor(m / 60), mm = m % 60;
      return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
    }
    function pct(m) { return ((m - DAY_START) / (DAY_END - DAY_START)) * 100; }

    // app/domain/scheduling.py → occupied_interval
    function occupiedInterval(start, end, bufBefore, bufAfter) {
      return { start: start - bufBefore, end: end + bufAfter };
    }
    // Interval.overlaps — полуоткрытые интервалы, как && для tstzrange
    function overlaps(a, b) { return a.start < b.end && b.start < a.end; }

    function candidate() {
      var start = parseInt(inputs.start.value, 10) * 60;
      var end = start + parseInt(inputs.dur.value, 10) * 60;
      var buf = parseInt(inputs.buf.value, 10);
      return { shoot: { start: start, end: end }, slot: occupiedInterval(start, end, buf, buf), buf: buf };
    }

    function draw() {
      var c = candidate();
      var all = BOOKED.concat(accepted);
      var clash = all.some(function (b) {
        return overlaps(c.slot, occupiedInterval(b.start, b.end, b.buf, b.buf));
      });
      var over = c.slot.end > DAY_END || c.slot.start < DAY_START;

      var blocks = all.map(function (b) {
        var occ = occupiedInterval(b.start, b.end, b.buf, b.buf);
        return '<div class="tl__slot tl__slot--buffer" style="left:' + pct(occ.start) + '%;width:' + (pct(occ.end) - pct(occ.start)) + '%"></div>' +
               '<div class="tl__slot" style="left:' + pct(b.start) + '%;width:' + (pct(b.end) - pct(b.start)) + '%">' + fmt(b.start) + '</div>';
      }).join('');

      var tryCls = 'tl__slot tl__slot--try' + (clash || over ? ' tl__slot--bad' : ' tl__slot--ok');
      var tryBlock = '<div class="' + tryCls + '" style="left:' + Math.max(0, pct(c.slot.start)) + '%;width:' +
        Math.max(4, Math.min(100, pct(c.slot.end)) - Math.max(0, pct(c.slot.start))) + '%">' +
        fmt(c.shoot.start) + '</div>';

      view.innerHTML =
        '<div class="tl">' +
          '<div class="tl__scale"><span>10</span><span>13</span><span>16</span><span>19</span><span>22</span></div>' +
          '<div class="tl__track"><div class="tl__row">' + blocks + '</div></div>' +
          '<div class="tl__row" style="position:relative;height:1.9rem">' + tryBlock + '</div>' +
        '</div>';

      return { c: c, clash: clash, over: over };
    }

    function report(state, submitted) {
      var c = state.c;
      var head = '<b>slot_start</b> = ' + fmt(c.slot.start) + ' · <b>slot_end</b> = ' + fmt(c.slot.end) +
        ' (' + t({ ru: 'съёмка', en: 'shoot' }) + ' ' + fmt(c.shoot.start) + '–' + fmt(c.shoot.end) +
        ', ' + t({ ru: 'буфер', en: 'buffer' }) + ' ' + c.buf + ')';

      if (!submitted) {
        out.innerHTML = head + '<br>' + t({
          ru: 'Границы посчитаны. Жмите «Забронировать» — вердикт выносит база.',
          en: 'Bounds computed. Hit “Book it” — the database delivers the verdict.'
        });
        mark(lab, 0, [16, 17, 18, 19]);
        return;
      }
      if (state.over) {
        out.innerHTML = head + '<br><span class="v-bad">' + t({
          ru: 'Слот выходит за рабочий день зала.', en: 'The slot runs outside the room’s working day.'
        }) + '</span>';
        mark(lab, 0, []);
        return;
      }
      if (state.clash) {
        out.innerHTML = head +
          '<br><span class="v-bad">ERROR 23P01: conflicting key value violates exclusion constraint "bookings_no_overlap_resource"</span>' +
          '<br>' + t({
            ru: 'Бронь не создана. Проверку сделала БД, а не приложение.',
            en: 'No booking was created. The database rejected it, not the app.'
          });
        mark(lab, 1, [4], 'is-bad');
        return;
      }
      accepted.push({ start: state.c.shoot.start, end: state.c.shoot.end, buf: state.c.buf });
      out.innerHTML = head + '<br><span class="v-ok">INSERT 0 1</span> — ' + t({
        ru: 'слот удержан, время рядом стало недоступно.',
        en: 'slot held; the time around it is now unavailable.'
      });
      mark(lab, 0, [16, 17, 18, 19]);
      draw();
    }

    Object.keys(inputs).forEach(function (k) {
      inputs[k].addEventListener('change', function () { report(draw(), false); });
    });
    lab.querySelector('[data-run]').addEventListener('click', function () { report(draw(), true); });

    register(function () { report(draw(), false); });
  })();

  /* ══════════════════════════════════════════════════════════
     2 · Chip House CRM — autoSeat
     ══════════════════════════════════════════════════════════ */
  (function () {
    var lab = labEl('seating');
    if (!lab) return;

    var SEATS_PER_TABLE = 10;
    var view = lab.querySelector('[data-view]');
    var out = lab.querySelector('[data-out]');
    var tables, entries, counter, lastAssignments, lastFull;

    // packages/shared/src/domain/seating.ts → autoSeat (тот же алгоритм)
    function autoSeat(tables, entries, seatsPerTable) {
      seatsPerTable = seatsPerTable || SEATS_PER_TABLE;
      var occupancy = {};
      tables.forEach(function (t) { occupancy[t] = {}; });

      entries.forEach(function (e) {
        if (e.status === 'in' && e.table && e.seat != null) occupancy[e.table][e.seat] = true;
      });

      var assignments = [];
      var unseated = entries.filter(function (e) { return e.status === 'in' && !e.table; });

      unseated.forEach(function (e) {
        var bestTable = null, bestCount = Infinity;
        tables.forEach(function (t) {
          var size = Object.keys(occupancy[t]).length;
          if (size < seatsPerTable && size < bestCount) { bestTable = t; bestCount = size; }
        });
        if (!bestTable) { lastFull = true; return; }
        var seat = 1;
        while (occupancy[bestTable][seat]) seat++;
        occupancy[bestTable][seat] = true;
        assignments.push({ playerId: e.playerId, table: bestTable, seat: seat });
      });
      return assignments;
    }

    function apply() {
      lastFull = false;
      var assignments = autoSeat(tables, entries, SEATS_PER_TABLE);
      assignments.forEach(function (a) {
        var e = entries.filter(function (x) { return x.playerId === a.playerId; })[0];
        if (e) { e.table = a.table; e.seat = a.seat; }
      });
      lastAssignments = assignments;
    }

    function reset() {
      tables = ['1', '2'];
      entries = [];
      counter = 0;
      lastAssignments = [];
      lastFull = false;
      for (var i = 0; i < 7; i++) addPlayer();
      apply();
    }
    function addPlayer() {
      counter += 1;
      entries.push({ playerId: 'p' + counter, table: null, seat: null, status: 'in' });
    }

    function draw() {
      var fresh = {};
      lastAssignments.forEach(function (a) { fresh[a.table + ':' + a.seat] = true; });

      view.innerHTML = '<div class="tables">' + tables.map(function (tid) {
        var taken = {};
        entries.forEach(function (e) {
          if (e.status === 'in' && e.table === tid && e.seat != null) taken[e.seat] = true;
        });
        var seats = '';
        for (var s = 1; s <= SEATS_PER_TABLE; s++) {
          var cls = 'seat' + (taken[s] ? (fresh[tid + ':' + s] ? ' is-new' : ' is-taken') : '');
          seats += '<span class="' + cls + '"></span>';
        }
        return '<div class="tbl"><span class="tbl__name">' + t({ ru: 'Стол', en: 'T' }) + ' ' + tid + '</span>' +
          '<span class="tbl__seats">' + seats + '</span>' +
          '<span class="tbl__count">' + Object.keys(taken).length + '/' + SEATS_PER_TABLE + '</span></div>';
      }).join('') + '</div>';

      var seated = entries.filter(function (e) { return e.status === 'in' && e.table; }).length;
      var free = tables.length * SEATS_PER_TABLE - seated;

      var line = lastAssignments.length
        ? 'autoSeat() → ' + (lastAssignments.length > 2
            ? '[' + lastAssignments.length + ' ' + t({ ru: 'назначений', en: 'assignments' }) + ']'
            : JSON.stringify(lastAssignments).replace(/","/g, '", "'))
        : 'autoSeat() → []';

      out.innerHTML = '<b>' + seated + '</b> ' + t({ ru: 'за столом', en: 'seated' }) +
        ' · <b>' + free + '</b> ' + t({ ru: 'мест свободно', en: 'seats free' }) +
        '<br>' + esc(line) +
        (lastFull ? '<br><span class="v-bad">' + t({
          ru: 'Свободных мест не осталось — нужен ещё стол.',
          en: 'No free seats left — add a table.'
        }) + '</span>' : '');

      mark(lab, 0, lastFull ? [29] : [22, 23, 24, 25, 26, 27, 28], lastFull ? 'is-bad' : 'is-hot');
    }

    lab.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'add') addPlayer();
      if (act === 'add10') { for (var i = 0; i < 10; i++) addPlayer(); }
      if (act === 'table') tables.push(String(tables.length + 1));
      if (act === 'bust') {
        var seatedList = entries.filter(function (x) { return x.status === 'in' && x.table; });
        if (seatedList.length) seatedList[seatedList.length - 1].status = 'out';
        lastAssignments = [];
      }
      if (act === 'reset') { reset(); draw(); return; }
      apply();
      draw();
    });

    reset();
    register(draw);
  })();

  /* ══════════════════════════════════════════════════════════
     3 · Chip House Club — autoPoints
     ══════════════════════════════════════════════════════════ */
  (function () {
    var lab = labEl('points');
    if (!lab) return;

    var view = lab.querySelector('[data-view]');
    var out = lab.querySelector('[data-out]');
    var ins = {
      place: lab.querySelector('[data-in="place"]'),
      field: lab.querySelector('[data-in="field"]'),
      base: lab.querySelector('[data-in="base"]')
    };

    // packages/shared/src/domain/points.ts → autoPoints
    function autoPoints(place, fieldSize, base) {
      var n = Math.max(1, Math.floor(Number(fieldSize) || 1));
      var p = Math.max(1, Math.floor(Number(place) || 1));
      var b = Number(base) || 10;
      return Math.round((b * Math.sqrt(n)) / Math.sqrt(p));
    }

    function draw() {
      var field = parseInt(ins.field.value, 10);
      var base = parseInt(ins.base.value, 10);
      if (parseInt(ins.place.value, 10) > field) ins.place.value = field;
      ins.place.max = field;
      var place = parseInt(ins.place.value, 10);

      lab.querySelector('[data-outv="place"]').textContent = place;
      lab.querySelector('[data-outv="field"]').textContent = field;
      lab.querySelector('[data-outv="base"]').textContent = base;

      var shown = Math.min(12, field);
      var vals = [];
      for (var i = 1; i <= shown; i++) vals.push(autoPoints(i, field, base));
      var max = Math.max.apply(null, vals);

      view.innerHTML =
        '<div class="bars">' + vals.map(function (v, i) {
          return '<div class="' + (i + 1 === place ? 'is-me' : '') + '" style="height:' +
            Math.max(2, (v / max) * 100) + '%" title="' + (i + 1) + ' → ' + v + '"></div>';
        }).join('') + '</div>' +
        '<div class="bars__x">' + vals.map(function (v, i) {
          return '<span>' + (i + 1) + '</span>';
        }).join('') + '</div>';

      var pts = autoPoints(place, field, base);
      out.innerHTML =
        'autoPoints(' + place + ', ' + field + ', ' + base + ') → <b>' + pts + '</b>' +
        '<br>' + base + ' · √' + field + ' / √' + place + ' = ' +
        (base * Math.sqrt(field) / Math.sqrt(place)).toFixed(2) + ' → round → <b>' + pts + '</b>' +
        '<br>' + t({
          ru: 'Первое место в поле на ' + field + ' даёт ' + autoPoints(1, field, base) + ' очков.',
          en: 'First place in a field of ' + field + ' pays ' + autoPoints(1, field, base) + ' points.'
        });

      mark(lab, 0, [15]);
    }

    Object.keys(ins).forEach(function (k) {
      ins[k].addEventListener('input', draw);
    });
    register(draw);
  })();

  /* ══════════════════════════════════════════════════════════
     4 · Рублёвские сказки — certStatus + погашение
     ══════════════════════════════════════════════════════════ */
  (function () {
    var lab = labEl('cert');
    if (!lab) return;

    var DAY = 86400000;
    var view = lab.querySelector('[data-view]');
    var out = lab.querySelector('[data-out]');
    var pick = lab.querySelector('[data-in="cert"]');
    var totalSel = lab.querySelector('[data-in="total"]');
    var certs;

    function reset() {
      certs = [
        { code: 'RS-8KQP-4M2X', nominal: 5000, used: false, status: 'active', expiresAt: new Date(Date.now() + 180 * DAY).toISOString() },
        { code: 'RS-T3VN-9WQ7', nominal: 3000, used: true, status: 'used', expiresAt: new Date(Date.now() + 90 * DAY).toISOString(), orderTotal: 2800, burned: 200, usedOrder: 'RS-1043' },
        { code: 'RS-Z5HD-2LP4', nominal: 4000, used: false, status: 'active', expiresAt: new Date(Date.now() - 30 * DAY).toISOString() }
      ];
    }

    // public/assets/app.js → certStatus
    function certStatus(c) {
      if (!c) return 'invalid';
      if (c.used) return 'used';
      if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'expired';
      return 'active';
    }

    var LABEL = {
      active: { ru: 'Действует', en: 'Active' },
      used: { ru: 'Погашен', en: 'Redeemed' },
      expired: { ru: 'Истёк', en: 'Expired' }
    };

    function draw(justRedeemed) {
      var c = certs[parseInt(pick.value, 10)];
      var st = certStatus(c);
      var chip = st === 'active' ? 'chip--ok' : (st === 'used' ? 'chip--mute' : 'chip--bad');

      var rows =
        '<dt>' + t({ ru: 'Номинал', en: 'Value' }) + '</dt><dd>' + num(c.nominal) + ' ₽</dd>' +
        '<dt>' + t({ ru: 'Действует до', en: 'Valid until' }) + '</dt><dd>' +
          new Date(c.expiresAt).toLocaleDateString(lang() === 'en' ? 'en-GB' : 'ru-RU') + '</dd>';
      if (c.used) {
        rows += '<dt>' + t({ ru: 'Заказ', en: 'Order' }) + '</dt><dd>' + c.usedOrder + '</dd>' +
          '<dt>' + t({ ru: 'Списано', en: 'Applied' }) + '</dt><dd>' + num(c.orderTotal) + ' ₽</dd>' +
          '<dt>' + t({ ru: 'Сгорело', en: 'Burned' }) + '</dt><dd>' + num(c.burned) + ' ₽</dd>';
      }

      view.innerHTML =
        '<div class="certcard">' +
          '<div class="certcard__top"><span class="certcard__code">' + c.code + '</span>' +
          '<span class="chip ' + chip + '">' + t(LABEL[st]) + '</span></div>' +
          '<dl>' + rows + '</dl>' +
        '</div>';

      if (justRedeemed) {
        out.innerHTML = '<span class="v-ok">' + t({ ru: 'Погашен', en: 'Redeemed' }) + '</span> · ' +
          t({ ru: 'списано', en: 'applied' }) + ' <b>' + num(c.orderTotal) + ' ₽</b>' +
          (c.burned > 0 ? ' · ' + t({ ru: 'сгорело', en: 'burned' }) + ' <b>' + num(c.burned) + ' ₽</b>' : '') +
          '<br>' + t({ ru: 'Зафиксировано: заказ ', en: 'Recorded: order ' }) + c.usedOrder +
          t({ ru: ', касса, время.', en: ', desk, timestamp.' });
        mark(lab, 0, [10, 11, 12, 13, 14, 15]);
        return;
      }

      var verdict = {
        active: { ru: 'Можно гасить.', en: 'Ready to redeem.' },
        used: { ru: 'Повторно погасить нельзя — уже списан.', en: 'Cannot be redeemed twice — already applied.' },
        expired: { ru: 'Срок действия истёк.', en: 'Past its expiry date.' }
      };
      out.innerHTML = 'certStatus(c) → <b>"' + st + '"</b><br>' +
        '<span class="' + (st === 'active' ? 'v-ok' : 'v-bad') + '">' + t(verdict[st]) + '</span>';
      mark(lab, 0, st === 'used' ? [4] : st === 'expired' ? [5] : [6], st === 'active' ? 'is-hot' : 'is-bad');
    }

    lab.querySelector('[data-run]').addEventListener('click', function () {
      var c = certs[parseInt(pick.value, 10)];
      var total = parseInt(totalSel.value, 10);
      if (c && !c.used && certStatus(c) === 'active') {
        c.used = true;
        c.status = 'used';
        c.usedOrder = 'RS-' + (1050 + parseInt(pick.value, 10));
        c.orderTotal = total;
        c.burned = Math.max(0, c.nominal - total);
        draw(true);
      } else {
        draw(false);
      }
    });
    lab.querySelector('[data-act="reset"]').addEventListener('click', function () { reset(); draw(false); });
    pick.addEventListener('change', function () { draw(false); });
    totalSel.addEventListener('change', function () { draw(false); });

    reset();
    register(function () { draw(false); });
  })();

  /* ══════════════════════════════════════════════════════════
     5 · Калькулятор смет — wallArea
     ══════════════════════════════════════════════════════════ */
  (function () {
    var lab = labEl('wall');
    if (!lab) return;

    var view = lab.querySelector('[data-view]');
    var out = lab.querySelector('[data-out]');
    var ins = {
      perimeter: lab.querySelector('[data-in="perimeter"]'),
      height: lab.querySelector('[data-in="height"]'),
      windows: lab.querySelector('[data-in="windows"]'),
      doorways: lab.querySelector('[data-in="doorways"]')
    };

    // client/src/types/wizard.ts → openingsArea / wallArea
    function openingsArea(a) { return (a.windows || 0) * 1.8 + (a.doorways || 0) * 2.0; }
    function wallArea(a) {
      var gross = a.perimeter * a.ceilingHeight;
      var net = gross - openingsArea(a);
      return Math.max(net, gross * 0.5);
    }

    var PRICE = 450; // ₽/м², демонстрационная цена малярки

    function draw() {
      var a = {
        perimeter: parseInt(ins.perimeter.value, 10),
        ceilingHeight: parseInt(ins.height.value, 10) / 10,
        windows: parseInt(ins.windows.value, 10),
        doorways: parseInt(ins.doorways.value, 10)
      };
      lab.querySelector('[data-outv="perimeter"]').textContent = a.perimeter;
      lab.querySelector('[data-outv="height"]').textContent = a.ceilingHeight.toFixed(1);
      lab.querySelector('[data-outv="windows"]').textContent = a.windows;
      lab.querySelector('[data-outv="doorways"]').textContent = a.doorways;

      var gross = a.perimeter * a.ceilingHeight;
      var openings = openingsArea(a);
      var net = gross - openings;
      var area = wallArea(a);
      var floored = net < gross * 0.5;

      var cutPct = Math.min(100, (openings / gross) * 100);
      view.innerHTML =
        '<div class="wallviz">' +
          '<div class="wallviz__bar">' +
            '<div class="wallviz__fill" style="width:' + (100 - cutPct) + '%"></div>' +
            '<div class="wallviz__cut" style="width:' + cutPct + '%"></div>' +
          '</div>' +
          '<div class="wallviz__legend">' +
            '<span>' + t({ ru: 'валовая', en: 'gross' }) + ' ' + num(gross, 1) + ' м²</span>' +
            '<span>' + t({ ru: 'проёмы', en: 'openings' }) + ' −' + num(openings, 1) + ' м²</span>' +
            '<span>' + t({ ru: 'к оплате', en: 'billable' }) + ' ' + num(area, 1) + ' м²</span>' +
          '</div>' +
        '</div>';

      out.innerHTML =
        'wallArea() → <b>' + num(area, 1) + ' м²</b>' +
        '<br>' + a.perimeter + ' × ' + a.ceilingHeight.toFixed(1) + ' − (' + a.windows + '·1.8 + ' +
        a.doorways + '·2.0) = ' + num(net, 1) + ' м²' +
        (floored
          ? '<br><span class="v-bad">' + t({
              ru: 'Сработала нижняя граница 50% — проёмов больше половины стены.',
              en: 'The 50% floor kicked in — openings exceed half the wall.'
            }) + '</span>'
          : '<br>' + t({ ru: 'Малярка по каталогу', en: 'Painting from the catalogue' }) +
            ': ' + num(area, 1) + ' × ' + PRICE + ' ₽ = <b>' + num(Math.round(area * PRICE)) + ' ₽</b>');

      mark(lab, 0, floored ? [11] : [9, 10, 11]);
    }

    Object.keys(ins).forEach(function (k) { ins[k].addEventListener('input', draw); });
    register(draw);
  })();

  /* ══════════════════════════════════════════════════════════
     6 · SMM-бот — модерация и публикация
     ══════════════════════════════════════════════════════════ */
  (function () {
    var lab = labEl('moderation');
    if (!lab) return;

    var view = lab.querySelector('[data-view]');
    var out = lab.querySelector('[data-out]');
    var DRAFTS = [
      {
        ru: 'Утро начинается не с кофе, а с выбора кофе.\n\nСегодня в подборке — три обжарки, которые не спутать: ягодная эфиопия, ореховая бразилия и тёмная классика для турки.\n\nЗабрать в магазине или заказать доставкой.',
        en: 'Morning does not start with coffee — it starts with choosing one.\n\nToday: three roasts you cannot confuse — berry Ethiopia, nutty Brazil, and a dark classic for the pot.\n\nPick up in store or order delivery.'
      },
      {
        ru: 'Ставим чайник и разбираемся, чем отличается фильтр от эспрессо.\n\nКоротко: помол, время контакта с водой и характер напитка. Первое — про кислотность, второе — про плотность.\n\nВ карточках подобрали по одной позиции на каждый способ.',
        en: 'Kettle on — let us sort out filter versus espresso.\n\nShort version: grind, contact time, and the character of the cup. One is about acidity, the other about body.\n\nWe picked one bag for each method.'
      },
      {
        ru: 'Скидка недели: −20% на всю обжарку прошлой партии.\n\nЗёрна свежие, просто освобождаем полку под новый привоз. Забрать можно до воскресенья.',
        en: 'This week: −20% on the entire previous roast batch.\n\nThe beans are fresh, we are simply clearing the shelf for the new delivery. Available until Sunday.'
      }
    ];
    var idx = 0;
    var published = false;

    function draw() {
      var kb = published
        ? '<div class="tg__done">' + t({ ru: 'Опубликовано ✅', en: 'Published ✅' }) + '</div>'
        : '<div class="tg__kb">' +
            '<button type="button" data-act="approve">✅ ' + t({ ru: 'Одобрить', en: 'Approve' }) + '</button>' +
            '<button type="button" data-act="again">🔄 ' + t({ ru: 'Заново', en: 'Regenerate' }) + '</button>' +
            '<button type="button" data-act="edit">✂️ ' + t({ ru: 'Править текст', en: 'Edit text' }) + '</button>' +
            '<button type="button" data-act="image">🖼 ' + t({ ru: 'Картинка ИИ', en: 'AI image' }) + '</button>' +
            '<button type="button" class="wide" data-act="own">📷 ' + t({ ru: 'Своё фото', en: 'Own photo' }) + '</button>' +
          '</div>';

      view.innerHTML =
        '<div class="tg">' +
          '<div class="tg__photo">' + t({ ru: 'Картинка поста', en: 'Post image' }) + ' · ' + (idx + 1) + '</div>' +
          '<div class="tg__text">' + esc(t(DRAFTS[idx])) + '</div>' +
          kb +
        '</div>' +
        (published
          ? '<button type="button" class="runbtn" data-act="reset">' + t({ ru: 'Новый черновик', en: 'New draft' }) + '</button>'
          : '');

      if (published) {
        out.innerHTML = '<span class="v-ok">' + t({
          ru: 'Пост ушёл в канал. Кнопки сняты — второй раз тот же черновик опубликовать нельзя.',
          en: 'The post went to the channel. Buttons removed — the same draft cannot be published twice.'
        }) + '</span>';
        mark(lab, 0, [20, 21, 22, 23]);
      } else {
        out.innerHTML = t({
          ru: 'Черновик ждёт решения. Владелец нажимает одну кнопку — дальше бот делает всё сам.',
          en: 'The draft awaits a decision. The owner presses one button — the bot handles the rest.'
        });
        mark(lab, 0, [4, 5]);
      }
    }

    lab.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'approve') published = true;
      if (act === 'again' || act === 'image' || act === 'edit' || act === 'own') idx = (idx + 1) % DRAFTS.length;
      if (act === 'reset') { published = false; idx = (idx + 1) % DRAFTS.length; }
      draw();
    });

    register(draw);
  })();
})();
