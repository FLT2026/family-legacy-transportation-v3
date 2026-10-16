// Regression: loading an existing Active / Verified trailer for editing must reveal
// the trailer form that the V3.8 master-record hub collapsed, hide the unrelated
// driver/truck forms, populate every saved field, scroll to the start of the form,
// and keep the original record ID, ratings, reason, and audit history intact.
// Runs the real v35-fleet-master.js and v38-master-record-hub.js against a small fake DOM.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = __dirname;
const FLEET_KEY = 'flt-v35-fleet';

function createEnvironment(seed) {
  const registry = new Map();
  const scrollLog = [];
  const focusLog = [];
  const timers = [];
  const docListeners = {};
  const winListeners = {};

  const dispatchTo = (listeners, event) => {
    (listeners[event.type] || []).slice().forEach(fn => fn.call(null, event));
  };

  class El {
    constructor(tag = 'div', id = '') {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.parentNode = null;
      this.dataset = {};
      this.style = {};
      this.hidden = false;
      this.disabled = false;
      this.required = false;
      this.checked = false;
      this.selected = false;
      this.textContent = '';
      this.options = [];
      this.selectedOptions = [];
      this.listeners = {};
      this.attrs = {};
      this.classes = new Set();
      this.cache = new Map();
      this._value = '';
      this._html = '';
      this._id = '';
      if (id) this.id = id;
      if (tag === 'form') {
        this.named = {};
        const form = this;
        this.elements = new Proxy({}, {
          get(_, name) {
            if (typeof name !== 'string') return undefined;
            if (!form.named[name]) { const c = new El('input'); c.name = name; c.form = form; form.named[name] = c; }
            return form.named[name];
          }
        });
      }
    }
    get id() { return this._id; }
    set id(v) { this._id = v; if (v) registry.set(v, this); }
    get value() { return this._value; }
    set value(v) {
      v = v == null ? '' : String(v);
      if (this.tagName === 'SELECT' && this.options.length) this._value = this.options.some(o => o.value === v) ? v : '';
      else this._value = v;
    }
    get className() { return [...this.classes].join(' '); }
    set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get classList() {
      const s = this.classes;
      return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), contains: c => s.has(c), toggle: (c, f) => ((f ?? !s.has(c)) ? s.add(c) : s.delete(c)) };
    }
    get innerHTML() { return this._html; }
    set innerHTML(html) {
      this._html = String(html);
      this.options = [];
      for (const m of this._html.matchAll(/<option(?:\s+value="([^"]*)")?[^>]*>([^<]*)<\/option>/g)) {
        const o = new El('option'); o._value = m[1] ?? m[2]; o.textContent = m[2]; this.options.push(o);
      }
      if (this.tagName === 'SELECT') this._value = this.options[0]?.value ?? '';
      for (const m of this._html.matchAll(/<(\w+)([^>]*?)\bid="([^"]+)"([^>]*)>/g)) {
        const child = new El(m[1], m[3]);
        if (/\bhidden\b/.test(m[2] + m[4])) child.hidden = true;
        if (m[1] === 'select') { const start = m.index + m[0].length; child.innerHTML = this._html.slice(start, this._html.indexOf('</select>', start)); }
        this.appendChild(child);
      }
    }
    get firstChild() { return this.children[0] || null; }
    get parentElement() { return this.parentNode instanceof El ? this.parentNode : null; }
    get offsetParent() { return {}; }
    add(option) { this.options.push(option); }
    appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child); return child; }
    append(...nodes) { nodes.forEach(n => n instanceof El && this.appendChild(n)); }
    prepend(...nodes) { nodes.forEach(n => { if (!(n instanceof El)) return; n.remove(); n.parentNode = this; this.children.unshift(n); }); }
    insertBefore(node, ref) {
      if (this.tagName === 'SELECT' || this.tagName === 'INPUT') { this.options.unshift(node); return node; }
      node.remove(); node.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, node); return node;
    }
    insertAdjacentElement(where, node) {
      const p = this.parentNode; if (!p) return node; node.remove(); node.parentNode = p;
      const i = p.children.indexOf(this); p.children.splice(where === 'afterend' ? i + 1 : i, 0, node); return node;
    }
    insertAdjacentHTML() {}
    replaceWith(node) {
      if (this.form) { node.form = this.form; this.form.named[this.name] = node; }
      if (this.parentNode) { const i = this.parentNode.children.indexOf(this); this.parentNode.children[i] = node; node.parentNode = this.parentNode; this.parentNode = null; }
    }
    remove() { if (this.parentNode) { const c = this.parentNode.children; c.splice(c.indexOf(this), 1); this.parentNode = null; } }
    contains(node) { for (let n = node; n; n = n.parentNode) if (n === this) return true; return false; }
    matchesSimple(sel) {
      if (sel.startsWith('#')) return this.id === sel.slice(1);
      if (sel.startsWith('.')) return sel.slice(1).split('.').every(c => this.classes.has(c));
      return false;
    }
    find(sel) { for (const c of this.children) { if (c.matchesSimple(sel)) return c; const d = c.find(sel); if (d) return d; } return null; }
    stub(key, tag = 'div') { if (!this.cache.has(key)) { const s = new El(tag); s.parentNode = this; this.cache.set(key, s); } return this.cache.get(key); }
    querySelector(sel) {
      if (sel === 'input,select' || sel === 'input,select,textarea') return this.named ? Object.values(this.named)[0] || null : null;
      if (/^[#.][\w.-]+$/.test(sel)) return this.find(sel) || this.stub(sel, sel.startsWith('#') ? 'input' : 'div');
      return this.stub(sel);
    }
    querySelectorAll(sel) {
      if (sel === 'input[type="checkbox"]') {
        if (!this.cache.has(sel)) this.cache.set(sel, ['None', 'Other'].map(v => { const b = new El('input'); b._value = v; b.type = 'checkbox'; return b; }));
        return this.cache.get(sel);
      }
      return [];
    }
    closest(sel) {
      for (let n = this; n instanceof El; n = n.parentNode) if (n.matchesSimple(sel)) return n;
      return sel === '.field' ? this.stub('closest:.field') : null;
    }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k] ?? null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
    removeEventListener() {}
    dispatchEvent(event) {
      if (!event.target) Object.defineProperty(event, 'target', { value: this, configurable: true });
      for (let n = this; n; n = n.parentNode) {
        (n.listeners?.[event.type] || []).slice().forEach(fn => fn.call(n, event));
        if (!event.bubbles || event.cancelBubble) break;
      }
      if (event.bubbles && !event.cancelBubble && document.documentElement.contains(this)) dispatchTo(docListeners, event);
      return !event.defaultPrevented;
    }
    click() { this.dispatchEvent(new Event('click', { bubbles: true })); }
    focus(options) { focusLog.push({ el: this, options }); }
    scrollIntoView(options) { scrollLog.push({ el: this, options, visible: isVisible(this) }); }
    reset() { if (this.named) Object.values(this.named).forEach(c => { c._value = ''; }); this.dispatchEvent(new Event('reset')); }
  }

  function isVisible(el) {
    if (!document.documentElement.contains(el)) return false;
    for (let n = el; n instanceof El; n = n.parentNode) {
      if (n.hidden || n.dataset.v38MasterCollapsed === 'true') return false;
    }
    return true;
  }

  const documentElement = new El('html');
  const head = new El('head');
  const body = new El('body');
  documentElement.append(head, body);
  const document = {
    documentElement, head, body,
    getElementById: id => { const el = registry.get(id); return el && documentElement.contains(el) ? el : null; },
    createElement: tag => new El(tag),
    createTextNode: text => { const n = new El('#text'); n.textContent = text; return n; },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => { (docListeners[type] = docListeners[type] || []).push(fn); },
    removeEventListener() {}
  };

  // Fleet page skeleton matching index.html + fleet-core.js + current-rig hardfix ordering.
  const nav = new El('nav', 'nav');
  const fleet = new El('section', 'fleet');
  body.append(nav, fleet);
  const currentRig = new El('div', 'v38-current-working-rig'); currentRig.className = 'panel';
  const entryGrid = new El('div'); entryGrid.className = 'grid three';
  const panels = {};
  ['driver', 'truck', 'trailer'].forEach(kind => {
    const panel = new El('div'); panel.className = 'panel'; panel.kind = kind;
    const form = new El('form', 'fleet-' + kind + '-form'); form.className = 'form-grid';
    panel.appendChild(form); entryGrid.appendChild(panel); panels[kind] = panel;
  });
  const listGrid = new El('div'); listGrid.className = 'grid three';
  const auditPanel = new El('div'); auditPanel.className = 'panel'; auditPanel.appendChild(new El('div', 'fleet-audit-list'));
  fleet.append(currentRig, entryGrid, listGrid, auditPanel);

  const storage = new Map(Object.entries(seed));
  const localStorage = {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  };

  const window = {
    addEventListener: (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent: event => { dispatchTo(winListeners, event); return true; },
    FLTDate: require(path.join(SRC, 'v36-date-utils.js')),
    FLTCurrentRigDisplayHardfix: {
      driverReady: r => r?.status === 'active',
      truckReady: r => r?.status === 'active',
      trailerReady: r => r?.status === 'active'
    }
  };

  function FormData(form) {
    return {
      entries: () => Object.entries(form.named).filter(([, c]) => !c.disabled && c.type !== 'checkbox').map(([n, c]) => [n, c.value])[Symbol.iterator]()
    };
  }

  const sandbox = {
    window, document, localStorage, console, Date, Proxy, Event, CustomEvent, FormData,
    Option: function Option(text, value) { const o = new El('option'); o.textContent = text; o._value = value ?? text; return o; },
    setTimeout: (fn, ms = 0) => { timers.push(fn); return timers.length; },
    clearTimeout() {},
    confirm: () => true,
    toast() {},
    location: { reload() { sandbox.reloaded = true; } },
    reloaded: false
  };
  sandbox.globalThis = sandbox;
  Object.assign(window, { document, localStorage, location: sandbox.location });
  vm.createContext(sandbox);
  const run = file => vm.runInContext(fs.readFileSync(path.join(SRC, file), 'utf8'), sandbox, { filename: file });

  const flush = () => { for (let i = 0; i < 50 && timers.length; i++) timers.splice(0).forEach(fn => fn()); };

  return { sandbox, document, window, storage, run, flush, scrollLog, focusLog, panels, entryGrid, isVisible, byId: id => document.getElementById(id) };
}

