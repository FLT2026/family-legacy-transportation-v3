const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const elements=new Map();
const now=new Date();
const todayISO=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
const makeElement=(id='')=>{
  const node={
    id,
    dataset:{},
    classList:{remove(){}},
    children:[],
    addEventListener(){},
    appendChild(){},
    setAttribute(name,value){this.attributes[name]=String(value)},
    removeAttribute(name){delete this.attributes[name]},
    attributes:{},
    querySelector(){return null},
    querySelectorAll(){return[]}
  };
  elements.set(id,node);
  return node;
};
const nav=makeElement('nav');
const decisionNav=makeElement('decision-nav');decisionNav.dataset.view='intelligence';
const loadNav=makeElement('load-nav');loadNav.dataset.view='load';
const stepNavs=Object.fromEntries(['pickup','delivery','finance','test'].map(view=>{const button=makeElement(view+'-nav');button.dataset.view=view;return[view,button]}));
const navButtons={intelligence:decisionNav,load:loadNav,...stepNavs};
nav.querySelector=selector=>{
  if(selector==='button.active')return decisionNav;
  const match=selector.match(/^\[data-view="([^"]+)"\]$/);
  return match?navButtons[match[1]]||null:null;
};
nav.querySelectorAll=selector=>selector==='button[data-view]'?Object.values(navButtons):[];
elements.set('nav',nav);

const storage={
  'flt-v34-business-profile':JSON.stringify({legalName:'Test Carrier'}),
  'flt-v35-classification':JSON.stringify({insuranceStatus:'verified',authorityStatus:'verified',equipmentStatus:'verified',driverOk:true}),
  'flt-v35-last-decision':JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'current'}),
  'flt-v36-regular-rig':JSON.stringify({driverId:'d1',truckId:'t1',trailerId:'tr1'}),
  'flt-v35-fleet':JSON.stringify({
    drivers:[{id:'d1',status:'active',licenseState:'NC',expiration:'2099-01-01'}],
    trucks:[{id:'t1',status:'active',vin:'1HGBH41JXMN109186',weightBasis:'scale-ticket',verificationDate:todayISO,gvwr:20000,gcwr:30000,emptyWeight:10000,frontGawr:10000,rearGawr:10000,frontTireCapacity:10000,rearTireCapacity:10000,hitchCapacity:20000}],
    trailers:[{id:'tr1',status:'active',vin:'1HGBH41JXMN109187',weightBasis:'scale-ticket',verificationDate:todayISO,gvwr:10000,emptyWeight:4000,axleCapacity:10000,tireCapacity:10000,hitchCapacity:10000}]
  })
};
const localStorage={getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=String(value)}};
const document={
  hidden:false,
  head:{appendChild(){}},
  createElement:()=>({id:'',textContent:''}),
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:()=>[],
  addEventListener(){}
};
const window={
  FLTFastLoadWorkflow:{evaluatedDecisionMatches:()=>false},
  addEventListener(){}
};
const sandbox={window,document,localStorage,console,Date,setTimeout:fn=>fn()};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('v38-workflow-authority.js','utf8'),sandbox);
const authority=window.FLTWorkflowAuthority;
assert.ok(authority,'workflow authority API should load');

authority.apply();
assert.equal(loadNav.attributes['data-v38-authoritative-next'],undefined,'stale ACCEPT LOAD must not authorize Complete Accepted Load');

let sourceName='';
window.FLTFastLoadWorkflow.evaluatedDecisionMatches=()=>sourceName==='Central Dispatch';
sourceName='Central Dispatch';
authority.apply();
assert.equal(loadNav.attributes['data-v38-authoritative-next'],'true','matching current ACCEPT LOAD should authorize Complete Accepted Load');

for(const letter of ' updated'.split('')){
  sourceName+=letter;
  authority.apply();
  assert.equal(loadNav.attributes['data-v38-authoritative-next'],undefined,`source-name keystroke "${sourceName}" must not flash Complete Accepted Load`);
}

sourceName='Central Dispatch';
authority.apply();
assert.equal(loadNav.attributes['data-v38-authoritative-next'],'true','rerun matching ACCEPT LOAD should restore Complete Accepted Load');

const marked=()=>Object.entries(navButtons).filter(([,button])=>button.attributes['data-v38-authoritative-next']==='true').map(([view])=>view);
const setLoads=(loads,selected)=>{storage['flt-v32-loads']=JSON.stringify(loads);if(selected)storage['flt-selected-load-id']=selected;else delete storage['flt-selected-load-id']};

