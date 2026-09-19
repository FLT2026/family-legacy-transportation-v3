const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const code=fs.readFileSync('v38-fast-load-workflow.js','utf8');
const sandbox={window:{},localStorage:{data:{},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)}},console};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.FLTFastLoadWorkflow;
assert.ok(api,'fast load workflow API should load without a DOM');
assert.equal(api.fiveZip('27601'),'27601');
assert.equal(api.fiveZip('2'),'');
assert.equal(api.decisionAccepted({decision:'ACCEPT LOAD'}),true);
assert.equal(api.decisionAccepted({decision:'NEGOTIATE RATE'}),false);
assert.equal(api.decisionAccepted({decision:'PASS ON LOAD'}),false);
assert.equal(api.proposalReady({pickupZip:'27601',deliveryZip:'28301',offer:1240,cargoWeight:5000,loadedMiles:245,deadheadMiles:35}),true);
assert.equal(api.proposalReady({pickupZip:'27601',deliveryZip:'2',offer:1240,cargoWeight:5000,loadedMiles:245,deadheadMiles:35}),false);
sandbox.localStorage.setItem('flt-v38-accepted-proposal',JSON.stringify({pickupZip:'27601',deliveryZip:'28301',offer:1240,cargoWeight:5000,loadedMiles:245,deadheadMiles:35}));
assert.equal(api.canCompleteLoad(),true,'accepted proposal should unlock detailed load setup');
console.log('V3.8 profitability-first quick decision and accepted-load gate checks passed.');

// Hostile-input rendering check: the accepted-proposal banner interpolates
// operator-entered proposal fields (source, sourceName). Build a minimal DOM
// stub so applyProposalToLoadForm() actually runs (it only executes when
// `document` exists), then confirm hostile values render as literal escaped
// text and cannot inject elements or event-handler attributes.
function buildDomStub() {
  const elements = new Map();
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
      id, className: '', style: {}, dataset: {}, value: '', hidden: false, textContent: '',
      listeners: {}, parentElement: null, children: [],
      addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
      appendChild(child) { this.children.push(child); child.parentElement = this; elements.set(child.id, child); return child; },
      prepend(child) { this.children.unshift(child); child.parentElement = this; elements.set(child.id, child); return child; },
      insertBefore(child) { this.children.push(child); child.parentElement = this; elements.set(child.id, child); return child; },
      insertAdjacentElement(position, child) { child.parentElement = this.parentElement || this; elements.set(child.id, child); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      setAttribute() {},
      classList: { add(name) { this.owner.className+=(this.owner.className?' ':'')+name; }, remove(name) { this.owner.className=this.owner.className.split(/\s+/).filter(item=>item&&item!==name).join(' '); }, contains(name) { return this.owner?.className.split(/\s+/).includes(name); } },
      matches() { return false; }
    };
    node.classList.owner=node;
    Object.defineProperty(node, 'innerHTML', {
      get() { return html; },
      set(value) { html = String(value ?? ''); registerHtmlIds(node, html); }
    });
    return node;
  }
  const nav = el('nav');
  const decisionNav=el('decision-nav');decisionNav.dataset.view='intelligence';decisionNav.className='active';
  const loadNav=el('load-nav');loadNav.dataset.view='load';
  loadNav.compareDocumentPosition=()=>0;
  loadNav.click=()=>{};
  nav.querySelector=selector=>selector==='[data-view="load"]'?loadNav:selector==='[data-view="intelligence"]'?decisionNav:selector==='button.active'?decisionNav:null;
  nav.querySelectorAll=selector=>selector==='.v38-nav-next'?[decisionNav,loadNav].filter(item=>item.classList.contains('v38-nav-next')):[];
  nav.insertBefore=()=>{};
  nav.children=[decisionNav,loadNav];
  const decisionForm = el('v35-decision-form');
  const loadForm = el('load-form');
  const head = el('head');
  [nav, decisionForm, loadForm].forEach(x => elements.set(x.id, x));
  elements.set(decisionNav.id,decisionNav);elements.set(loadNav.id,loadNav);
  const driverPanel=el('v35-master-selection');
  const nestedDriverField=el('nested-driver-field');nestedDriverField.className='field';nestedDriverField.parentElement=driverPanel;
  driverPanel.children=[nestedDriverField];
  const directDecisionField=el('v35-loaded-miles-field');directDecisionField.className='field';
  decisionForm.children=[driverPanel,directDecisionField];
  decisionForm.firstElementChild=driverPanel;
  decisionForm.querySelector=selector=>selector==='.field'?nestedDriverField:null;
  decisionForm.insertBefore=(child,reference)=>{
    assert.equal(reference,directDecisionField,'Fast Load must insert before a direct decision-form child');
    decisionForm.children.splice(decisionForm.children.indexOf(reference),0,child);
    child.parentElement=decisionForm;
    return child;
  };
  const decisionCard=el('v35-decision-card');
  elements.set(decisionCard.id,decisionCard);
  const document = {
    listeners:{},
    createElement: () => el(),
    getElementById: id => elements.get(id) || null,
    head,
    addEventListener(type,fn,opts) { (this.listeners[type]=this.listeners[type]||[]).push({fn,opts}); },
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const storage = {};
  const localStorage = {
    getItem: key => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = String(value); }
  };
  return { elements, document, localStorage };
}

