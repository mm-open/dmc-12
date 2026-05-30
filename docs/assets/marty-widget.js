/* marty-widget.js — floating read-only chat helper ("Marty") for dmc-12.ai.
 * Talks to mm-backend POST /marty/chat (SSE). Vanilla IIFE, no deps; reuses the
 * dmc12.css design tokens (--accent #1537a6, Inter). v1 is read-only: Marty
 * searches inventory and pulls live pricing only. */
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
      'display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:24px;' +
      'border:1px solid var(--accent,#1537a6);background:var(--accent,#1537a6);color:#fff;' +
      "font-family:'Inter',system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;" +
      'box-shadow:0 6px 20px rgba(21,55,166,.28);transition:transform .12s,box-shadow .12s}' +
      '.marty-launch:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(21,55,166,.34)}' +
      '.marty-launch[hidden]{display:none}' +
      '.marty-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:370px;max-width:calc(100vw - 32px);' +
      'height:560px;max-height:calc(100vh - 40px);display:none;flex-direction:column;overflow:hidden;' +
      'background:var(--bg,#fff);border:1px solid var(--line-strong,#cfcec6);border-radius:14px;' +
      "font-family:'Inter',system-ui,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.22)}" +
      '.marty-panel.open{display:flex}' +
      '.marty-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;' +
      'background:var(--accent,#1537a6);color:#fff}' +
      '.marty-head .ttl{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px}' +
      '.marty-head .sub{font-size:11px;opacity:.85;font-weight:400}' +
      '.marty-x{appearance:none;border:0;background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.85;padding:2px 6px}' +
      '.marty-x:hover{opacity:1}' +
      '.marty-log{flex:1;overflow-y:auto;padding:14px;background:var(--bg-soft,#f7f7f5);display:flex;flex-direction:column;gap:10px}' +
      '.marty-msg{max-width:84%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}' +
      '.marty-msg.user{align-self:flex-end;background:var(--accent,#1537a6);color:#fff;border-bottom-right-radius:4px}' +
      '.marty-msg.bot{align-self:flex-start;background:var(--bg,#fff);color:var(--ink,#111);border:1px solid var(--line,#e6e5e0);border-bottom-left-radius:4px}' +
      '.marty-tool{align-self:flex-start;font-size:12px;color:var(--ink-mute,#78786f);' +
      "font-family:'JetBrains Mono',monospace;padding:2px 4px}" +
      '.marty-foot{padding:10px 12px;border-top:1px solid var(--line,#e6e5e0);background:var(--bg,#fff)}' +
      '.marty-row{display:flex;gap:8px;align-items:flex-end}' +
      '.marty-row textarea{flex:1;resize:none;border:1px solid var(--line-strong,#cfcec6);border-radius:9px;' +
      "padding:9px 11px;font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.4;max-height:96px;outline:none}" +
      '.marty-row textarea:focus{border-color:var(--accent,#1537a6)}' +
      '.marty-send{appearance:none;border:0;border-radius:9px;background:var(--accent,#1537a6);color:#fff;' +
      'font-weight:600;font-size:14px;padding:9px 14px;cursor:pointer}' +
      '.marty-send:disabled{opacity:.5;cursor:default}' +
      '.marty-disc{margin-top:7px;font-size:10.5px;color:var(--ink-mute,#78786f);line-height:1.4}';
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
    if (!greeted) {
      greeted = true; // render the welcome once, not on every reopen (codex P3)
      addMsg('bot').textContent =
        "Hi, I'm Marty. I can search Mark Miller's live inventory and pull an " +
        'itemized out-the-door price for any car. What are you looking for?';
    }
    els.ta.focus();
  }

  function close() {
    els.panel.classList.remove('open');
    els.launch.hidden = false;
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
        ensureBot().textContent = assembled;
        scrollDown();
      } else if (evt.type === 'tool') {
        clearTool();
        toolNode = el('div', 'marty-tool', '…checking inventory');
        els.log.appendChild(toolNode);
        scrollDown();
      } else if (evt.type === 'error') {
        clearTool();
        ensureBot().textContent = assembled + (assembled ? '\n\n' : '') + evt.message;
        assembled = botNode.textContent;
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
