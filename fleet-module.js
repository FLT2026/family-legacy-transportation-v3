(() => {
  const key='flt-v35-fleet';
  let data={drivers:[],trucks:[],trailers:[],locks:[],audit:[]};
  try{data={...data,...JSON.parse(localStorage.getItem(key)||'{}')}}catch(error){}
  const nav=document.getElementById('nav');
  const loadNav=nav?.querySelector('[data-view="load"]');
  if(!nav||!loadNav||document.getElementById('fleet'))return;
  const navButton=document.createElement('button');
  navButton.dataset.view='fleet';
  navButton.innerHTML='<span class="nav-icon">▤</span><span class="nav-label">Drivers & Equipment</span>';
  nav.insertBefore(navButton,loadNav);
  const section=document.createElement('section');
  section.className='view';section.id='fleet';
  section.innerHTML=`
    <div class="hero"><div><div class="eyebrow" style="color:var(--lime)">V3.5 individual records</div><h2>Drivers, Trucks, Trailers & Trip Lock</h2><p class="subtle">Each driver and asset keeps its own qualification, ratings, and verification status.</p></div></div>
    <div class="grid three">
      <div class="panel"><div class="eyebrow">Driver record</div><h2>Add driver</h2><form id="fleet-driver-form" class="form-grid" style="margin-top:14px"><div class="field full"><label>Driver name or internal ID</label><input name="name" required></div><div class="field full"><label>Qualification</label><select name="qualification"><option>Non-CDL Driver</option><option>CDL Class A</option><option>CDL Class B</option><option>CDL Class C</option><option>Commercial Learner's Permit</option><option>Not Applicable — Non-Driving User</option></select></div><div class="field"><label>Operating area</label><select name="area"><option>Intrastate Only</option><option>Interstate</option></select></div><div class="field"><label>License state</label><input name="licenseState" maxlength="2" placeholder="NC"></div><div class="field"><label>License expiration</label><input name="expiration" type="date"></div><div class="field full"><label>Endorsements</label><input name="endorsements" placeholder="None, Hazmat, Tanker, Passenger, etc."></div><div class="field full"><label>Restrictions</label><input name="restrictions" placeholder="None or list restrictions"></div><div class="field"><label>Status</label><select name="status"><option value="planned">Planned</option><option value="active">Active / Verified</option></select></div><div class="form-actions field full"><button class="btn primary">Save driver</button></div></form></div>
      <div class="panel"><div class="eyebrow">Truck record</div><h2>Add truck</h2><form id="fleet-truck-form" class="form-grid" style="margin-top:14px"><div class="field"><label>Unit ID</label><input name="unit" required placeholder="Truck 01"></div><div class="field"><label>VIN</label><input name="vin"></div><div class="field"><label>GVWR (lb)</label><input name="gvwr" type="number" min="1" required></div><div class="field"><label>GCWR (lb)</label><input name="gcwr" type="number" min="1"></div><div class="field"><label>Empty weight (lb)</label><input name="emptyWeight" type="number" min="1"></div><div class="field"><label>Status</label><select name="status"><option value="planned">Planned</option><option value="active">Active / Verified</option></select></div><div class="form-actions field full"><button class="btn primary">Save truck</button></div></form></div>
      <div class="panel"><div class="eyebrow">Trailer record</div><h2>Add trailer</h2><form id="fleet-trailer-form" class="form-grid" style="margin-top:14px"><div class="field"><label>Unit ID</label><input name="unit" required placeholder="Trailer 01"></div><div class="field"><label>VIN</label><input name="vin"></div><div class="field full"><label>Configuration</label><select name="configuration"><option>Gooseneck trailer</option><option>Bumper-pull trailer</option><option>Auto-hauler trailer</option><option>Enclosed trailer</option><option>No trailer</option></select></div><div class="field"><label>GVWR (lb)</label><input name="gvwr" type="number" min="1"></div><div class="field"><label>Empty weight (lb)</label><input name="emptyWeight" type="number" min="1"></div><div class="field full"><label>Status</label><select name="status"><option value="planned">Planned</option><option value="active">Active / Verified</option></select></div><div class="form-actions field full"><button class="btn primary">Save trailer</button></div></form></div>
    </div>
    <div class="grid three" style="margin-top:14px"><div class="panel"><div class="section-head"><h2>Drivers</h2><span class="tag gray" id="fleet-driver-count">0</span></div><div id="fleet-driver-list"></div></div><div class="panel"><div class="section-head"><h2>Trucks</h2><span class="tag gray" id="fleet-truck-count">0</span></div><div id="fleet-truck-list"></div></div><div class="panel"><div class="section-head"><h2>Trailers</h2><span class="tag gray" id="fleet-trailer-count">0</span></div><div id="fleet-trailer-list"></div></div></div>
    <div class="panel" style="margin-top:14px"><div class="section-head"><div><div class="eyebrow">Dispatch control</div><h2>Driver–Truck–Trailer Trip Lock</h2><p class="subtle" style="margin-top:5px">Only active, verified records can be locked to a dispatched load.</p></div><span class="tag gray" id="fleet-lock-status">Not locked</span></div><form id="fleet-lock-form" class="form-grid"><div class="field"><label>Load</label><select id="fleet-lock-load" required></select></div><div class="field"><label>Driver</label><select id="fleet-lock-driver" required></select></div><div class="field"><label>Truck</label><select id="fleet-lock-truck" required></select></div><div class="field"><label>Trailer</label><select id="fleet-lock-trailer" required></select></div><div class="field full"><label>Assignment reason</label><input id="fleet-lock-reason" required value="Initial dispatch assignment"></div><div class="form-actions field full"><button class="btn primary">Lock assignment at Dispatch</button></div></form><div id="fleet-lock-summary" class="notice" style="margin-top:14px;margin-bottom:0">No trip assignment is currently locked.</div></div><div class="panel" style="margin-top:14px"><div class="section-head"><div><div class="eyebrow">Immutable history</div><h2>Dispatch Audit Trail</h2></div><span class="tag gray" id="fleet-audit-count">0 events</span></div><div id="fleet-audit-list" class="empty">No dispatch events recorded.</div></div>`;
  document.querySelector('main')?.appendChild(section);
  const fleetTitle=['Drivers & Equipment.','Keep each driver, truck, and trailer as a separate reusable record.'];
  navButton.addEventListener('click',()=>{document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='fleet'));document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b===navButton));document.getElementById('page-title').textContent=fleetTitle[0];document.getElementById('page-subtitle').textContent=fleetTitle[1];render();window.scrollTo({top:0,behavior:'smooth'});});
  const save=()=>localStorage.setItem(key,JSON.stringify(data));
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
  const uid=p=>p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
  const num=v=>String(v||'').trim()===''?null:Number(v);
  const item=(form,type)=>{const x=Object.fromEntries(new FormData(form).entries());x.id=uid(type);['gvwr','gcwr','emptyWeight'].forEach(k=>{if(k in x)x[k]=num(x[k])});return x};
  function list(name,label,title,detail){const items=data[name],box=document.getElementById('fleet-'+label+'-list');document.getElementById('fleet-'+label+'-count').textContent=items.length;box.innerHTML=items.length?items.map(x=>'<div class="metric-row"><span><strong>'+esc(x[title])+'</strong><br><small class="subtle">'+esc(x[detail]||'Not verified')+(detail==='gvwr'&&x[detail]?' lb':'')+'</small></span><span class="tag '+(x.status==='active'?'':'orange')+'">'+(x.status==='active'?'VERIFIED':'PLANNED')+'</span></div>').join(''):'<div class="empty">No '+label+' records yet.</div>'}
  function opts(items,label){return '<option value="">Select '+label+'</option>'+items.map(x=>'<option value="'+x.id+'">'+esc(x.name||x.unit)+' · '+(x.status==='active'?'Verified':'Planned')+'</option>').join('')}
  function renderAudit(){const box=document.getElementById('fleet-audit-list');document.getElementById('fleet-audit-count').textContent=data.audit.length+' events';box.className='';box.innerHTML=data.audit.length?[...data.audit].reverse().map(x=>'<div class="metric-row"><span><strong>'+esc(x.action==='blocked_dispatch'?'DO NOT DISPATCH':(x.action==='authorized_change'?'AUTHORIZED CHANGE':'DISPATCH LOCK'))+'</strong><br><small class="subtle">'+esc(x.entityId)+' · '+new Date(x.timestamp).toLocaleString()+'<br>'+esc((x.reasons||[x.reason]).filter(Boolean).join(' · '))+'</small></span><span class="tag '+(x.action==='blocked_dispatch'?'red':'')+'">'+(x.action==='blocked_dispatch'?'BLOCKED':'RECORDED')+'</span></div>').join(''):'<div class="empty">No dispatch events recorded.</div>'}function render(){list('drivers','driver','name','qualification');list('trucks','truck','unit','gvwr');list('trailers','trailer','unit','gvwr');document.getElementById('fleet-lock-load').innerHTML='<option value="">Select load</option>'+store.loads.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.id)+' · '+esc(x.customer)+'</option>').join('');document.getElementById('fleet-lock-driver').innerHTML=opts(data.drivers,'driver');document.getElementById('fleet-lock-truck').innerHTML=opts(data.trucks,'truck');document.getElementById('fleet-lock-trailer').innerHTML=opts(data.trailers,'trailer');const x=data.locks.at(-1);if(x){document.getElementById('fleet-lock-status').textContent='LOCKED';document.getElementById('fleet-lock-status').className='tag';document.getElementById('fleet-lock-summary').innerHTML='<strong>'+esc(x.loadId)+'</strong> locked to '+esc(x.driverName)+' · '+esc(x.truckUnit)+' · '+esc(x.trailerUnit)+'<br><span class="subtle">'+new Date(x.lockedAt).toLocaleString()+' · '+esc(x.reason)+'</span>'}renderAudit()}
  [['driver','drivers','DRV'],['truck','trucks','TRK'],['trailer','trailers','TRL']].forEach(([label,bucket,type])=>document.getElementById('fleet-'+label+'-form').addEventListener('submit',e=>{e.preventDefault();data[bucket].push(item(e.currentTarget,type));save();render();e.currentTarget.reset();toast(label[0].toUpperCase()+label.slice(1)+' record saved.');}));
  document.getElementById('fleet-lock-form').addEventListener('submit',e=>{e.preventDefault();const loadId=document.getElementById('fleet-lock-load').value,d=data.drivers.find(x=>x.id===document.getElementById('fleet-lock-driver').value),t=data.trucks.find(x=>x.id===document.getElementById('fleet-lock-truck').value),r=data.trailers.find(x=>x.id===document.getElementById('fleet-lock-trailer').value),reason=document.getElementById('fleet-lock-reason').value.trim();const failures=[];const expiration=d?.expiration?new Date(d.expiration+'T23:59:59'):null;if(d?.status!=='active')failures.push('Driver is not active and verified.');if(!d?.licenseState||!expiration||expiration<new Date())failures.push('Driver license state or current expiration date is missing.');if(t?.status!=='active'||!t.gvwr||!t.gcwr||!t.emptyWeight)failures.push('Truck verification or ratings are incomplete.');if(r?.status!=='active'||!r.gvwr||!r.emptyWeight)failures.push('Trailer verification or ratings are incomplete.');if(failures.length){data.audit.push({entity:'trip_lock',entityId:loadId||'No load selected',action:'blocked_dispatch',reasons:failures,timestamp:new Date().toISOString()});save();render();alert('DO NOT DISPATCH\n\n'+failures.join('\n'));return}const old=data.locks.find(x=>x.loadId===loadId);if(old&&!confirm('Authorized change only: continue and record the new assignment?'))return;const lock={id:uid('LOCK'),loadId,driverId:d.id,driverName:d.name,truckId:t.id,truckUnit:t.unit,trailerId:r.id,trailerUnit:r.unit,reason,lockedAt:new Date().toISOString()};data.locks.push(lock);data.audit.push({entity:'trip_lock',entityId:loadId,action:old?'authorized_change':'dispatch_lock',before:old||null,after:lock,reason,timestamp:lock.lockedAt});save();render();toast('Trip assignment locked and audit entry recorded.');});
  render();
})();

