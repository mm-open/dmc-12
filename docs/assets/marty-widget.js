/* marty-widget.js — floating read-only chat helper ("Marty") for dmc-12.ai.
 * Talks to mm-backend POST /marty/chat (SSE). Vanilla IIFE, no deps; inherits
 * the host page's :root design tokens (crimson accent + cream surface, squared
 * and flat to match the landing page). Hardcoded var() fallbacks keep the
 * still-rounded blue guide pages correct. v1 is read-only: Marty searches
 * inventory and pulls live pricing only. */
(function () {
  'use strict';
  if (window.__martyLoaded) return;
  window.__martyLoaded = true;

  // ── Config ──────────────────────────────────────────────────────────────
  var BACKEND = 'https://mm-backend-572952183767.us-central1.run.app';
  var ENDPOINT = BACKEND + '/marty/chat';
  var MAX_HISTORY = 30; // bound the transcript we send back each turn

  var sessionId =
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : 's-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);

  var messages = []; // [{ role: 'user'|'assistant', content }]
  var busy = false;
  var greeted = false;
  var els = {};

  // ── Styles (scoped under .marty-*, referencing dmc12.css :root tokens) ────
  function injectStyles() {
    var css =
      '.marty-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;' +
      'display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:0;' +
      'border:1px solid var(--accent,#1537a6);background:var(--accent,#1537a6);color:#fff;' +
      "font-family:'Barlow','Inter',system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;" +
      'box-shadow:0 6px 20px rgba(10,10,10,.18);transition:transform .12s,box-shadow .12s}' +
      '.marty-launch:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,10,10,.24)}' +
      '.marty-launch[hidden]{display:none}' +
      '.marty-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:370px;max-width:calc(100vw - 32px);' +
      'height:560px;max-height:calc(100vh - 40px);display:none;flex-direction:column;overflow:hidden;' +
      'background:var(--bg,#fff);border:1px solid var(--line-strong,#cfcec6);border-radius:0;' +
      "font-family:'Barlow','Inter',system-ui,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.22)}" +
      '.marty-panel.open{display:flex}' +
      '.marty-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;' +
      'background:var(--accent,#1537a6);color:#fff}' +
      '.marty-head .ttl{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px}' +
      '.marty-head .sub{font-size:11px;opacity:.85;font-weight:400}' +
      '.marty-x{appearance:none;border:0;background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.85;padding:2px 6px}' +
      '.marty-x:hover{opacity:1}' +
      '.marty-log{flex:1;overflow-y:auto;padding:14px;background:var(--bg-soft,#f7f7f5);display:flex;flex-direction:column;gap:10px}' +
      '.marty-msg{max-width:84%;padding:9px 12px;border-radius:0;font-size:14px;line-height:1.5;word-wrap:break-word}' +
      '.marty-msg.user{align-self:flex-end;background:var(--accent,#1537a6);color:#fff;border-bottom-right-radius:0;white-space:pre-wrap}' +
      '.marty-msg.bot{align-self:flex-start;max-width:90%;background:var(--bg,#fff);color:var(--ink,#111);border:1px solid var(--line,#e6e5e0);border-bottom-left-radius:0}' +
      // Markdown elements inside bot bubbles (structure supplied by renderMarkdown).
      '.marty-msg.bot p{margin:0 0 8px}.marty-msg.bot p:last-child{margin-bottom:0}' +
      '.marty-msg.bot ul,.marty-msg.bot ol{margin:6px 0;padding-left:20px}.marty-msg.bot li{margin:2px 0}' +
      '.marty-msg.bot strong{font-weight:600}' +
      ".marty-msg.bot code{font-family:'JetBrains Mono',monospace;font-size:12.5px;background:var(--accent-soft,#eef1fb);padding:1px 5px;border-radius:0}" +
      '.marty-msg.bot a{color:var(--accent,#1537a6);text-decoration:underline}' +
      '.marty-tbl{overflow-x:auto;margin:6px 0;-webkit-overflow-scrolling:touch}' +
      '.marty-msg.bot table{border-collapse:collapse;width:100%;font-size:12.5px}' +
      '.marty-msg.bot th,.marty-msg.bot td{border:1px solid var(--line,#e6e5e0);padding:5px 8px;text-align:left;white-space:nowrap}' +
      '.marty-msg.bot th{background:var(--accent-soft,#eef1fb);font-weight:600}' +
      '.marty-tool{align-self:flex-start;font-size:12px;color:var(--ink-mute,#78786f);' +
      "font-family:'JetBrains Mono',monospace;padding:2px 4px}" +
      '.marty-foot{padding:10px 12px;border-top:1px solid var(--line,#e6e5e0);background:var(--bg,#fff)}' +
      '.marty-row{display:flex;gap:8px;align-items:flex-end}' +
      '.marty-row textarea{flex:1;resize:none;border:1px solid var(--line-strong,#cfcec6);border-radius:0;' +
      "padding:9px 11px;font-family:'Barlow','Inter',system-ui,sans-serif;font-size:14px;line-height:1.4;max-height:96px;outline:none}" +
      '.marty-row textarea:focus{border-color:var(--accent,#1537a6)}' +
      '.marty-send{appearance:none;border:0;border-radius:0;background:var(--accent,#1537a6);color:#fff;' +
      'font-weight:600;font-size:14px;padding:9px 14px;cursor:pointer}' +
      '.marty-send:disabled{opacity:.5;cursor:default}' +
      '.marty-disc{margin-top:7px;font-size:10.5px;color:var(--ink-mute,#78786f);line-height:1.4}' +
      // Phones (<=480px): full-screen takeover; tablet/desktop keep the floating card.
      '@media (max-width:480px){' +
      '.marty-panel{inset:0;width:100%;max-width:100%;height:100dvh;max-height:none;border:0;border-radius:0}' +
      '.marty-head{padding-top:calc(14px + env(safe-area-inset-top))}' +
      '.marty-foot{padding-bottom:calc(10px + env(safe-area-inset-bottom))}' +
      '.marty-msg{max-width:90%}' +
      '.marty-launch{right:16px;bottom:16px}' +
      '}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function icon(glyph) {
    var s = el('span', null, glyph);
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function scrollDown() {
    els.log.scrollTop = els.log.scrollHeight;
  }

  function addMsg(role) {
    var node = el('div', 'marty-msg ' + (role === 'user' ? 'user' : 'bot'));
    els.log.appendChild(node);
    scrollDown();
    return node;
  }

  // ── Markdown (dependency-free, curated GFM subset) ────────────────────────
  // Content is LLM output + live tool data, so we build the DOM with
  // createElement + textContent only — never innerHTML. Text can therefore
  // never be parsed as HTML (escaping is intrinsic), and we still get real
  // <table>/<ul>/<strong>/<a> nodes. No build step, no library.
  function isUl(line) {
    return /^\s*[-*]\s+/.test(line);
  }
  function isOl(line) {
    // 1–2 digit markers only — a line-leading 3+ digit number (a model year
    // "2024." or a price) is data, not a list ordinal, so it stays as text.
    return /^\s*\d{1,2}\.\s+/.test(line);
  }
  function isSeparatorRow(line) {
    var t = line.trim();
    return t.indexOf('|') !== -1 && t.indexOf('-') !== -1 && /^[\s|:-]+$/.test(t);
  }
  function isTableStart(lines, i) {
    // Require a body row (i+2) too, so a header+separator still streaming in
    // renders as text rather than briefly popping into an empty-bodied table.
    return (
      lines[i].indexOf('|') !== -1 &&
      i + 1 < lines.length &&
      isSeparatorRow(lines[i + 1]) &&
      i + 2 < lines.length &&
      lines[i + 2].indexOf('|') !== -1 &&
      lines[i + 2].trim() !== ''
    );
  }
  function splitRow(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    return s.split('|').map(function (c) {
      return c.trim();
    });
  }

  // Parse one line's inline spans (code, links, bold, italic) and append the
  // resulting text/element nodes to `parent`. Plain text goes through
  // createTextNode, so it can never be interpreted as markup. We iterate
  // matches via replace(regex, fn) and discard the returned string.
  function inlineInto(parent, text) {
    // Underscore italics are anchored with \b...\b so an intra-word underscore
    // (snake_case, file_name) can never start — nor be consumed by — an
    // emphasis match, even when a real _italic_ follows later on the same line.
    var re =
      /(`[^`]+`)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(\b_[^_\s][^_]*_\b)/g;
    var last = 0;
    text.replace(re, function (tok, g1, g2, g3, g4, g5, g6, offset) {
      if (offset > last) parent.appendChild(document.createTextNode(text.slice(last, offset)));
      if (g1) {
        parent.appendChild(el('code', null, tok.slice(1, -1)));
      } else if (g2) {
        var lb = tok.indexOf(']');
        var a = el('a', null, tok.slice(1, lb));
        a.href = tok.slice(tok.indexOf('(', lb) + 1, -1); // scheme allow-listed by the regex
        a.target = '_blank';
        a.rel = 'noopener nofollow';
        parent.appendChild(a);
      } else if (g3 || g4) {
        parent.appendChild(el('strong', null, tok.slice(2, -2)));
      } else {
        parent.appendChild(el('em', null, tok.slice(1, -1)));
      }
      last = offset + tok.length;
      return tok; // result string is discarded
    });
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function appendTable(node, lines, i) {
    var header = splitRow(lines[i]);
    var rows = [];
    var j = i + 2; // skip header + separator
    while (j < lines.length && lines[j].indexOf('|') !== -1 && lines[j].trim() !== '') {
      rows.push(splitRow(lines[j]));
      j++;
    }
    var wrap = el('div', 'marty-tbl');
    var table = el('table');
    var thead = el('thead');
    var htr = el('tr');
    for (var c = 0; c < header.length; c++) {
      var th = el('th');
      inlineInto(th, header[c]);
      htr.appendChild(th);
    }
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = el('tbody');
    for (var r = 0; r < rows.length; r++) {
      var tr = el('tr');
      for (var k = 0; k < header.length; k++) {
        var td = el('td');
        inlineInto(td, rows[r][k] != null ? rows[r][k] : '');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    node.appendChild(wrap);
    return j;
  }

  function appendList(node, lines, i, type) {
    var test = type === 'ul' ? isUl : isOl;
    var strip = type === 'ul' ? /^\s*[-*]\s+/ : /^\s*\d+\.\s+/;
    var listEl = el(type);
    if (type === 'ol') {
      // Honor a non-1 start marker (GFM) so "3." doesn't silently render as "1.".
      var sm = lines[i].match(/^\s*(\d+)\./);
      if (sm && sm[1] !== '1') listEl.setAttribute('start', sm[1]);
    }
    var j = i;
    while (j < lines.length && test(lines[j])) {
      var li = el('li');
      inlineInto(li, lines[j].replace(strip, ''));
      listEl.appendChild(li);
      j++;
    }
    node.appendChild(listEl);
    return j;
  }

  // Re-parses the full string from scratch on every call (responses are short,
  // so the cost is negligible and streaming stays idempotent).
  function renderMarkdown(node, md) {
    while (node.firstChild) node.removeChild(node.firstChild);
    var lines = String(md == null ? '' : md).split('\n');
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (line.trim() === '') {
        i++;
        continue;
      }
      var h = line.match(/^\s*#{1,6}\s+(.*)$/); // heading → bold line
      if (h) {
        var hp = el('p');
        var st = el('strong');
        inlineInto(st, h[1]);
        hp.appendChild(st);
        node.appendChild(hp);
        i++;
        continue;
      }
      if (isTableStart(lines, i)) {
        i = appendTable(node, lines, i);
        continue;
      }
      if (isUl(line)) {
        i = appendList(node, lines, i, 'ul');
        continue;
      }
      if (isOl(line)) {
        i = appendList(node, lines, i, 'ol');
        continue;
      }
      var p = el('p');
      var first = true;
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^\s*#{1,6}\s+/.test(lines[i]) &&
        !isUl(lines[i]) &&
        !isOl(lines[i]) &&
        !isTableStart(lines, i)
      ) {
        if (!first) p.appendChild(el('br'));
        inlineInto(p, lines[i]);
        first = false;
        i++;
      }
      node.appendChild(p);
    }
  }

  function build() {
    injectStyles();

    var launch = el('button', 'marty-launch');
    launch.type = 'button';
    launch.setAttribute('aria-label', 'Ask Marty');
    launch.appendChild(icon('⚡'));
    launch.appendChild(document.createTextNode(' Ask Marty'));

    var panel = el('div', 'marty-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Marty chat');

    var head = el('div', 'marty-head');
    var ttlWrap = el('div');
    var ttl = el('div', 'ttl');
    ttl.appendChild(icon('⚡'));
    ttl.appendChild(document.createTextNode(' Marty'));
    var sub = el('div', 'sub', 'Mark Miller Subaru · finds cars & live pricing');
    ttlWrap.appendChild(ttl);
    ttlWrap.appendChild(sub);
    var x = el('button', 'marty-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    head.appendChild(ttlWrap);
    head.appendChild(x);

    var log = el('div', 'marty-log');

    var foot = el('div', 'marty-foot');
    var row = el('div', 'marty-row');
    var ta = el('textarea');
    ta.rows = 1;
    ta.placeholder = 'Ask about a car or its price…';
    ta.setAttribute('aria-label', 'Message Marty');
    var send = el('button', 'marty-send', 'Send');
    send.type = 'button';
    row.appendChild(ta);
    row.appendChild(send);
    var disc = el(
      'div',
      'marty-disc',
      'Read-only preview. Marty can be wrong — nothing is final until Mark Miller confirms it in writing.'
    );
    foot.appendChild(row);
    foot.appendChild(disc);

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(foot);
    document.body.appendChild(launch);
    document.body.appendChild(panel);

    els = { launch: launch, panel: panel, log: log, ta: ta, send: send };

    launch.addEventListener('click', open);
    x.addEventListener('click', close);
    send.addEventListener('click', onSend);
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  function open() {
    els.launch.hidden = true;
    els.panel.classList.add('open');
    if (window.matchMedia && window.matchMedia('(max-width:480px)').matches) {
      document.body.style.overflow = 'hidden'; // lock page scroll behind full-screen panel
    }
    if (!greeted) {
      greeted = true; // render the welcome once, not on every reopen (codex P3)
      renderMarkdown(
        addMsg('bot'),
        "Hi, I'm Marty. I can search Mark Miller's live inventory and pull the " +
          'listed price for any car. What are you looking for?'
      );
    }
    els.ta.focus();
  }

  function close() {
    els.panel.classList.remove('open');
    els.launch.hidden = false;
    document.body.style.overflow = ''; // restore page scroll
  }

  // ── Send + SSE ─────────────────────────────────────────────────────────────
  function onSend() {
    if (busy) return;
    var text = els.ta.value.trim();
    if (!text) return;
    els.ta.value = '';
    messages.push({ role: 'user', content: text });
    if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);
    addMsg('user').textContent = text;
    stream();
  }

  function setBusy(on) {
    busy = on;
    els.send.disabled = on;
    els.ta.disabled = on;
  }

  function stream() {
    setBusy(true);
    var botNode = null;
    var toolNode = null;
    var assembled = '';

    function ensureBot() {
      if (!botNode) botNode = addMsg('bot');
      return botNode;
    }
    function clearTool() {
      if (toolNode) {
        toolNode.remove();
        toolNode = null;
      }
    }
    function handle(evt) {
      if (evt.type === 'token') {
        clearTool();
        assembled += evt.text;
        renderMarkdown(ensureBot(), assembled);
        scrollDown();
      } else if (evt.type === 'tool') {
        clearTool();
        toolNode = el('div', 'marty-tool', '…checking inventory');
        els.log.appendChild(toolNode);
        scrollDown();
      } else if (evt.type === 'error') {
        clearTool();
        assembled = assembled + (assembled ? '\n\n' : '') + evt.message;
        renderMarkdown(ensureBot(), assembled);
      }
      // 'done' needs no UI action.
    }

    var body = { messages: messages, session_id: sessionId };
    if (window.MARTY_TURNSTILE_TOKEN) body.turnstile_token = window.MARTY_TURNSTILE_TOKEN;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (resp) {
        if (!resp.ok) {
          return resp
            .json()
            .catch(function () {
              return {};
            })
            .then(function (j) {
              throw new Error(j.detail || 'Marty is unavailable right now. Please try again.');
            });
        }
        return pump(resp.body.getReader(), handle);
      })
      .then(function () {
        if (assembled) messages.push({ role: 'assistant', content: assembled });
        finish();
      })
      .catch(function (err) {
        clearTool();
        ensureBot().textContent = err.message || 'Something went wrong. Please try again.';
        finish();
      });

    function finish() {
      setBusy(false);
      els.ta.focus();
    }
  }

  // Read an SSE byte stream and call handle() with each parsed JSON event.
  function pump(reader, handle) {
    var decoder = new TextDecoder();
    var buf = '';
    function read() {
      return reader.read().then(function (res) {
        if (res.done) {
          flush(buf, handle);
          return;
        }
        buf += decoder.decode(res.value, { stream: true });
        buf = buf.replace(/\r\n/g, '\n'); // tolerate CRLF SSE frames (codex P3)
        var parts = buf.split('\n\n');
        buf = parts.pop(); // keep the trailing partial frame
        for (var i = 0; i < parts.length; i++) flush(parts[i], handle);
        return read();
      });
    }
    return read();
  }

  function flush(frame, handle) {
    var lines = frame.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('data:') !== 0) continue;
      var raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        handle(JSON.parse(raw));
      } catch (e) {
        /* ignore malformed frame */
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
