// docs/assets/dmc12.js
// Shared runtime for every guide page. Single source of truth for the MCP
// origin (mirrors the docs/index.html pattern), the data-mcp-path/role
// resolver, copy-to-clipboard, toast, and active-nav highlighting.
// The deal-handoff builder logic lives separately in handoff-builder.js.

(function () {
  // Single source of truth for the public MCP endpoint origin. Update this
  // value in one place when a vanity CNAME takes over from the dev Cloud Run
  // URL. Every href/data-copy/display on a guide page that points at the
  // service is rendered from MCP_BASE + the per-element data-mcp-path attribute.
  var MCP_BASE = 'https://mm-inventory-mcp-572952183767.us-central1.run.app';

  // Expose for handoff-builder.js (curl tab needs the origin).
  window.DMC12 = window.DMC12 || {};
  window.DMC12.MCP_BASE = MCP_BASE;

  document.querySelectorAll('[data-mcp-path]').forEach(function (el) {
    var full = MCP_BASE + el.getAttribute('data-mcp-path');
    var role = el.getAttribute('data-mcp-role') || '';
    if (role.indexOf('href') !== -1) el.setAttribute('href', full);
    if (role.indexOf('copy') !== -1) el.setAttribute('data-copy', full);
    if (role.indexOf('text') !== -1) el.textContent = full;
  });

  // Toast ------------------------------------------------------------------
  var toast = document.getElementById('toast');
  var toastTimer;
  function flashToast(msg) {
    if (!toast) return;
    toast.textContent = msg || 'copied';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1400);
  }
  window.DMC12.flashToast = flashToast;

  // Clipboard helper, shared by [data-copy] buttons and the builder. ------
  function copyText(val, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(done, function () { fallbackCopy(val, done); });
    } else {
      fallbackCopy(val, done);
    }
  }
  function fallbackCopy(val, done) {
    var ta = document.createElement('textarea');
    ta.value = val; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
  window.DMC12.copyText = copyText;

  // Wire up any static [data-copy] button (endpoint blocks, code samples). -
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.getAttribute('data-copy');
      // A code-sample copy button may carry its payload on a sibling <pre>.
      if (!val && btn.parentElement) {
        var pre = btn.parentElement.querySelector('pre');
        if (pre) val = pre.textContent;
      }
      copyText(val || '', function () {
        var original = btn.textContent;
        btn.textContent = 'Copied ✓';
        btn.classList.add('copied');
        flashToast('Copied to clipboard');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1400);
      });
    });
  });

  // Copy buttons inside .code blocks copy their sibling <pre>. -------------
  document.querySelectorAll('.code .copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.parentElement.querySelector('pre');
      if (!pre) return;
      copyText(pre.textContent, function () {
        var original = btn.textContent;
        btn.textContent = 'Copied ✓';
        btn.classList.add('copied');
        flashToast('Copied to clipboard');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1400);
      });
    });
  });

  // Highlight the current page in the guide nav. --------------------------
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.guide-nav a[data-page]').forEach(function (a) {
    if (a.getAttribute('data-page') === here) a.classList.add('active');
  });
})();
