const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

{
  const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('    function setupCanvas('),end=html.indexOf('    const signatures=',start);
  assert.ok(start>=0&&end>start);
  for(const type of ['pickup','delivery']){
    const handlers={},canvas={ink:'',clientWidth:200,clientHeight:180,
      getBoundingClientRect:()=>({width:200,height:180,left:0,top:0}),setPointerCapture(){},
      toDataURL(){return this.ink},addEventListener(name,fn){handlers[name]=fn}
    };
    Object.defineProperty(canvas,'width',{set(){canvas.ink=''}});
    const context={setTransform(){},clearRect(){canvas.ink=''},beginPath(){},moveTo(){},lineTo(){},stroke(){canvas.ink='draft-signature'},drawImage(image){canvas.ink=image.src}};
    canvas.getContext=()=>context;
    const saved={signature:'historical-signature'},load={[type+'Proof']:saved};
    const sandbox={document:{getElementById:()=>canvas,querySelector:()=>({addEventListener(_name,fn){handlers.clear=fn}})},
      window:{devicePixelRatio:1,addEventListener(name,fn){handlers[name]=fn}},
      current:()=>load,Image:class{set src(value){this.value=value;this.onload()}get src(){return this.value}}
    };
    vm.createContext(sandbox);vm.runInContext(html.slice(start,end),sandbox);
    const signature=sandbox.setupCanvas(type+'-signature',type);signature.restore(saved.signature);
    handlers.pointerdown({pointerId:1,clientX:10,clientY:10});handlers.pointermove({clientX:20,clientY:20});handlers.pointerup();
    handlers.resize();
    assert.equal(signature.capture(),'draft-signature',type+' draft must survive viewport resize instead of reverting to saved proof');
    handlers.clear();handlers.resize();
    assert.equal(signature.capture(),null,'resize must not resurrect a deliberately cleared signature');
    assert.equal(saved.signature,'historical-signature','resizing must never change saved proof');
  }
}

{
  const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('    // V3.4 expense receipt attachments.'),end=html.indexOf('    function invoice()',start);
  assert.ok(start>=0&&end>start);
  const handlers={},picker={files:[],addEventListener(type,fn){handlers[type]=fn},click(){}};
  const ledger={addEventListener(type,fn){handlers['ledger-'+type]=fn},insertAdjacentElement(_position,notice){assert.match(notice.textContent,/metadata only.*File contents are not stored/)}};
  const a={id:'A',expenses:[{id:'EA'},{id:'EA2'}]},b={id:'B',expenses:[{id:'EB'}]};
  let selected=a,persisted=0;
  const toasts=[],sandbox={
    document:{createElement:tag=>tag==='input'?picker:{},body:{append(){}},getElementById:()=>ledger},
    current:()=>selected,persist(){persisted++},renderFinance(){},toast:message=>toasts.push(message),Date
  };
  vm.createContext(sandbox);vm.runInContext(html.slice(start,end),sandbox);
  const attach=index=>handlers['ledger-click']({target:{closest:selector=>selector==='[data-attach-receipt]'?{dataset:{attachReceipt:String(index)}}:null}});
  const choose=()=>{picker.files=[{name:'receipt.pdf',type:'application/pdf'}];handlers.change()};
  attach(0);selected=b;choose();
  assert.equal(b.expenses[0].receipt,undefined,'a pending receipt must never follow selection to another load');
  assert.equal(persisted,0);
  assert.match(toasts.at(-1),/load.*changed/i);
  selected=a;attach(0);a.expenses.reverse();choose();
  assert.equal(a.expenses.find(e=>e.id==='EA2').receipt,undefined,'reordering cannot redirect evidence');
  const receipt=a.expenses.find(e=>e.id==='EA').receipt;
  assert.equal(receipt.loadId,'A');assert.equal(receipt.expenseId,'EA');
  assert.equal(receipt.expenseIndex,1);
  attach(0);a.expenses.shift();const before=JSON.stringify(a);choose();
  assert.equal(JSON.stringify(a),before,'removed expense cannot redirect to its replacement index');
  assert.match(toasts.at(-1),/expense.*changed/i);
  attach(0);a.financialClose={status:'Closed'};const closed=JSON.stringify(a);choose();
  assert.equal(JSON.stringify(a),closed,'closing while the picker is open must block the receipt');
  assert.match(toasts.at(-1),/closed/i);
  a.financialClose.status='Correction Open';
  attach(0);choose();
  assert.equal(a.expenses[0].receipt.expenseId,a.expenses[0].id,'protected correction can attach to the same stable expense');
  const legacy={id:'LEGACY',expenses:[{category:'Fuel'}]};
  selected=legacy;attach(0);choose();
  assert.equal(legacy.expenses[0].receipt.loadId,legacy.id,'legacy expenses without IDs retain object identity');
  assert.equal(legacy.expenses[0].id,undefined,'attaching evidence must not backfill historical expense IDs');
}

{
  const html=fs.readFileSync('index.html','utf8');
  const modalRule=html.match(/\.modal\s*\{([^}]+)\}/)?.[1];
  assert.ok(modalRule,'the shared financial/reset modal needs a layout rule');
  assert.match(modalRule,/max-height:calc\(100vh - 36px\)/,'retain a viewport-height fallback');
  assert.match(modalRule,/max-height:calc\(100dvh - 36px\)/,'fit within the dynamic viewport and backdrop padding');
  assert.match(modalRule,/overflow-y:auto/,'tall forms must scroll to Save and Cancel');
  assert.match(modalRule,/min-height:0/,'grid min-content sizing must not prevent shrinking');
  const actualTrip=fs.readFileSync('v36-actual-trip.js','utf8');
  assert.equal((actualTrip.match(/Receipt metadata recorded \(not file storage\)/g)||[]).length,2,'Actual Trip and its gate must describe metadata checks, not stored receipts');
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

console.log('V3.8 signature draft resize, stable receipt associations, scrollable modals, Dispatch navigation, and Dashboard readiness checks passed.');
