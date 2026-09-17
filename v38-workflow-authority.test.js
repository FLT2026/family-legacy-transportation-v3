const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const elements=new Map();
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
nav.querySelector=selector=>{
  if(selector==='[data-view="load"]')return loadNav;
  if(selector==='[data-view="intelligence"]')return decisionNav;
  if(selector==='button.active')return decisionNav;
  if(selector.startsWith('[data-view="'))return null;
  return null;
};
nav.querySelectorAll=selector=>selector==='button[data-view]'?[decisionNav,loadNav]:[];
elements.set('nav',nav);

const storage={
  'flt-v34-business-profile':JSON.stringify({legalName:'Test Carrier'}),
  'flt-v35-classification':JSON.stringify({insuranceStatus:'verified',authorityStatus:'verified',equipmentStatus:'verified',driverOk:true}),
  'flt-v35-last-decision':JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'current'}),
  'flt-v36-regular-rig':JSON.stringify({driverId:'d1',truckId:'t1',trailerId:'tr1'}),
  'flt-v35-fleet':JSON.stringify({
    drivers:[{id:'d1',status:'active',licenseState:'NC',expiration:'2099-01-01'}],
    trucks:[{id:'t1',status:'active',vin:'1HGBH41JXMN109186',weightBasis:'scale-ticket',verificationDate:'2025-01-01',gvwr:20000,gcwr:30000,emptyWeight:10000,frontGawr:10000,rearGawr:10000,frontTireCapacity:10000,rearTireCapacity:10000,hitchCapacity:20000}],
    trailers:[{id:'tr1',status:'active',vin:'1HGBH41JXMN109187',weightBasis:'scale-ticket',verificationDate:'2025-01-01',gvwr:10000,emptyWeight:4000,axleCapacity:10000,tireCapacity:10000,hitchCapacity:10000}]
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
console.log('V3.8 workflow-authority stale-navigation and repeated source-name keystroke checks passed.');