function loadWithAcceptedProposal(proposal) {
  const { elements, document, localStorage } = buildDomStub();
  localStorage.setItem('flt-v38-accepted-proposal', JSON.stringify(proposal));
  const domSandbox = { window: {}, document, localStorage, Date, console, Node: {DOCUMENT_POSITION_FOLLOWING: 4}, setTimeout: fn => fn(), globalThis: null };
  domSandbox.globalThis = domSandbox;
  vm.createContext(domSandbox);
  vm.runInContext(fs.readFileSync('v38-fast-load-workflow.js', 'utf8'), domSandbox);
  return {banner:elements.get('v38-accepted-proposal-banner'),elements,localStorage,workflow:domSandbox.window.FLTFastLoadWorkflow,loadNav:document.getElementById('load-nav')};
}

;(async()=>{
  const maliciousProposal = {
    source: '<script>window.__flt_xss_source=true</script>',
    sourceName: '"><img src=x onerror="window.__flt_xss_name=true">',
    sourceReference: 'REF-1',
    pickupZip: '27601',
    deliveryZip: '28301',
    offer: 1500,
    cargoWeight: 6000,
    loadedMiles: 200,
    deadheadMiles: 20
  };
  const {banner} = loadWithAcceptedProposal(maliciousProposal);
  assert.ok(banner, 'accepted-proposal banner must be created');
  assert.doesNotMatch(banner.innerHTML, /<script>/i, 'raw <script> tag must not appear in rendered banner markup');
  assert.doesNotMatch(banner.innerHTML, /<img /i, 'raw <img> tag must not appear in rendered banner markup');
  assert.doesNotMatch(banner.innerHTML, /<[^&]*onerror=/i, 'onerror must never appear inside an actual (unescaped) HTML tag');
  assert.match(banner.innerHTML, /&lt;script&gt;window\.__flt_xss_source=true&lt;\/script&gt;/, 'malicious source value must render as literal escaped text');
  assert.match(banner.innerHTML, /&quot;&gt;&lt;img src=x onerror=&quot;window\.__flt_xss_name=true&quot;&gt;/, 'malicious sourceName value must render as literal escaped text');
{
  // Normal values (including an ampersand and an apostrophe, which are HTML
  // metacharacters but not attacks) must still render as readable text.
  const normalProposal = {
    source: 'Broker / Dispatcher',
    sourceName: "O'Reilly Freight & Sons",
    sourceReference: 'REF-2',
    pickupZip: '27601',
    deliveryZip: '28301',
    offer: 2500,
    cargoWeight: 8000,
    loadedMiles: 300,
    deadheadMiles: 40
  };
  const {banner} = loadWithAcceptedProposal(normalProposal);
  assert.ok(banner, 'accepted-proposal banner must be created for normal input');
  assert.match(banner.innerHTML, /Broker \/ Dispatcher/);
  assert.match(banner.innerHTML, /O&#39;Reilly Freight &amp; Sons/);
  assert.match(banner.innerHTML, /27601 → 28301/);
  assert.match(banner.innerHTML, /Offer \$2,500/);
}

console.log('V3.8 fast-load accepted-proposal banner hostile-input and normal-input escaping checks passed.');

  const {banner:renderedBanner,elements,localStorage,workflow,loadNav}=loadWithAcceptedProposal({
    pickupZip:'27601',
    deliveryZip:'28301',
    offer:1500,
    cargoWeight:6000,
    loadedMiles:200,
    deadheadMiles:20
  });
  assert.ok(elements.get('v38-quick-section')||elements.get('v38-quick-source'),'Step 1 Fast Load section should render');
  assert.ok(elements.get('v38-quick-source'),'Load Source control should render');
  assert.ok(elements.get('v38-quick-source-name'),'Source name control should render');
  assert.ok(elements.get('v38-quick-pickup-zip'),'Pickup ZIP control should render');
  assert.ok(elements.get('v38-quick-delivery-zip'),'Delivery ZIP control should render');
  assert.ok(elements.get('v38-quick-reference'),'Reference control should render');
  elements.get('v38-quick-source').value='Broker';
  elements.get('v38-quick-source-name').value='Central Dispatch';
  elements.get('v38-quick-pickup-zip').value='27601';
  elements.get('v38-quick-delivery-zip').value='28301';
  elements.get('v38-quick-reference').value='REF-FAST-1';
  localStorage.setItem('flt-v35-last-decision',JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'stale-acceptance'}));
  const accept=elements.get('v38-accept-proposal');
  const decisionForm=elements.get('v35-decision-form');
  assert.ok(accept,'Accept This Load action should render');
  const submitCapture=elements.get('v35-decision-form')&&elements.get('v35-decision-form').listeners.submit;
  assert.equal(submitCapture,undefined,'Fast Load must not rely on a form submit listener that V3.5 can stop');
  const docSubmit=elements.get('v35-decision-form')&&globalThis; // keep test scope explicit

  const captureSubmit=document.listeners.submit?.find(entry=>entry.opts===true);
  assert.ok(captureSubmit,'Fast Load must register a document capture submit listener');
  captureSubmit.fn({target:decisionForm});
  const recorded=JSON.parse(localStorage.getItem('flt-v38-evaluated-decision')||'null');
  assert.equal(recorded?.snapshotId,'stale-acceptance','document-capture submit path must persist the current evaluated decision');
  decisionForm.listeners.change[0]();
  assert.equal(accept.hidden,false,'matching evaluated ACCEPT LOAD should be available after the real submit path');
  assert.equal(loadNav.classList.contains('v38-nav-next'),false,'stale ACCEPT LOAD must not highlight Complete Accepted Load');
  await accept.listeners.click[0]();
  assert.equal(localStorage.getItem('flt-v38-accepted-proposal'),JSON.stringify({
    pickupZip:'27601',
    deliveryZip:'28301',
    offer:1500,
    cargoWeight:6000,
    loadedMiles:200,
    deadheadMiles:20
  }),'stale acceptance must not authorize the current proposal');
  localStorage.setItem('flt-v38-evaluated-decision',JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'stale-acceptance',key:workflow.evaluationFingerprint()}));
  decisionForm.listeners.change[0]();
  assert.equal(accept.hidden,false,'matching evaluated ACCEPT LOAD should reveal Accept This Load');
  assert.equal(loadNav.classList.contains('v38-nav-next'),true,'matching current ACCEPT LOAD may highlight Complete Accepted Load');
  elements.get('v38-quick-source-name').value='Central Dispatch updated';
  decisionForm.listeners.input[0]();
  assert.equal(loadNav.classList.contains('v38-nav-next'),false,'typing a source name must remove stale Complete Accepted Load highlight');
  elements.get('v38-quick-source').value='Load Board';
  decisionForm.listeners.change[0]();
  assert.equal(accept.hidden,true,'changing a decision-driving input must invalidate the prior acceptance');
  await accept.listeners.click[0]();
  assert.equal(localStorage.getItem('flt-v38-accepted-proposal'),JSON.stringify({
    pickupZip:'27601',
    deliveryZip:'28301',
    offer:1500,
    cargoWeight:6000,
    loadedMiles:200,
    deadheadMiles:20
  }),'invalidated acceptance must not authorize changed proposal inputs');
  elements.get('v38-quick-source').value='Broker';
  elements.get('v38-quick-source-name').value='Central Dispatch';
  localStorage.setItem('flt-v38-evaluated-decision',JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'stale-acceptance',key:workflow.evaluationFingerprint()}));
  decisionForm.listeners.change[0]();
  assert.equal(accept.hidden,false,'rerun matching ACCEPT LOAD should restore authorization');
  await accept.listeners.click[0]();
  const carried=JSON.parse(localStorage.getItem('flt-v38-accepted-proposal'));
  assert.equal(carried.source,'Broker');
  assert.equal(carried.sourceName,'Central Dispatch');
  assert.equal(carried.pickupZip,'27601');
  assert.equal(carried.deliveryZip,'28301');
  assert.equal(carried.sourceReference,'REF-FAST-1');
  assert.ok(renderedBanner,'Accepted-estimate banner should still render');
})().catch(error=>{console.error(error);process.exitCode=1});

console.log('V3.8 Fast Load section rendering and source carry-forward checks passed.');