// V3.5 Accurate Proposed Load completion pass.
(() => {
  const form=document.getElementById('v35-decision-form');
  if(!form||document.getElementById('v35-completion-fields'))return;
  const $=id=>document.getElementById(id);
  const value=id=>String($(id)?.value??'').trim();
  const number=id=>value(id)===''?0:Number(value(id));
  const requiredNumber=id=>value(id)===''?null:Number(value(id));
  const cash=n=>Number.isFinite(n)?n.toLocaleString('en-US',{style:'currency',currency:'USD'}):'—';
  const percent=n=>Number.isFinite(n)?(n*100).toFixed(1)+'%':'—';
  const classKey='flt-v35-classification';
  const snapshotKey='flt-v35-estimate-snapshots';

  const fields=document.createElement('div');
  fields.id='v35-completion-fields';
  fields.className='field full';
  fields.innerHTML=`<div class="panel" style="margin-top:10px">
    <div class="section-head"><div><div class="eyebrow">V3.5 completion pass</div><h2>Complete Proposed-Load Economics</h2><p class="subtle" style="margin-top:5px">Adds return/repositioning miles, separate loaded/empty MPG, full configurable trip costs, profit floors, negotiation allowance, counteroffer, and immutable estimate history.</p></div></div>
    <div class="form-grid">
      <div class="field"><label>Repositioning / Return Deadhead Miles</label><input id="v35-return-deadhead" type="number" min="0" step="0.1" value="0"></div>
      <div class="field"><label>MPG Calculation Mode</label><select id="v35-mpg-mode"><option value="blended">Blended MPG</option><option value="separate">Separate Loaded / Empty MPG</option></select></div>
      <div class="field"><label>Loaded MPG</label><input id="v35-loaded-mpg" type="number" min="0.1" step="0.1" placeholder="Used in separate mode"></div>
      <div class="field"><label>Empty MPG</label><input id="v35-empty-mpg" type="number" min="0.1" step="0.1" placeholder="Used in separate mode"></div>
      <div class="subhead"><h3>Additional trip costs</h3></div>
      <div class="field"><label>Parking ($)</label><input id="v35-parking" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Permits ($)</label><input id="v35-permits" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Lodging ($)</label><input id="v35-lodging" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Meals ($)</label><input id="v35-meals" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Scales ($)</label><input id="v35-scales" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Washout ($)</label><input id="v35-washout" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Loading / Unloading ($)</label><input id="v35-loading-cost" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Securement ($)</label><input id="v35-securement-cost" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Insurance / Fixed Allocation ($)</label><input id="v35-insurance-allocation" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Other Trip Costs ($)</label><input id="v35-other-costs" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Factoring / Payment Fee (%)</label><input id="v35-factoring-percent" type="number" min="0" step="0.01" value="0"></div>
      <div class="subhead"><h3>Required profit floors</h3></div>
      <div class="field"><label>Target Margin (%)</label><input id="v35-target-margin" type="number" min="0" max="95" step="0.1" value="0"></div>
      <div class="field"><label>Minimum Profit / Total Mile ($)</label><input id="v35-profit-mile-floor" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Expected Trip Hours</label><input id="v35-trip-hours" type="number" min="0" step="0.25" value="0"></div>
      <div class="field"><label>Minimum Profit / Hour ($)</label><input id="v35-hourly-floor" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Negotiation Allowance (%)</label><input id="v35-negotiation-percent" type="number" min="0" step="0.1" value="5"></div>
    </div>
    <div class="grid three" style="margin-top:14px">
      <div class="panel"><div class="eyebrow">Counteroffer</div><h3 id="v35-counteroffer">—</h3><p class="subtle" id="v35-counteroffer-rate">—</p></div>
      <div class="panel"><div class="eyebrow">Profit floors</div><h3 id="v35-profit-floor-result">—</h3><p class="subtle" id="v35-hourly-result">—</p></div>
      <div class="panel"><div class="eyebrow">Estimate history</div><h3 id="v35-snapshot-count">0 snapshots</h3><p class="subtle">Append-only browser prototype history</p></div>
    </div>
  </div>`;
  const actions=form.querySelector('.form-actions');
  if(actions)form.insertBefore(fields,actions);else form.appendChild(fields);

  function readClassification(){try{return JSON.parse(localStorage.getItem(classKey)||'null')}catch(error){return null}}
  function readSnapshots(){try{const x=JSON.parse(localStorage.getItem(snapshotKey)||'[]');return Array.isArray(x)?x:[]}catch(error){return[]}}
  function saveSnapshot(snapshot){const list=readSnapshots();list.push(Object.freeze({...snapshot}));localStorage.setItem(snapshotKey,JSON.stringify(list));return list.length}
  function updateSnapshotCount(){const el=$('v35-snapshot-count');if(el)el.textContent=readSnapshots().length+' snapshots'}

  function renderDecision(decision,reasons,metrics){
    const card=$('v35-decision-card');
    if(card)card.className='panel decision-card'+(decision==='DO NOT DISPATCH'?' block':(['NEGOTIATE RATE','PASS ON LOAD','MORE INFORMATION REQUIRED'].includes(decision)?' warn':''));
    if($('v35-decision'))$('v35-decision').textContent=decision;
    const summaries={
      'ACCEPT LOAD':'Offer satisfies every configured V3.5 profit floor and current dispatch checks.',
      'NEGOTIATE RATE':'The load covers estimated cost but misses one or more configured profit floors.',
      'PASS ON LOAD':'The offer is below the walk-away amount.',
      'MORE INFORMATION REQUIRED':'Reliable V3.5 economics cannot be completed until required inputs are supplied.',
      'DO NOT DISPATCH':'A non-negotiable legal, safety, insurance, driver, weight, or equipment check failed.'
    };
    if($('v35-decision-summary'))$('v35-decision-summary').textContent=summaries[decision]||'';
    const list=$('v35-decision-reasons');if(list){list.innerHTML='';reasons.forEach(reason=>{const li=document.createElement('li');li.textContent=reason;list.appendChild(li)})}
    const set=(id,text)=>{if($(id))$(id).textContent=text};
    set('v35-total-miles',metrics.totalMiles!=null?metrics.totalMiles.toLocaleString()+' mi':'—');
    set('v35-cpm',metrics.cpm!=null?cash(metrics.cpm)+' / mi':'—');
    set('v35-rpm',metrics.rpm!=null?cash(metrics.rpm)+' / mi':'—');
    set('v35-profit',metrics.profit!=null?cash(metrics.profit):'—');
    set('v35-walkaway',metrics.walkaway!=null?cash(metrics.walkaway):'—');
    set('v35-target',metrics.target!=null?cash(metrics.target):'—');
    set('v35-ask',metrics.ask!=null?cash(metrics.ask):'—');
    set('v35-payload',metrics.payload!=null?metrics.payload.toLocaleString()+' lb':'—');
    set('v35-counteroffer',metrics.counteroffer!=null?cash(metrics.counteroffer):'—');
    set('v35-counteroffer-rate',metrics.counterofferRate!=null?cash(metrics.counterofferRate)+' / total mile target':'—');
    set('v35-profit-floor-result',metrics.margin!=null?percent(metrics.margin)+' margin · '+cash(metrics.profitPerMile)+'/mi':'—');
    set('v35-hourly-result',metrics.profitPerHour!=null?cash(metrics.profitPerHour)+'/hr':'No hourly floor configured');
  }

  function renderOfficialGate(){
    const test=$('test');if(!test)return;
    let panel=$('v35-official-gate');
    if(!panel){
      panel=document.createElement('div');panel.id='v35-official-gate';panel.className='panel';panel.style.marginTop='14px';
      panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Blueprint-aligned gate</div><h2>V3.5 Accurate Proposed Load</h2><p class="subtle" style="margin-top:5px">Passes only when the latest immutable estimate proves every V3.5 build requirement.</p></div><span class="tag orange" id="v35-official-status">PENDING</span></div><div id="v35-official-checks"></div>';
      test.appendChild(panel);
    }
    const snapshots=readSnapshots(),last=snapshots.at(-1);
    const checks={
      'Loaded + all deadhead miles':Boolean(last&&Number.isFinite(last.inputs?.loadedMiles)&&Number.isFinite(last.inputs?.deadheadToPickup)&&Number.isFinite(last.inputs?.returnDeadhead)),
      'Loaded/empty or blended MPG':Boolean(last&&last.inputs?.mpgMode&&Number.isFinite(last.metrics?.fuelGallons)),
      'Fuel price per gallon':Boolean(last&&Number.isFinite(last.inputs?.fuelPrice)&&last.inputs.fuelPrice>0),
      'Configurable costs + reserves':Boolean(last&&last.costs&&Number.isFinite(last.metrics?.totalCost)),
      'Walk-away + target + ask + counteroffer':Boolean(last&&['walkaway','target','ask','counteroffer'].every(k=>Number.isFinite(last.metrics?.[k]))),
      'Decision with reasons':Boolean(last&&last.decision&&Array.isArray(last.reasons)&&last.reasons.length),
      'Immutable estimate snapshot':Boolean(last&&last.snapshotId&&snapshots.length>0)
    };
    const box=$('v35-official-checks');box.innerHTML='';Object.entries(checks).forEach(([label,pass])=>{const row=document.createElement('div');row.className='metric-row';const text=document.createElement('span');text.textContent=label;const tag=document.createElement('span');tag.className='tag '+(pass?'':'gray');tag.textContent=pass?'PASS':'PENDING';row.append(text,tag);box.appendChild(row)});
    const pass=Object.values(checks).every(Boolean),status=$('v35-official-status');status.textContent=pass?'PASS':'PENDING';status.className='tag '+(pass?'':'orange');
    const legacy=$('v35-gate-status');if(legacy){legacy.textContent=pass?'PASS':'V3.5 COMPLETION PENDING';legacy.className='tag '+(pass?'':'orange')}
    updateSnapshotCount();
  }

  function handleSubmit(event){
    event.preventDefault();event.stopImmediatePropagation();
    const classification=readClassification();
    const loaded=requiredNumber('v35-loaded-miles'),deadheadToPickup=requiredNumber('v35-deadhead-miles'),returnDeadhead=number('v35-return-deadhead'),offer=requiredNumber('v35-offer'),cargoWeight=requiredNumber('v35-cargo-weight'),fuelPrice=requiredNumber('v35-fuel-price');
    const mpgMode=value('v35-mpg-mode')||'blended',blendedMpg=requiredNumber('v35-mpg'),loadedMpg=requiredNumber('v35-loaded-mpg'),emptyMpg=requiredNumber('v35-empty-mpg');
    const missing=!classification?.primaryOperation||!classification?.driverClass||!classification?.vehicleConfig||[loaded,deadheadToPickup,offer,cargoWeight,fuelPrice].some(v=>v===null||!Number.isFinite(v))||(mpgMode==='blended'&&(!Number.isFinite(blendedMpg)||blendedMpg<=0))||(mpgMode==='separate'&&(!Number.isFinite(loadedMpg)||loadedMpg<=0||!Number.isFinite(emptyMpg)||emptyMpg<=0));
    if(missing){renderDecision('MORE INFORMATION REQUIRED',['Complete and save the company, driver, and equipment classification.','Enter loaded miles, deadhead miles, offer, cargo weight, fuel price, and a valid MPG method.'],{});renderOfficialGate();return}

    const emptyMiles=deadheadToPickup+returnDeadhead,totalMiles=loaded+emptyMiles;
    const fuelGallons=mpgMode==='separate'?(loaded/loadedMpg+emptyMiles/emptyMpg):(totalMiles/blendedMpg),fuel=fuelGallons*fuelPrice;
    const accessorials=number('v35-tarping')+number('v35-detention')+number('v35-other-accessorials'),totalRevenue=offer+accessorials;
    const mileageCosts=totalMiles*(number('v35-maintenance')+number('v35-tires')+number('v35-fixed-cpm'));
    const dispatcher=totalRevenue*number('v35-dispatch-percent')/100,factoring=totalRevenue*number('v35-factoring-percent')/100;
    const flatCosts={tolls:number('v35-tolls'),driverPay:number('v35-driver-pay'),parking:number('v35-parking'),permits:number('v35-permits'),lodging:number('v35-lodging'),meals:number('v35-meals'),scales:number('v35-scales'),washout:number('v35-washout'),loading:number('v35-loading-cost'),securement:number('v35-securement-cost'),insuranceAllocation:number('v35-insurance-allocation'),other:number('v35-other-costs')};
    const additionalFlat=Object.values(flatCosts).reduce((sum,v)=>sum+v,0),totalCost=fuel+mileageCosts+dispatcher+factoring+additionalFlat,walkaway=totalCost;
    const targetProfit=number('v35-target-profit'),targetMargin=Math.min(.95,number('v35-target-margin')/100),profitMileFloor=number('v35-profit-mile-floor'),tripHours=number('v35-trip-hours'),hourlyFloor=number('v35-hourly-floor');
    const targets=[totalCost+targetProfit];if(targetMargin>0)targets.push(totalCost/(1-targetMargin));if(profitMileFloor>0)targets.push(totalCost+profitMileFloor*totalMiles);if(hourlyFloor>0&&tripHours>0)targets.push(totalCost+hourlyFloor*tripHours);
    const target=Math.max(...targets),negotiation=Math.max(0,number('v35-negotiation-percent'))/100,ask=target*(1+negotiation),counteroffer=Math.max(0,target-totalRevenue),counterofferRate=totalMiles?target/totalMiles:null;

    const verifiedRatings=[classification.truck_gvwr,classification.trailer_gvwr,classification.truck_empty,classification.trailer_empty,classification.gcwr].every(v=>Number.isFinite(v)&&v>0);
    const baseMetrics={totalMiles,cpm:totalMiles?totalCost/totalMiles:null,rpm:totalMiles?totalRevenue/totalMiles:null,profit:totalRevenue-totalCost,walkaway,target,ask,counteroffer,counterofferRate,fuelGallons,totalCost};
    if(classification.equipmentStatus!=='active'||!verifiedRatings){renderDecision('MORE INFORMATION REQUIRED',['The saved equipment record is planned or has unverified weight ratings.','Verify truck GVWR, trailer GVWR, truck/trailer empty weights, and manufacturer GCWR before final dispatch evaluation.'],baseMetrics);renderOfficialGate();return}

    const actualCombination=classification.truck_empty+classification.trailer_empty+cargoWeight,combinationRating=classification.truck_gvwr+classification.trailer_gvwr,legalCapacity=Math.min(combinationRating,classification.gcwr),payload=Math.max(0,legalCapacity-classification.truck_empty-classification.trailer_empty),hard=[];
    if(classification.driverClass==='Non-CDL Driver'&&combinationRating>=26001)hard.push('The '+combinationRating.toLocaleString()+' lb combined GVWR requires a CDL evaluation; Non-CDL cannot be dispatched.');
    if(actualCombination>classification.gcwr)hard.push('Estimated combination weight exceeds the manufacturer GCWR.');
    if(actualCombination>combinationRating)hard.push('Estimated combination weight exceeds the truck-plus-trailer GVWR limit.');
    if(!classification.insuranceOk)hard.push('Insurance or cargo coverage is missing, expired, inadequate, or unverified.');
    if(!classification.authorityOk)hard.push('Operating authority or service area is not verified.');
    if(!classification.driverOk)hard.push('Driver license, restriction, endorsement, expiration, or qualification check failed.');
    if(!classification.equipmentOk)hard.push('Truck, trailer, hitch, tire, brake, ramp, winch, or securement condition failed.');

    const profit=totalRevenue-totalCost,margin=totalRevenue?profit/totalRevenue:null,profitPerMile=totalMiles?profit/totalMiles:null,profitPerHour=tripHours>0?profit/tripHours:null,metrics={...baseMetrics,payload,margin,profitPerMile,profitPerHour};
    const reasons=['Total business miles: '+loaded.toLocaleString()+' loaded + '+deadheadToPickup.toLocaleString()+' pickup deadhead + '+returnDeadhead.toLocaleString()+' reposition/return deadhead.','Fuel estimate: '+fuelGallons.toFixed(2)+' gal · '+cash(fuel)+' at '+cash(fuelPrice)+'/gal using '+(mpgMode==='separate'?'loaded/empty MPG':'blended MPG')+'.','Estimated total cost: '+cash(totalCost)+'. Walk-away: '+cash(walkaway)+'.','Configured target: '+cash(target)+'. Recommended ask: '+cash(ask)+'.','Accessorial revenue included: '+cash(accessorials)+'.'];
    let decision;if(hard.length){decision='DO NOT DISPATCH';reasons.push(...hard)}else if(totalRevenue>=target){decision='ACCEPT LOAD';reasons.push('Offer satisfies all configured profit floors.')}else if(totalRevenue>=walkaway){decision='NEGOTIATE RATE';reasons.push('Counteroffer requires '+cash(counteroffer)+' additional revenue; target rate is '+cash(counterofferRate)+' per total mile.')}else{decision='PASS ON LOAD';reasons.push('Offer is '+cash(walkaway-totalRevenue)+' below walk-away.')}

    const snapshot={snapshotId:'EST-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),version:'V3.5',createdAt:new Date().toISOString(),decision,reasons:[...reasons],classification:{...classification},inputs:{loadedMiles:loaded,deadheadToPickup,returnDeadhead,offer,cargoWeight,fuelPrice,mpgMode,blendedMpg,loadedMpg,emptyMpg,accessorialRevenue:accessorials,targetProfit,targetMargin,profitMileFloor,tripHours,hourlyFloor,negotiationAllowance:negotiation},costs:{fuel,mileageCosts,dispatcher,factoring,...flatCosts},metrics:{...metrics}};
    const count=saveSnapshot(snapshot);localStorage.setItem('flt-v35-last-decision',JSON.stringify({decision,reasons,metrics,at:snapshot.createdAt,snapshotId:snapshot.snapshotId}));
    renderDecision(decision,reasons,metrics);updateSnapshotCount();renderOfficialGate();
    if(typeof toast==='function')toast('V3.5 estimate snapshot saved · '+count+' total.');
  }

  form.addEventListener('submit',handleSubmit,true);
  $('v35-mpg-mode')?.addEventListener('change',()=>{const separate=value('v35-mpg-mode')==='separate';$('v35-loaded-mpg').disabled=!separate;$('v35-empty-mpg').disabled=!separate;if($('v35-mpg'))$('v35-mpg').disabled=separate});
  $('v35-mpg-mode')?.dispatchEvent(new Event('change'));
  document.querySelectorAll('[data-view="test"],[data-view-jump="test"]').forEach(button=>button.addEventListener('click',()=>setTimeout(renderOfficialGate,0)));
  updateSnapshotCount();renderOfficialGate();
})();