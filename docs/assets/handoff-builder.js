// docs/assets/handoff-builder.js
// Interactive request builder for initiate_deal_handoff. Loaded ONLY by
// deal-handoff.html. Validation mirrors app/models.py (DealHandoffInput +
// CustomerContact + TradeIn + ContactConsent) so the live output matches what
// the service will accept. Output renders three tabs: bare params, the A2A
// JSON-RPC envelope, and a paste-and-run curl.

(function () {
  'use strict';

  // --- constraints lifted verbatim from app/models.py --------------------
  var VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;          // excludes I, O, Q
  var E164_RE = /^\+[1-9][0-9]{6,14}$/;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  var MCP_BASE = (window.DMC12 && window.DMC12.MCP_BASE) ||
                 'https://mm-inventory-mcp-572952183767.us-central1.run.app';

  // Per-field validators. Each returns '' when valid, else an error message.
  // `required` validators run always; optional ones only run on non-empty input.
  var RULES = {
    reservation_token: function (v) {
      if (v.length < 10 || v.length > 80) return 'must be 10–80 chars';
      return '';
    },
    name: function (v) {
      if (v.length < 1 || v.length > 120) return 'must be 1–120 chars';
      return '';
    },
    phone: function (v) {
      if (v.length < 8 || v.length > 20) return 'must be 8–20 chars';
      if (!E164_RE.test(v)) return 'must be E.164 (e.g. +15555551234)';
      return '';
    },
    email: function (v) {
      if (v.length < 5 || v.length > 320) return 'must be 5–320 chars';
      if (!EMAIL_RE.test(v)) return 'must be a valid email address';
      return '';
    },
    notes: function (v) { return v.length > 500 ? 'max 500 chars' : ''; },
    ti_description: function (v) { return v.length > 500 ? 'max 500 chars' : ''; },
    ti_vin: function (v) { return VIN_RE.test(v) ? '' : '17 chars, no I/O/Q'; },
    ti_year: function (v) {
      var n = Number(v);
      if (!Number.isInteger(n) || n < 1900 || n > 2100) return '1900–2100';
      return '';
    },
    ti_make: function (v) { return v.length > 40 ? 'max 40 chars' : ''; },
    ti_model: function (v) { return v.length > 80 ? 'max 80 chars' : ''; },
    ti_mileage: function (v) {
      var n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 1000000) return '0–1,000,000';
      return '';
    },
    ti_amount: function (v) {
      var n = Number(v);
      // Number.isFinite rejects Infinity (e.g. '1e309'), which would otherwise
      // pass isNaN and then serialize to null in JSON.stringify.
      if (!Number.isFinite(n) || n < 0) return 'must be a finite number ≥ 0';
      return '';
    },
    ti_currency: function (v) { return /^[A-Z]{3}$/.test(v) ? '' : '3-letter ISO code'; },
    consent_text: function (v) { return v.length > 2000 ? 'max 2000 chars' : ''; }
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function val(id) { var el = $('#' + id); return el ? el.value.trim() : ''; }

  function setErr(id, msg) {
    var input = $('#' + id);
    if (!input) return;
    var wrap = input.closest('.finput') || input.parentElement;
    // Prefer an error slot scoped to this field via [data-err-for]; this keeps
    // two inputs that share one .finput (amount + currency) from clobbering
    // each other's message. Fall back to the first .err for single-input rows.
    var errEl = wrap
      ? (wrap.querySelector('.err[data-err-for="' + id + '"]') || wrap.querySelector('.err'))
      : null;
    if (errEl) errEl.textContent = msg || '';
    if (msg) input.classList.add('invalid'); else input.classList.remove('invalid');
  }

  // Build {value, errorCount}. Validate a field, paint its inline error.
  function check(id, rule, opts) {
    opts = opts || {};
    var v = val(id);
    if (!v) {
      // empty: error only if required
      setErr(id, opts.required ? 'required' : '');
      return { value: '', err: opts.required ? 1 : 0 };
    }
    var msg = RULES[rule] ? RULES[rule](v) : '';
    setErr(id, msg);
    return { value: v, err: msg ? 1 : 0 };
  }

  // Convert a datetime-local value to a tz-aware ISO 8601 string (UTC Z).
  // app/models.py rejects a naive expires_at; .toISOString() always carries Z.
  function toAwareISO(localValue) {
    if (!localValue) return null;
    var d = new Date(localValue);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  function isToggleOn(name) {
    var cb = $('#toggle-' + name);
    return !!(cb && cb.checked);
  }

  // ----------------------------------------------------------------------
  // Core: read the form, validate, return { params, errors, notes[] }
  // ----------------------------------------------------------------------
  function buildState() {
    var errors = 0;
    var notes = [];

    // --- required ---
    var rt = check('f-reservation_token', 'reservation_token', { required: true });
    var name = check('f-name', 'name', { required: true });
    var phone = check('f-phone', 'phone', { required: true });
    var email = check('f-email', 'email', { required: true });
    errors += rt.err + name.err + phone.err + email.err;

    // financing_preference + trade_in_disclosed are in the published schema's
    // `required` set (schemas/deal-handoff.json), even though the server's
    // Pydantic model defaults them. Emit them so the builder's output validates
    // against the public JSON Schema a partner may check against, not just the
    // lenient server. The toggles below override these defaults.
    var params = {
      reservation_token: rt.value,
      customer_contact: { name: name.value, phone: phone.value, email: email.value },
      financing_preference: 'unknown',
      trade_in_disclosed: false,
      customer_consent: true
    };

    // --- financing_preference (toggle) overrides the default ---
    if (isToggleOn('financing')) {
      params.financing_preference = val('f-financing') || 'unknown';
    }

    // --- notes (toggle, hashed) ---
    if (isToggleOn('notes')) {
      var n = check('f-notes', 'notes');
      errors += n.err;
      if (n.value) params.notes = n.value;
    }

    // --- trade_in (toggle) ---
    if (isToggleOn('trade_in')) {
      var ti = {};
      var anyTi = false;
      var desc = check('f-ti_description', 'ti_description');
      var amt = check('f-ti_amount', 'ti_amount');
      var cur = check('f-ti_currency', 'ti_currency');
      var tvin = check('f-ti_vin', 'ti_vin');
      var tyear = check('f-ti_year', 'ti_year');
      var tmake = check('f-ti_make', 'ti_make');
      var tmodel = check('f-ti_model', 'ti_model');
      var tmile = check('f-ti_mileage', 'ti_mileage');
      var tcond = val('f-ti_condition');
      errors += desc.err + amt.err + cur.err + tvin.err + tyear.err + tmake.err + tmodel.err + tmile.err;

      if (desc.value) { ti.description = desc.value; anyTi = true; }
      if (amt.value) {
        ti.appraised_value_partner = { amount: Number(amt.value), currency: (cur.value || 'USD') };
        anyTi = true;
      }
      if (tvin.value) { ti.vin = tvin.value.toUpperCase(); anyTi = true; }
      if (tyear.value) { ti.year = Number(tyear.value); anyTi = true; }
      if (tmake.value) { ti.make = tmake.value; anyTi = true; }
      if (tmodel.value) { ti.model = tmodel.value; anyTi = true; }
      if (tmile.value) { ti.mileage = Number(tmile.value); anyTi = true; }
      if (tcond) { ti.condition = tcond; anyTi = true; }

      params.trade_in = ti;
      // Implicit-disclosure rule (DealHandoffInput._derive_disclosure):
      // any populated trade_in field flips the boolean true.
      if (anyTi) {
        params.trade_in_disclosed = true;
        notes.push('trade_in_disclosed auto-set to true (a trade_in field is populated)');
      }
    }

    // --- consent (toggle, channel-scoped) ---
    if (isToggleOn('consent')) {
      var channels = $$('.consent-channel:checked').map(function (c) { return c.value; });
      var consent = {};
      if (channels.length < 1) {
        errors += 1;
        setErr('f-consent_channels_marker', 'select at least one channel');
      } else {
        setErr('f-consent_channels_marker', '');
        consent.allowed_channels = channels;
      }

      var expRaw = val('f-consent_expires_at');
      var expIso = toAwareISO($('#f-consent_expires_at') ? $('#f-consent_expires_at').value : '');
      if (!expRaw || !expIso) {
        errors += 1;
        setErr('f-consent_expires_at', 'required (must include a date/time)');
      } else if (new Date(expIso).getTime() <= Date.now()) {
        // Mirrors the server's CONSENT_INVALID rejection (expires_at <= now).
        errors += 1;
        setErr('f-consent_expires_at', 'expired — server returns CONSENT_INVALID');
      } else {
        setErr('f-consent_expires_at', '');
        consent.expires_at = expIso;
      }

      var ctext = check('f-consent_text', 'consent_text');
      errors += ctext.err;
      if (ctext.value) consent.consent_text = ctext.value;

      params.consent = consent;
    }

    return { params: params, errors: errors, notes: notes };
  }

  // ----------------------------------------------------------------------
  // Output rendering
  // ----------------------------------------------------------------------
  var outputs = { params: '', jsonrpc: '', curl: '' };

  function render() {
    var st = buildState();
    var ind = JSON.stringify(st.params, null, 2);

    var envelope = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'initiate_deal_handoff', arguments: st.params }
    };
    var envStr = JSON.stringify(envelope, null, 2);

    // The JSON body is embedded in a single-quoted POSIX shell string (-d '…').
    // Free-text fields (name, notes, consent_text, trade_in.description) can
    // contain a single quote, which would close the string and let the rest be
    // re-parsed by the shell. Escape each ' as '\'' so the copied command is
    // safe to paste verbatim.
    var shellSafe = envStr.replace(/'/g, "'\\''");
    var curl =
      'curl -X POST ' + MCP_BASE + '/a2a/ \\\n' +
      '  -H "Authorization: Bearer $DMC12_TOKEN" \\\n' +
      "  -H 'content-type: application/json' \\\n" +
      "  -d '" + shellSafe + "'";

    outputs.params = ind;
    outputs.jsonrpc = envStr;
    outputs.curl = curl;

    // status banner
    var status = $('#builder-status');
    if (status) {
      if (st.errors > 0) {
        status.className = 'builder-status bad';
        status.textContent = '✕ request invalid — ' + st.errors +
          ' field' + (st.errors === 1 ? '' : 's') + ' need fixing before this call would be accepted';
      } else {
        var extra = st.notes.length ? '  ·  ' + st.notes.join('; ') : '';
        status.className = 'builder-status ok';
        status.textContent = '✓ request valid' + extra;
      }
    }

    paintActiveTab();
  }

  function paintActiveTab() {
    var active = $('.builder-out .tab.active');
    var key = active ? active.getAttribute('data-tab') : 'params';
    var body = $('#out-pre');
    if (body) body.textContent = outputs[key] || '';
  }

  // ----------------------------------------------------------------------
  // Wiring
  // ----------------------------------------------------------------------
  function wire() {
    // Re-render on any input/change in the builder.
    var builder = $('#handoff-builder');
    if (!builder) return;
    builder.addEventListener('input', render);
    builder.addEventListener('change', render);

    // Toggle show/hide of optional-field bodies.
    $$('.toggle-row input[type="checkbox"][id^="toggle-"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var name = cb.id.replace('toggle-', '');
        var body = $('#body-' + name);
        if (body) body.hidden = !cb.checked;
        cb.closest('.toggle-row').classList.toggle('on', cb.checked);
        render();
      });
    });

    // Tab switching.
    $$('.builder-out .tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.builder-out .tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        paintActiveTab();
      });
    });

    // Copy the active tab's output.
    var copyBtn = $('#out-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var pre = $('#out-pre');
        if (!pre) return;
        (window.DMC12.copyText || function (v, d) { d(); })(pre.textContent, function () {
          var original = copyBtn.textContent;
          copyBtn.textContent = 'Copied ✓';
          copyBtn.classList.add('copied');
          if (window.DMC12.flashToast) window.DMC12.flashToast('Copied to clipboard');
          setTimeout(function () { copyBtn.textContent = original; copyBtn.classList.remove('copied'); }, 1400);
        });
      });
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