const today = new Date();
const scaleDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toISOString().slice(0, 10);
const trailer = {
  id: 'TRL-01', unit: 'TRL-01', vin: '1A9GN2024PA123456', configuration: 'Gooseneck trailer', status: 'active',
  year: '2023', make: 'Big Tex', series: 'Gooseneck / hotshot', model: '22GN', deckLength: 32, axleConfiguration: 'Tandem axle',
  gvwr: 14000, emptyWeight: 5200, axleCapacity: 14000, tireCapacity: 15000, hitchCapacity: 25000,
  verificationDate: scaleDate, weightBasis: 'scale-ticket', createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-09-02T12:00:00.000Z'
};
const priorAudit = [{ action: 'authorized_record_update', entityId: 'TRL-01', entityType: 'trailer', timestamp: '2026-09-02T12:00:00.000Z', reason: 'Add or update scale ticket' }];
const seedFleet = {
  drivers: [{ id: 'DRV-01', name: 'J. Ellis', status: 'active', licenseState: 'TX', expiration: '2030-01-01' }],
  trucks: [{ id: 'TRK-01', unit: 'TRK-01', status: 'active', gvwr: 14000 }],
  trailers: [trailer],
  locks: [],
  audit: priorAudit
};
const rig = JSON.stringify({ driverId: 'DRV-01', truckId: 'TRK-01', trailerId: 'TRL-01', savedAt: '2026-09-02T12:00:00.000Z' });
const seed = {
  [FLEET_KEY]: JSON.stringify(seedFleet),
  'flt-v38-current-working-rig': rig,
  'flt-v36-regular-rig': rig,
  'flt-v35-default-fleet-selection': rig
};

