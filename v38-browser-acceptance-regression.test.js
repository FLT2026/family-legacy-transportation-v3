const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

{
  const html=fs.readFileSync('index.html','utf8');
  const modalRule=html.match(/\.modal\s*\{([^}]+)\}/)?.[1];
  assert.ok(modalRule,'the shared financial/reset modal needs a layout rule');
  assert.match(modalRule,/max-height:calc\(100vh - 36px\)/,'retain a viewport-height fallback');
  assert.match(modalRule,/max-height:calc\(100dvh - 36px\)/,'fit within the dynamic viewport and backdrop padding');
  assert.match(modalRule,/overflow-y:auto/,'tall forms must scroll to Save and Cancel');
  assert.match(modalRule,/min-height:0/,'grid min-content sizing must not prevent shrinking');
}

// Exercise the dynamically added button, not a direct view/API call.
{
  const elements=new Map(),handlers=new Map();
  const element=id=>({
    id,dataset:{},textContent:'',classList:{active:false,toggle(name,value){this.active=value}},
    addEventListener(type,handler){handlers.set(this,handler)},
    querySelector(){return null},
    appendChild(child){elements.set(child.id,child)}
  });
  const dashboard=element('dashboard'),fleet=element('fleet'),main=element('main');
  const fleetButton=element('fleet-button');fleetButton.dataset.view='fleet';
  let dispatchButton;
  fleetButton.insertAdjacentElement=(_position,button)=>{dispatchButton=button};
  const nav=element('nav');
  nav.querySelector=selector=>selector.includes('dispatch-control')?dispatchButton:fleetButton;
  nav.querySelectorAll=()=>[fleetButton,dispatchButton].filter(Boolean);
  ['page-title','page-subtitle'].forEach(id=>elements.set(id,element(id)));
  elements.set('nav',nav);elements.set('fleet',fleet);
  const document={
    getElementById:id=>elements.get(id)||null,
    createElement:()=>element(''),
    querySelector:selector=>selector==='main'?main:null,
    querySelectorAll:selector=>selector==='.view'?[dashboard,fleet,elements.get('dispatch-control')].filter(Boolean):[]
  };
  let refreshes=0;
  const sandbox={document,window:{FLTFleetCore:{render(){refreshes++}},addEventListener(){},scrollTo(){}},setTimeout(){},MutationObserver:class{observe(){}}};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('v38-dispatch-control-page.js','utf8'),sandbox);
  const click=handlers.get(dispatchButton);
  assert.equal(typeof click,'function','dynamic Dispatch navigation needs its own click handler');
  for(const previous of [dashboard,fleet]){
    previous.classList.active=true;
    click();
    assert.equal(elements.get('dispatch-control').classList.active,true);
    assert.equal(previous.classList.active,false);
    assert.equal(dispatchButton.classList.active,true);
    assert.equal(fleetButton.classList.active,false);
    assert.equal(elements.get('page-title').textContent,'Dispatch Control.');
  }
  sandbox.window.FLTDispatchControlPage.apply();
  assert.equal(nav.querySelectorAll().length,2,'reapplying must not add duplicate navigation');
  assert.equal(refreshes,2,'each visit must refresh open loads and fleet options before dispatch review');
}

{
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('    function renderDashboard(){');
  const end=html.indexOf('    const hero=',start);
  assert.ok(start>=0&&end>start,'run the real Dashboard renderer');
  const elements=new Map(),get=id=>{
    if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',style:{}});
    return elements.get(id);
  };
  let loads=[],selected,storage={};
  const sandbox={
    document:{getElementById:get,querySelector:()=>get('fleet-caption'),querySelectorAll:()=>[]},
    store:{loads},current:()=>selected||{},localStorage:{getItem:key=>storage[key]||null},
    window:{},actualRevenue:load=>load.revenue||0,actualMargin:()=>'',Intl
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('v38-pickup-delivery-integrity.js','utf8'),sandbox);
  vm.runInContext(html.slice(start,end),sandbox);
  const render=()=>{sandbox.store.loads=loads;sandbox.renderDashboard()};
  const a={id:'A',customer:'Synthetic',pickup:'A',delivery:'B',date:'2026-10-20',revenue:1000,payments:[],invoice:{loadId:'A',status:'Draft'},documents:[]};
  const b={...a,id:'B',invoice:{loadId:'B',status:'Finalized'},financialClose:{status:'Closed',snapshot:{}}};
  loads=[a,b];selected=a;
  storage={
    'flt-v35-fleet':JSON.stringify({trucks:[{id:'T1',status:'active'},{id:'T2',status:'active'}],locks:[]}),
    'flt-v38-assignments':JSON.stringify({assignments:[
      {loadId:'A',truckId:'T1',status:'Verified / Locked'},
      {loadId:'B',truckId:'T2',status:'Verified / Locked'}
    ]})
  };
  const before=JSON.stringify(loads);
  render();
  assert.equal(get('fleet-utilization').textContent,'50%','closed assignments do not consume active utilization');
  assert.equal(get('fleet-caption').textContent,'1 of 2 verified trucks assigned');
  assert.equal(get('open-loads').textContent,1);
  assert.equal(get('health-invoice').textContent,'Draft — delivery proof pending');
  assert.equal(JSON.stringify(loads),before,'Dashboard rendering cannot modify saved records');

  a.pickupProof={signature:'signed',name:'Shipper',time:'08:00'};
  a.deliveryProof={signature:'signed',name:'Receiver',time:'15:00'};
  a.pod=true;
  a.documents=[
    {loadId:'A',stage:'pickup',type:'Bill of Lading / Shipping Document'},
    {loadId:'B',stage:'delivery',type:'Proof of Delivery'}
  ];
  render();
  assert.equal(get('health-invoice').textContent,'Draft — delivery proof pending','another load POD never implies readiness');
  a.documents[1].loadId='A';
  render();
  assert.equal(get('health-invoice').textContent,'Draft — ready to finalize');
  a.invoice=null;render();
  assert.equal(get('health-invoice').textContent,'Ready to draft');
  a.invoice={loadId:'A',status:'Finalized'};render();
  assert.equal(get('health-invoice').textContent,'Finalized');
  a.invoice.loadId='B';render();
  assert.equal(get('health-invoice').textContent,'Review invoice Load ID');

  storage['flt-v38-assignments']=JSON.stringify({assignments:[]});render();
  assert.equal(get('fleet-utilization').textContent,'0%');
  assert.equal(get('fleet-caption').textContent,'No assigned trucks');
  storage['flt-v35-fleet']=JSON.stringify({trucks:[{id:'T1',status:'active'}],locks:[{loadId:'A',truckId:'T1'}]});
  render();
  assert.equal(get('fleet-utilization').textContent,'100%','legacy locks still supply assignment usage');
  assert.equal(get('fleet-caption').textContent,'1 of 1 verified trucks assigned');
  storage['flt-v35-fleet']=JSON.stringify({trucks:[{id:'T1',status:'planned'}],locks:[{loadId:'A',truckId:'T1'}]});
  render();
  assert.equal(get('fleet-utilization').textContent,'0%','unverified trucks cannot consume verified capacity');
  loads=[];selected=null;render();
  assert.equal(get('health-invoice').textContent,'Not started');
  assert.equal(get('fleet-utilization').textContent,'0%');
}

console.log('V3.8 scrollable modal layout, Dispatch navigation, Dashboard utilization captions, closed-load exclusion, and selected-load invoice readiness checks passed.');
