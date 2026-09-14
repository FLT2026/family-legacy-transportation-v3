const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

function buildDomStub() {
  const elements = new Map();

  function el(id = '') {
    return {
      id,
      value: '',
      className: '',
      style: {},
      dataset: {},
      textContent: '',
      innerHTML: '',
      offsetParent: {},
      disabled: false,
      options: [],
      listeners: {},
      parentElement: { classList: { add() {}, remove() {} } },
      addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
      dispatchEvent() {},
      classList: { add() {}, remove() {} },
      closest() { return null; },
      scrollIntoView() {}
    };
  }

  const activeNavButton = { dataset: { view: 'fleet' } };
  const nav = el('nav');
  nav.querySelector = selector => (selector === 'button.active' ? activeNavButton : null);
  elements.set('nav', nav);

  const type = el('v35-master-type');
  const record = el('v35-master-record');
  const reason = el('v35-master-reason');
  const edit = el('v35-master-edit');
  const notice = el('v35-master-notice');
  [type, record, reason, edit, notice].forEach(x => elements.set(x.id, x));

  const storage = {};
  const localStorage = {
    getItem: key => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = String(value); }
  };

  const document = {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: () => [],
    addEventListener() {}
  };

  return { elements, document, localStorage, notice, activeNavButton };
}

function runGuidance(invalidatedEntry) {
  const { document, localStorage, notice } = buildDomStub();
  localStorage.setItem('flt-v38-current-working-rig', JSON.stringify({ invalidated: { driver: invalidatedEntry } }));
  localStorage.setItem('flt-v35-fleet', JSON.stringify({ drivers: [], trucks: [], trailers: [] }));

  const sandbox = {
    window: { addEventListener() {}, dispatchEvent() {} },
    document,
    localStorage,
    Date,
    Event: function Event(type) { this.type = type; },
    console,
    setTimeout: fn => fn(),
    clearTimeout() {},
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('v38-fleet-renewal-guidance.js', 'utf8'), sandbox);
  sandbox.window.FLTFleetRenewalGuidance.apply();
  return notice;
}

// Hostile input: item.label and item.reason are editable fleet data (driver
// name/reason for invalidation) rendered via innerHTML. Confirm closing
// tags, quotes, ampersands, script tags, and event-handler attributes never
// produce executable markup and instead render as literal escaped text.
{
  const notice = runGuidance({
    id: 'D-XSS',
    label: '<script>window.__flt_fleet_xss_label=true</script> & "Driver" \'Name\'',
    reason: '"><img src=x onerror="window.__flt_fleet_xss_reason=true">'
  });
  assert.doesNotMatch(notice.innerHTML, /<script>/i, 'raw <script> tag must not appear in the rendered notice');
  assert.doesNotMatch(notice.innerHTML, /<img /i, 'raw <img> tag must not appear in the rendered notice');
  assert.doesNotMatch(notice.innerHTML, /<[^&]*onerror=/i, 'onerror must never appear inside an actual (unescaped) HTML tag');
  assert.match(notice.innerHTML, /&lt;script&gt;window\.__flt_fleet_xss_label=true&lt;\/script&gt;/, 'malicious label must render as literal escaped text');
  assert.match(notice.innerHTML, /&amp; &quot;Driver&quot; &#39;Name&#39;/, 'ampersand and quotes in label must be escaped');
  assert.match(notice.innerHTML, /&quot;&gt;&lt;img src=x onerror=&quot;window\.__flt_fleet_xss_reason=true&quot;&gt;/, 'malicious reason must render as literal escaped text');
}

// Normal values must still display correctly (readable text, no
// double-escaping, and the expected static wording remains intact).
{
  const notice = runGuidance({
    id: 'D-NORMAL',
    label: 'J. Ellis',
    reason: 'license expired'
  });
  assert.match(notice.innerHTML, /<strong>J\. Ellis is not ready: license expired\.<\/strong>/);
  assert.match(notice.innerHTML, /Do not create a duplicate driver/);
}

console.log('V3.8 fleet renewal guidance hostile-input and normal-input escaping checks passed.');
