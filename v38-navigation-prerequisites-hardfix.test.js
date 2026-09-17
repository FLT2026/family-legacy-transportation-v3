const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

// --- Part 1: v38-navigation-prerequisites-hardfix.js must never send the
// operator to "Complete Accepted Load" on a stale persisted ACCEPT LOAD. ---
(function testPrerequisitesHardfix(){
  const elements=new Map();
  const makeElement=(id='')=>{
    const node={
      id,dataset:{},className:'',
      classList:{list:new Set(),add(name){this.list.add(name)},remove(name){this.list.delete(name)},toggle(name,on){on?this.list.add(name):this.list.delete(name)},contains(name){return this.list.has(name)}},
      children:[],attributes:{},
      addEventListener(){},appendChild(){},
      setAttribute(name,value){this.attributes[name]=String(value)},
      removeAttribute(name){delete this.attributes[name]},
      querySelector(){return null},querySelectorAll(){return[]}
    };
    elements.set(id,node);
    return node;
  };
  const nav=makeElement('nav');
  const intelligenceButton=makeElement('intelligence-nav');intelligenceButton.dataset.view='intelligence';
  const loadButton=makeElement('load-nav');loadButton.dataset.view='load';
  let activeButton=intelligenceButton;
  nav.querySelector=selector=>{
    if(selector==='button.active')return activeButton;
    if(selector==='[data-view="load"]')return loadButton;
    if(selector==='[data-view="intelligence"]')return intelligenceButton;
    return null;
  };
  nav.querySelectorAll=selector=>selector==="button[data-view]"?[intelligenceButton,loadButton]:[];

  const storage={
    'flt-v38-dashboard-reviewed':'true',
    'flt-v34-business-profile':JSON.stringify({legalName:'Test Carrier'}),
    'flt-v35-classification':JSON.stringify({insuranceStatus:'verified',authorityStatus:'verified',equipmentStatus:'verified'}),
    'flt-v35-fleet':JSON.stringify({
      drivers:[{status:'active',licenseState:'NC',expiration:'2099-01-01'}],
      trucks:[{status:'active',vin:'1HGBH41JXMN109186',weightBasis:'scale-ticket',verificationDate:'2025-01-01',gvwr:20000,gcwr:30000,emptyWeight:10000,frontGawr:10000,rearGawr:10000,frontTireCapacity:10000,rearTireCapacity:10000,hitchCapacity:20000}],
      trailers:[{status:'active',vin:'1HGBH41JXMN109187',weightBasis:'scale-ticket',verificationDate:'2025-01-01',gvwr:10000,emptyWeight:4000,axleCapacity:10000,tireCapacity:10000,hitchCapacity:10000}]
    }),
    'flt-v35-last-decision':JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'stale-snapshot'})
  };
  const localStorage={getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=String(value)}};
  const document={
    getElementById:id=>elements.get(id)||(id==='nav'?nav:null),
    querySelectorAll:()=>[],
    createElement:()=>({id:'',style:{},innerHTML:'',classList:{add(){},remove(){}}}),
    addEventListener(){}
  };
  let sourceName='';
  let reevaluated=false;
  const window={
    FLTFastLoadWorkflow:{evaluatedDecisionMatches:()=>reevaluated},
    addEventListener(){}
  };
  const sandbox={window,document,localStorage,console,setTimeout:fn=>fn(),MutationObserver:class{observe(){}}};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('v38-navigation-prerequisites-hardfix.js','utf8'),sandbox);
  const hardfix=window.FLTNavigationPrerequisitesHardfix;
  assert.ok(hardfix,'navigation prerequisites hardfix API should load');

  // Stale ACCEPT LOAD (evaluatedDecisionMatches false) must never authorize "load".
  assert.equal(hardfix.prerequisite().view,'intelligence','stale ACCEPT LOAD must keep NEXT on Evaluate Proposed Load');
  assert.equal(hardfix.blockedView('load'),true,'Complete Accepted Load must stay blocked while the decision is stale');

  // Typing "Central Dispatch" one letter at a time must never flip prerequisite() to "load"
  // (the operator has not rerun the decision, so evaluatedDecisionMatches() stays false).
  for(const letter of 'Central Dispatch'){
    sourceName+=letter;
    assert.equal(hardfix.prerequisite().view,'intelligence',`mid-typing state "${sourceName}" must not authorize Complete Accepted Load`);
    hardfix.apply();
    assert.equal(loadButton.classList.contains('nav-required'),false,`keystroke "${sourceName}" must not mark Complete Accepted Load nav-required`);
  }

  // Once the operator reruns the decision and the evaluation fingerprint matches again,
  // "load" becomes the real next prerequisite.
  reevaluated=true;
  hardfix.apply();
  assert.equal(hardfix.prerequisite().view,'load','matching evaluated ACCEPT LOAD should authorize Complete Accepted Load');
  activeButton=intelligenceButton;
  hardfix.apply();
  assert.equal(loadButton.classList.contains('nav-required'),true,'matching evaluated ACCEPT LOAD should mark Complete Accepted Load nav-required');

  console.log('V3.8 navigation-prerequisites-hardfix stale-decision and keystroke checks passed.');
})();