const env = createEnvironment(seed);
env.run('v35-fleet-master.js');
env.run('v38-master-record-hub.js');
env.flush();

const trailerForm = env.byId('fleet-trailer-form');
const manager = env.byId('v35-fleet-master-manager');
assert.ok(manager, 'v35 master-record manager must mount');
assert.strictEqual(env.entryGrid.dataset.v38MasterCollapsed, 'true', 'precondition: hub collapses the original equipment forms when records exist');
assert.strictEqual(env.isVisible(trailerForm), false, 'precondition: trailer form starts collapsed');

// User opens Advanced Record Controls, picks Trailer → TRL-01 → authorized reason, then Load Record for Editing.
env.byId('v38-show-advanced').click();
const type = env.byId('v35-master-type'), record = env.byId('v35-master-record'), reason = env.byId('v35-master-reason');
type.value = 'trailers'; type.dispatchEvent(new Event('change', { bubbles: true }));
record.value = 'TRL-01'; record.dispatchEvent(new Event('change', { bubbles: true }));
assert.strictEqual(record.value, 'TRL-01', 'TRL-01 must be selectable in Saved record');
reason.value = 'edit|Correct a data-entry mistake'; reason.dispatchEvent(new Event('change', { bubbles: true }));
assert.strictEqual(reason.value, 'edit|Correct a data-entry mistake', 'authorized edit reason must be selectable');
env.flush();

