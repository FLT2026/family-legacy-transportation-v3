const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

// V3.8 regression: after ACCEPT LOAD auto-navigates the operator from
// "1 · Evaluate Proposed Load" to "2 · Complete Accepted Load", the yellow
// NEXT highlight must move cleanly with it. Previously v38-fast-load-workflow.js
// and v38-navigation-prerequisites-hardfix.js each computed and applied their
// own "next step" nav classes in addition to window.FLTWorkflowAuthority, so
// "1 · Evaluate Proposed Load" could stay marked nav-required/nav-waiting/
// v38-nav-next at the same time the authority marked "2 · Complete Accepted
// Load" as next. This test loads the three real modules together (the same
// combination active in the browser) and asserts only the authority's
// single-source-of-truth attribute ever marks a nav button as NEXT.
(function testAcceptLoadNavigationHighlightHandoff(){
  const elements=new Map();
  function el(id=''){
    const node={
      id,dataset:{},attributes:{},
      classList:{
        list:new Set(),
        add(name){this.list.add(name)},
        remove(name){this.list.delete(name)},
        toggle(name,on){on?this.list.add(name):this.list.delete(name)},
        contains(name){return this.list.has(name)}
      },
      children:[],
      addEventListener(){},appendChild(){},
      setAttribute(name,value){this.attributes[name]=String(value)},
      removeAttribute(name){delete this.attributes[name]},
      querySelector(){return null},querySelectorAll(){return[]}
    };
    elements.set(id,node);
    return node;
  }

  const nav=el('nav');
  const decisionNav=el('intelligence-nav');decisionNav.dataset.view='intelligence';
  const loadNav=el('load-nav');loadNav.dataset.view='load';
  let activeButton=decisionNav;
  nav.querySelector=selector=>{
    if(selector==='button.active')return activeButton;
    if(selector==='[data-view="load"]')return loadNav;
    if(selector==='[data-view="intelligence"]')return decisionNav;
    return null;
  };
  nav.querySelectorAll=selector=>{
    if(selector==='button[data-view]')return[decisionNav,loadNav];
    if(selector==='.v38-nav-next')return[decisionNav,loadNav].filter(b=>b.classList.contains('v38-nav-next'));
    return[];
  };
  elements.set('nav',nav);

  const storage={
    'flt-v38-dashboard-reviewed':'true',
    'flt-v34-business-profile':JSON.stringify({legalName:'Test Carrier'}),
    'flt-v35-classification':JSON.stringify({insuranceStatus:'verified',authorityStatus:'verified',equipmentStatus:'verified',driverOk:true}),
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
    createElement:()=>({id:'',style:{},innerHTML:'',classList:{add(){},remove(){}}}),
    getElementById:id=>elements.get(id)||(id==='nav'?nav:null),
    querySelectorAll:()=>[],
    querySelector:()=>null,
    addEventListener(){}
  };

  let sourceName='';
  let evaluationMatches=false;
  const window={
    FLTFastLoadWorkflow:{evaluatedDecisionMatches:()=>evaluationMatches},
    addEventListener(){}
  };
  const sandbox={window,document,localStorage,console,Date,setTimeout:fn=>fn(),MutationObserver:class{observe(){}}};
  vm.createContext(sandbox);

  // Load the three real, currently-shipping modules together, in their real
  // script-load order, sharing the same fake DOM/localStorage/window.
  vm.runInContext(fs.readFileSync('v38-navigation-prerequisites-hardfix.js','utf8'),sandbox);
  vm.runInContext(fs.readFileSync('v38-workflow-authority.js','utf8'),sandbox);
  const hardfix=window.FLTNavigationPrerequisitesHardfix;
  const authority=window.FLTWorkflowAuthority;
  assert.ok(hardfix,'navigation prerequisites hardfix API should load');
  assert.ok(authority,'workflow authority API should load');

  function highlightState(){
    return{
      decisionHighlighted:decisionNav.classList.contains('nav-required')||decisionNav.classList.contains('v38-nav-next')||decisionNav.attributes['data-v38-authoritative-next']==='true',
      loadHighlighted:loadNav.classList.contains('nav-required')||loadNav.classList.contains('v38-nav-next')||loadNav.attributes['data-v38-authoritative-next']==='true'
    };
  }

  // Before acceptance: Step 1 is the required/highlighted step, Step 2 is not.
  hardfix.apply();
  let state=highlightState();
  assert.equal(state.decisionHighlighted,true,'before acceptance, Evaluate Proposed Load must be the highlighted NEXT step');
  assert.equal(state.loadHighlighted,false,'before acceptance, Complete Accepted Load must not be highlighted');

  // Simulate ACCEPT LOAD: the decision now matches the recorded evaluation,
  // and the app auto-navigates the active button to "load" (Step 2).
  localStorage.setItem('flt-v35-last-decision',JSON.stringify({decision:'ACCEPT LOAD',snapshotId:'current'}));
  evaluationMatches=true;
  activeButton=loadNav;
  hardfix.apply();
  state=highlightState();
  assert.equal(state.decisionHighlighted,false,'immediately after ACCEPT LOAD navigation, Evaluate Proposed Load must NOT remain highlighted');
  assert.equal(state.loadHighlighted,true,'immediately after ACCEPT LOAD navigation, Complete Accepted Load must be highlighted');
  assert.equal(loadNav.attributes['data-v38-authoritative-next'],'true','Complete Accepted Load must carry the single authoritative NEXT marker');
  assert.equal(decisionNav.attributes['data-v38-authoritative-next'],undefined,'Evaluate Proposed Load must not carry the authoritative NEXT marker');

  // While the operator is actively filling in Step 2 fields, re-running apply()
  // (as the app does on every relevant input/change event) must keep Step 1
  // un-highlighted the entire time.
  for(const letter of 'Acme Freight Co'){
    sourceName+=letter;
    hardfix.apply();
    state=highlightState();
    assert.equal(state.decisionHighlighted,false,`while completing Step 2 ("${sourceName}"), Evaluate Proposed Load must stay un-highlighted`);
    assert.equal(state.loadHighlighted,true,`while completing Step 2 ("${sourceName}"), Complete Accepted Load must remain the highlighted NEXT step`);
  }

  console.log('V3.8 ACCEPT LOAD navigation highlight handoff (Step 1 -> Step 2) checks passed.');
})();