// --- Part 2: v38-fast-load-workflow.js workflowNavHighlight() must not mark
// "Complete Accepted Load" with v38-nav-next off a stale persisted decision. ---
(function testFastLoadNavHighlight(){
  const elements=new Map();
  function el(id=''){
    const node={
      id,className:'',style:{},dataset:{},value:'',hidden:false,textContent:'',
      listeners:{},parentElement:null,children:[],
      addEventListener(type,fn){(this.listeners[type]=this.listeners[type]||[]).push(fn)},
      appendChild(child){this.children.push(child);child.parentElement=this;elements.set(child.id,child);return child},
      prepend(child){this.children.unshift(child);child.parentElement=this;elements.set(child.id,child);return child},
      insertBefore(child){this.children.push(child);child.parentElement=this;elements.set(child.id,child);return child},
      insertAdjacentElement(){},
      querySelector(){return null},querySelectorAll(){return[]},
      setAttribute(){},
      classList:{list:new Set(),add(name){this.list.add(name)},remove(name){this.list.delete(name)},contains(name){return this.list.has(name)}},
      matches(){return false},
      compareDocumentPosition(){return 0}
    };
    node.classList.owner=node;
    let html='';
    Object.defineProperty(node,'innerHTML',{get(){return html},set(v){
      html=String(v??'');
      const seen=new Set();
      const re=/id=["']([^"']+)["']/g;
      let match;
      while((match=re.exec(html))){
        const id=match[1];
        if(seen.has(id))continue;
        seen.add(id);
        if(!elements.has(id)){const child=el(id);child.parentElement=node;elements.set(id,child)}
      }
    }});
    return node;
  }
  const nav=el('nav');
  const decisionForm=el('v35-decision-form');
  const loadForm=el('load-form');
  const head=el('head');
  [nav,decisionForm,loadForm].forEach(x=>elements.set(x.id,x));
  const directDecisionField=el('v35-loaded-miles-field');directDecisionField.className='field';
  decisionForm.children=[directDecisionField];
  decisionForm.firstElementChild=directDecisionField;
  decisionForm.insertBefore=(child,reference)=>{decisionForm.children.splice(decisionForm.children.indexOf(reference),0,child);child.parentElement=decisionForm;return child};
  const decisionCard=el('v35-decision-card');elements.set(decisionCard.id,decisionCard);

  const intelligenceButton=el('intelligence-nav');intelligenceButton.dataset.view='intelligence';
  const loadButton=el('load-nav');loadButton.dataset.view='load';
  elements.set(intelligenceButton.id,intelligenceButton);elements.set(loadButton.id,loadButton);
  let activeButton=intelligenceButton;
  nav.querySelector=selector=>{
    if(selector==='button.active')return activeButton;
    if(selector==='[data-view="load"]')return loadButton;
    if(selector==='[data-view="intelligence"]')return intelligenceButton;
    return null;
  };
  nav.querySelectorAll=selector=>selector==='.v38-nav-next'?[intelligenceButton,loadButton].filter(b=>b.classList.contains('v38-nav-next')):[];

  const document={
    createElement:()=>el(),
    getElementById:id=>elements.get(id)||null,
    head,
    addEventListener(){},
    querySelector:()=>null,
    querySelectorAll:()=>[]
  };
  const storage={};
  const localStorage={getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=String(value)}};
  const domSandbox={window:{},document,localStorage,Date,console,setTimeout:fn=>fn(),globalThis:null,Node:{DOCUMENT_POSITION_FOLLOWING:4}};
  domSandbox.globalThis=domSandbox;
  vm.createContext(domSandbox);
  vm.runInContext(fs.readFileSync('v38-fast-load-workflow.js','utf8'),domSandbox);
  const workflow=domSandbox.window.FLTFastLoadWorkflow;
  assert.ok(workflow,'fast load workflow API should load');

  elements.get('v38-quick-source').value='Broker';
  elements.get('v38-quick-pickup-zip').value='27601';
  elements.get('v38-quick-delivery-zip').value='28301';
  localStorage.setItem('flt-v35-last-decision',JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'stale-snapshot'}));

  activeButton=intelligenceButton;
  // No matching evaluation recorded yet: workflowNavHighlight must not mark load "next".
  decisionForm.listeners.change[0]();
  assert.equal(loadButton.classList.contains('v38-nav-next'),false,'stale ACCEPT LOAD must not flag Complete Accepted Load as next');

  // Typing "Central Dispatch" into source/broker/app name one letter at a time
  // must never cause Complete Accepted Load to receive v38-nav-next.
  const sourceNameField=elements.get('v38-quick-source-name');
  let typed='';
  for(const letter of 'Central Dispatch'){
    typed+=letter;
    sourceNameField.value=typed;
    decisionForm.listeners.input[0]();
    assert.equal(loadButton.classList.contains('v38-nav-next'),false,`keystroke "${typed}" must not flash v38-nav-next on Complete Accepted Load`);
  }

  // Recording a matching evaluation for the CURRENT inputs restores next-step highlighting.
  localStorage.setItem('flt-v38-evaluated-decision',JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'stale-snapshot',key:workflow.evaluationFingerprint()}));
  decisionForm.listeners.change[0]();
  assert.equal(loadButton.classList.contains('v38-nav-next'),true,'matching evaluated ACCEPT LOAD should restore v38-nav-next on Complete Accepted Load');

  // Editing the source name again after a matching evaluation must immediately revoke it.
  sourceNameField.value=typed+'!';
  decisionForm.listeners.input[0]();
  assert.equal(loadButton.classList.contains('v38-nav-next'),false,'editing source name after acceptance must revoke v38-nav-next until re-evaluated');

  console.log('V3.8 fast-load-workflow nav-highlight stale-decision and keystroke checks passed.');
})();