const fleetBefore = env.storage.get(FLEET_KEY);
env.scrollLog.length = 0; env.focusLog.length = 0;
env.byId('v35-master-edit').click();

assert.match(env.byId('v35-master-notice').innerHTML, /Editing TRL-01/, 'notice must announce Editing TRL-01');
const formScroll = env.scrollLog.find(entry => entry.el === trailerForm);
assert.ok(formScroll, 'Load Record for Editing must scroll to the trailer form');
assert.strictEqual(formScroll.visible, true, 'trailer form must be revealed before it is scrolled into view');
assert.strictEqual(formScroll.options?.block, 'start', 'scroll must target the beginning of the editable form');
assert.strictEqual(env.scrollLog.at(-1).el, trailerForm, 'no later scroll may move the view away from the trailer form');
assert.ok(env.focusLog.every(entry => entry.options?.preventScroll === true), 'focusing the first field must not override the form-start scroll');

const assertEditorState = label => {
  assert.strictEqual(env.isVisible(trailerForm), true, label + ': trailer form must be visible');
  assert.strictEqual(env.panels.trailer.hidden, false, label + ': trailer panel must be shown');
  assert.strictEqual(env.panels.driver.hidden, true, label + ': driver form must be hidden');
  assert.strictEqual(env.panels.truck.hidden, true, label + ': truck form must be hidden');
  assert.strictEqual(trailerForm.dataset.editId, 'TRL-01', label + ': original record ID must be preserved');
  assert.strictEqual(trailerForm.dataset.editReason, 'Correct a data-entry mistake', label + ': authorized change reason must be preserved');
  for (const [name, value] of Object.entries(trailer)) {
    if (name === 'id') continue;
    assert.strictEqual(trailerForm.elements[name].value, String(value), label + ': saved field ' + name + ' must be populated');
  }
};
assertEditorState('immediately after load');
env.flush();
assertEditorState('after hub re-render');
assert.strictEqual(env.storage.get(FLEET_KEY), fleetBefore, 'loading a record for editing must not change stored records');

