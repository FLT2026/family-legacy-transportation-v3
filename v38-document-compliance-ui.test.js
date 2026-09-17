const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = new Map();
let panelHost;
let actions;

function registerHtmlIds(owner, html) {
  const seen = new Set();
  const re = /id=["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    if (!elements.has(id)) {
      const child = el(id);
      child.parentElement = owner;
      elements.set(id, child);
    }
  }
}

function el(id = '') {
  let html = '';
  const node = {
    id,
    textContent: '',
    value: '',
    files: null,
    className: '',
    style: {},
    listeners: {},
    parentElement: null,
    addEventListener(type, fn, capture) {
      (this.listeners[type] || (this.listeners[type] = [])).push({ fn, capture: Boolean(capture) });
    },
    insertBefore(child) {
      child.parentElement = this;
      elements.set(child.id, child);
    },
    appendChild(child) {
      child.parentElement = this;
      elements.set(child.id, child);
    },
    insertAdjacentElement(position, child) {
      child.parentElement = this.parentElement || this;
      elements.set(child.id, child);
    },
    closest() {
      return panelHost;
    },
    querySelector(selector) {
      if (selector === '.form-actions') return actions;
      return null;
    }
  };
  Object.defineProperty(node, 'innerHTML', {
    get() { return html; },
    set(value) {
      html = String(value ?? '');
      registerHtmlIds(node, html);
    }
  });
  return node;
}

panelHost = el('panel-host');
const loadForm = el('load-form');
actions = el('actions');
const dispatchForm = el('fleet-lock-form');
const loadSelect = el('fleet-lock-load');
const driverSelect = el('fleet-lock-driver');
const truckSelect = el('fleet-lock-truck');
const trailerSelect = el('fleet-lock-trailer');
loadForm.parentElement = panelHost;
dispatchForm.parentElement = panelHost;
[loadForm, dispatchForm, loadSelect, driverSelect, truckSelect, trailerSelect].forEach(x => elements.set(x.id, x));

const document = {
  createElement: () => el(),
  getElementById: id => elements.get(id) || null
};

const storage = {};
const localStorage = {
  getItem: key => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = String(value); }
};

const load = {
  id: 'FLT-SELF-1',
  customer: 'Owner Customer',
  pickup: 'A',
  delivery: 'B',
  date: '2026-09-09',
  revenue: 1000,
  expenses: [],
  payments: [],
  documents: []
};
const store = { loads: [load], selectedId: load.id };
const assignment = {
  id: 'ASN-1',
  loadId: load.id,
  driverId: 'D1',
  truckId: 'T1',
  trailerId: 'R1',
  status: 'Verified / Locked'
};

localStorage.setItem('flt-v38-assignments', JSON.stringify({ assignments: [assignment], assignmentAudit: [] }));
localStorage.setItem('flt-v35-fleet', JSON.stringify({
  drivers: [{ id: 'D1' }],
  trucks: [{ id: 'T1' }],
  trailers: [{ id: 'R1' }],
  locks: [],
  audit: []
}));
localStorage.setItem('flt-v35-classification', JSON.stringify({
  companyRole: 'Motor Carrier',
  primaryOperation: 'Hotshot Carrier / Non-CDL',
  insuranceStatus: 'verified',
  authorityStatus: 'verified',
  equipmentStatus: 'verified',
  driverOk: true
}));

loadSelect.value = load.id;
driverSelect.value = 'D1';
truckSelect.value = 'T1';
trailerSelect.value = 'R1';