// A DEMO load is never treated as unfinished operational work.
sourceName='';
setLoads([{id:'DEMO-1001'}],'DEMO-1001');
assert.equal(authority.nextView(),'intelligence','sample DEMO loads must not hijack NEXT');

// An unfinished existing load resumes its own step while a new proposal is being typed.
const existing={id:'FLT-EXIST-1',pickupProof:{signature:'P'},deliveryProof:null};
setLoads([existing],existing.id);
assert.equal(authority.nextView(),'delivery','selected load awaiting delivery must resume at Delivery');
for(const letter of 'New Broker'.split('')){
  sourceName+=letter;
  authority.apply();
  assert.deepEqual(marked(),['delivery'],`typing "${sourceName}" in a new proposal must not flash or move NEXT off the existing load`);
}
assert.equal(existing.deliveryProof,null,'navigation must never complete a delivery signature');

// Signature steps progress only when the signatures actually exist.
setLoads([{id:'FLT-EXIST-1',pickupProof:null}],'FLT-EXIST-1');
assert.equal(authority.nextView(),'pickup');
setLoads([{id:'FLT-EXIST-1',pickupProof:{signature:'P'},deliveryProof:{signature:''}}],'FLT-EXIST-1');
assert.equal(authority.nextView(),'delivery','an empty delivery signature remains pending');
setLoads([{id:'FLT-EXIST-1',pickupProof:{signature:'P'},deliveryProof:{signature:'D'}}],'FLT-EXIST-1');
assert.equal(authority.nextView(),'finance');

// A freshly accepted new proposal (not yet converted to a load) is evaluated independently.
const unfinished={id:'FLT-EXIST-1',pickupProof:{signature:'P'},deliveryProof:null};
setLoads([unfinished],unfinished.id);
storage['flt-v38-accepted-proposal']=JSON.stringify({pickupZip:'27601',deliveryZip:'28202',offer:900,loadedMiles:150,deadheadMiles:0});
sourceName='Central Dispatch';
authority.apply();
assert.deepEqual(marked(),['load'],'a current accepted proposal points NEXT at Complete Accepted Load');
const loadCount=JSON.parse(storage['flt-v32-loads']).length;

// Once the proposal is converted (loadId stamped), NEXT follows that load and never re-requests creation.
const created={id:'FLT-NEW-2',pickupProof:null};
setLoads([unfinished,created],created.id);
storage['flt-v38-accepted-proposal']=JSON.stringify({...JSON.parse(storage['flt-v38-accepted-proposal']),loadId:created.id});
authority.apply();
assert.deepEqual(marked(),['pickup'],'converted proposal must not re-mark Complete Accepted Load');
assert.equal(JSON.parse(storage['flt-v32-loads']).length,loadCount+1,'navigation itself creates no load records');

// Switching back to the older unfinished load resumes its own step.
storage['flt-selected-load-id']=unfinished.id;
authority.apply();
assert.deepEqual(marked(),['delivery'],'selecting the older load resumes its unfinished delivery step');

// A financially closed load goes to the test gate, then completes after live review.
setLoads([{id:'FLT-DONE-3',pickupProof:{signature:'P'},deliveryProof:{signature:'D'},financialClose:{status:'Closed',snapshot:{}}}],'FLT-DONE-3');
storage['flt-v38-accepted-proposal']=JSON.stringify({pickupZip:'27601',deliveryZip:'28202',offer:900,loadedMiles:150,deadheadMiles:0,loadId:'FLT-DONE-3'});
assert.equal(authority.nextView(),'test');
storage['flt-v38-live-test-gate-reviewed']=JSON.stringify({loadId:'FLT-DONE-3'});
assert.equal(authority.nextView(),null,'reviewed closed load shows Workflow complete');

// index.html load creation guards against duplicate loads and links the accepted proposal.
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/No duplicate load was created\./,'re-submitting a converted proposal must offer to resume instead of duplicating');
assert.match(html,/loadId:id/,'created loads must be stamped back onto the accepted proposal');
assert.match(html,/acceptedEquipment/,'created loads must keep the accepted estimate equipment');

console.log('V3.8 workflow-authority stale-navigation and repeated source-name keystroke checks passed.');
console.log('V3.8 existing-load resume, independent proposal, and no-duplicate navigation checks passed.');