// Save the unchanged record: same ID, same ratings, no duplicate, audit appended (not rewritten).
trailerForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const after = JSON.parse(env.storage.get(FLEET_KEY));
assert.strictEqual(after.trailers.length, 1, 'updating must never create a duplicate trailer');
const saved = after.trailers[0];
assert.strictEqual(saved.id, 'TRL-01', 'updated trailer must keep its original ID');
assert.strictEqual(saved.createdAt, trailer.createdAt, 'original creation timestamp must be preserved');
['gvwr', 'emptyWeight', 'axleCapacity', 'tireCapacity', 'hitchCapacity'].forEach(name => assert.strictEqual(saved[name], trailer[name], 'saved rating ' + name + ' must be unchanged'));
assert.strictEqual(saved.status, 'active', 'verification status must be preserved');
assert.strictEqual(saved.verificationDate, trailer.verificationDate, 'verification date must be preserved');
assert.strictEqual(after.audit.length, priorAudit.length + 1, 'exactly one audit entry must be appended');
assert.deepStrictEqual(after.audit[0], priorAudit[0], 'existing audit history must be preserved');
const entry = after.audit.at(-1);
assert.strictEqual(entry.action, 'authorized_record_update');
assert.strictEqual(entry.entityId, 'TRL-01');
assert.strictEqual(entry.reason, 'Correct a data-entry mistake');
assert.strictEqual(entry.before.id, 'TRL-01');
assert.deepStrictEqual(after.drivers, seedFleet.drivers, 'driver records must be untouched');
assert.deepStrictEqual(after.trucks, seedFleet.trucks, 'truck records must be untouched');

// Verification safeguards remain: an invalid rating is blocked and nothing is written.
{
  const guard = createEnvironment(seed);
  guard.run('v35-fleet-master.js');
  guard.run('v38-master-record-hub.js');
  guard.flush();
  const t = guard.byId('v35-master-type'), r = guard.byId('v35-master-record'), why = guard.byId('v35-master-reason');
  t.value = 'trailers'; t.dispatchEvent(new Event('change', { bubbles: true }));
  r.value = 'TRL-01'; why.value = 'edit|Correct a data-entry mistake';
  guard.byId('v35-master-edit').click();
  const form = guard.byId('fleet-trailer-form');
  form.elements.hitchCapacity.value = '1000';
  const before = guard.storage.get(FLEET_KEY);
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  assert.strictEqual(guard.storage.get(FLEET_KEY), before, 'invalid Active / Verified ratings must still be blocked');
  assert.strictEqual(guard.isVisible(form), true, 'blocked update must keep the trailer form visible for correction');

  // Cancel Edit restores the collapsed hub layout without changing records.
  guard.byId('v35-master-cancel').click();
  assert.strictEqual(guard.entryGrid.dataset.v38MasterCollapsed, 'true', 'cancel must collapse the equipment forms again');
  assert.strictEqual(guard.entryGrid.dataset.v38Editor, undefined, 'cancel must close the hub editor');
  assert.ok(Object.values(guard.panels).every(p => p.hidden === false), 'cancel must restore all form panels for future use');
  assert.strictEqual(guard.storage.get(FLEET_KEY), before, 'cancel must not change stored records');

  // Hub quick action and + Add New still reveal only the matching form.
  guard.sandbox.window.FLTFleetMasterHub.openEditor('trailer', 'TRL-01', 'Add or update scale ticket', 'verificationDate');
  assert.strictEqual(guard.isVisible(form), true, 'hub quick-edit must reveal the trailer form');
  assert.strictEqual(form.dataset.editId, 'TRL-01', 'hub quick-edit must load TRL-01');
  guard.sandbox.window.FLTFleetMasterHub.addNew('truck');
  assert.strictEqual(guard.isVisible(guard.byId('fleet-truck-form')), true, '+ Add New truck must reveal the truck form');
  assert.strictEqual(guard.panels.trailer.hidden, true, '+ Add New truck must hide the trailer form');
}

console.log('V3.8 master-record edit reveal regression passed: existing verified trailer TRL-01 loads into a visible form with ID, ratings, reason, and audit history preserved.');