let alerts = [];
let toasts = [];
let persisted = 0;
const sandbox = {
  window: { FLTWeightEquipmentUI: { evaluate: () => ({ status: 'PASS', pass: true, reasons: [] }) } },
  document,
  localStorage,
  store,
  persist() { persisted++; },
  alert: value => alerts.push(value),
  toast: value => toasts.push(value),
  Date,
  setTimeout: fn => fn(),
  globalThis: null
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('v38-assignment-integrity.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('v38-document-compliance.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('v38-document-compliance-ui.js', 'utf8'), sandbox);
const ui = sandbox.window.FLTDocumentComplianceUI;

assert.ok(elements.get('v38-load-source-fields'));
assert.ok(elements.get('v38-load-source-type'));
assert.ok(elements.get('v38-load-source-name'));
assert.ok(elements.get('v38-load-source-reference'));
assert.ok(elements.get('v38-transportation-type'));
elements.get('v38-load-source-type').value = 'Load App';
elements.get('v38-load-source-name').value = 'Central Dispatch';
elements.get('v38-load-source-reference').value = 'CD-4455';
elements.get('v38-transportation-type').value = 'Auto Transport';
ui.captureLoadSource();
assert.equal(load.sourceType, 'Load App');
assert.equal(load.sourceName, 'Central Dispatch');
assert.equal(load.sourceReference, 'CD-4455');
assert.equal(load.transportationType, 'Auto Transport');
assert.ok(persisted > 0);

let result = ui.evaluate();
assert.equal(result.status, 'MORE INFORMATION REQUIRED');
assert.ok(result.reasons.some(x => /rate\/load confirmation/i.test(x)));
assert.ok(result.reasons.some(x => /condition evidence|pickup photos/i.test(x)));

let prevented = false;
let stopped = false;
const event = {
  preventDefault() { prevented = true; },
  stopImmediatePropagation() { stopped = true; }
};
const handlers = (dispatchForm.listeners.submit || []).sort((a, b) => Number(b.capture) - Number(a.capture));
for (const { fn } of handlers) {
  fn(event);
  if (stopped) break;
}
assert.equal(prevented, true);
assert.equal(stopped, true);
assert.match(alerts.at(-1), /MORE INFORMATION REQUIRED/);
let fleet = JSON.parse(localStorage.getItem('flt-v35-fleet'));
assert.equal(fleet.audit.at(-1).entity, 'v38_document_compliance');
assert.equal(fleet.audit.at(-1).entityId, load.id);

let added = sandbox.window.FLTDocumentCompliance.addDocument(load, {
  type: 'Load Board / App Confirmation',
  stage: 'source',
  filename: 'central-dispatch.pdf',
  mimeType: 'application/pdf'
}, { id: 'DOC-SRC' });
assert.equal(added.ok, true);
added = sandbox.window.FLTDocumentCompliance.addDocument(load, {
  type: 'Vehicle Condition / Inspection',
  stage: 'pickup',
  filename: 'condition.jpg',
  mimeType: 'image/jpeg'
}, { id: 'DOC-COND' });
assert.equal(added.ok, true);
result = ui.evaluate();
assert.equal(result.status, 'PASS');
prevented = false;
stopped = false;
for (const { fn } of handlers) {
  fn(event);
  if (stopped) break;
}
assert.equal(prevented, false);
assert.equal(stopped, false);

load.sourceType = 'Internal / Own Customer';
load.sourceName = '';
load.sourceReference = '';
load.transportationType = 'General Freight';
load.documents = [];
result = ui.evaluate();
assert.equal(result.status, 'MORE INFORMATION REQUIRED');
assert.ok(result.reasons.some(x => /customer order\/work authorization/i.test(x)));
sandbox.window.FLTDocumentCompliance.addDocument(load, {
  type: 'Customer Order / Work Order',
  stage: 'source',
  filename: 'owner-work-order.pdf'
}, { id: 'DOC-OWN' });
result = ui.evaluate();
assert.equal(result.status, 'PASS');
ui.render();
assert.match(elements.get('v38-document-compliance-panel').innerHTML, /Internal \/ Own Customer/);

console.log('V3.8 owner-operator load source persistence, live document gate blocking, audit, evidence attachment, rerender, and self-customer PASS checks passed.');

// Fail-closed store access: the live app declares `store` as a top-level
// lexical const in index.html (not a globalThis/window property). This
// scenario mirrors that exact binding shape via two separate vm.runInContext
// calls, without ever assigning `store` onto the sandbox/global object, to
// confirm the UI module resolves the real selected load instead of null.
{
  const lexElements = new Map();
  let lexPanelHost;
  let lexActions;

  function lexRegisterHtmlIds(owner, html) {
    const seen = new Set();
    const re = /id=["']([^"']+)["']/g;
    let match;
    while ((match = re.exec(String(html || '')))) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);
      if (!lexElements.has(id)) {
        const child = lexEl(id);
        child.parentElement = owner;
        lexElements.set(id, child);
      }
    }
  }

  function lexEl(id = '') {
    let html = '';
    const node = {
      id,
      textContent: '',
      value: '',
      files: null,
      className: '',
      style: {},
      listeners: {},
      parentElement: null,
      addEventListener(type, fn, capture) {
        (this.listeners[type] || (this.listeners[type] = [])).push({ fn, capture: Boolean(capture) });
      },
      insertBefore(child) { child.parentElement = this; lexElements.set(child.id, child); },
      appendChild(child) { child.parentElement = this; lexElements.set(child.id, child); },
      insertAdjacentElement(position, child) { child.parentElement = this.parentElement || this; lexElements.set(child.id, child); },
      closest() { return lexPanelHost; },
      querySelector(selector) { if (selector === '.form-actions') return lexActions; return null; }
    };
    Object.defineProperty(node, 'innerHTML', {
      get() { return html; },
      set(value) { html = String(value ?? ''); lexRegisterHtmlIds(node, html); }
    });
    return node;
  }

  lexPanelHost = lexEl('lex-panel-host');
  const lexLoadForm = lexEl('load-form');
  lexActions = lexEl('actions');
  const lexDispatchForm = lexEl('fleet-lock-form');
  const lexLoadSelect = lexEl('fleet-lock-load');
  lexLoadForm.parentElement = lexPanelHost;
  lexDispatchForm.parentElement = lexPanelHost;
  [lexLoadForm, lexDispatchForm, lexLoadSelect].forEach(x => lexElements.set(x.id, x));

  const lexDocument = {
    createElement: () => lexEl(),
    getElementById: id => lexElements.get(id) || null
  };

  const lexStorage = {};
  const lexLocalStorage = {
    getItem: key => lexStorage[key] ?? null,
    setItem: (key, value) => { lexStorage[key] = String(value); }
  };

  const lexLoad = {
    id: 'FLT-LEX-1',
    customer: 'Lexical Store Customer',
    pickup: 'A',
    delivery: 'B',
    date: '2026-09-14',
    revenue: 500,
    expenses: [],
    payments: [],
    documents: []
  };

  lexLocalStorage.setItem('flt-v38-assignments', JSON.stringify({ assignments: [], assignmentAudit: [] }));
  lexLocalStorage.setItem('flt-v35-fleet', JSON.stringify({ drivers: [], trucks: [], trailers: [], locks: [], audit: [] }));
  lexLocalStorage.setItem('flt-v35-classification', JSON.stringify({}));

  lexLoadSelect.value = lexLoad.id;

  let lexPersisted = 0;
  const lexSandbox = {
    window: { FLTWeightEquipmentUI: { evaluate: () => ({ status: 'PASS', pass: true, reasons: [] }) } },
    document: lexDocument,
    localStorage: lexLocalStorage,
    persist() { lexPersisted++; },
    alert: () => {},
    toast: () => {},
    Date,
    setTimeout: fn => fn(),
    globalThis: null
  };
  lexSandbox.globalThis = lexSandbox;
  vm.createContext(lexSandbox);

  // Declare `store` as a top-level lexical const in a *separate* runInContext
  // call, exactly like index.html's inline <script> block declares it before
  // the dynamically-loaded module scripts run. This does NOT create a
  // sandbox/globalThis property.
  vm.runInContext('const store = { loads: [' + JSON.stringify(lexLoad) + '], selectedId: ' + JSON.stringify(lexLoad.id) + ' };', lexSandbox);
  assert.strictEqual(lexSandbox.store, undefined, 'store must not be a globalThis/window property');
  assert.strictEqual(vm.runInContext('typeof store', lexSandbox), 'object', 'store must exist as a lexical binding');

  vm.runInContext(fs.readFileSync('v38-assignment-integrity.js', 'utf8'), lexSandbox);
  vm.runInContext(fs.readFileSync('v38-document-compliance.js', 'utf8'), lexSandbox);
  vm.runInContext(fs.readFileSync('v38-document-compliance-ui.js', 'utf8'), lexSandbox);
  const lexUi = lexSandbox.window.FLTDocumentComplianceUI;

  const lexResult = lexUi.evaluate();
  assert.notEqual(lexResult.loadId, '', 'the real lexical store load must be resolved, not null');
  assert.equal(lexResult.loadId, lexLoad.id);

  lexUi.render();
  assert.match(lexElements.get('v38-document-compliance-panel').innerHTML, new RegExp(lexLoad.id));
  assert.doesNotMatch(lexElements.get('v38-document-compliance-panel').innerHTML, /No open accepted load/);

  console.log('V3.8 document compliance UI resolves the real lexical store binding (not globalThis.store) checks passed.');
}
