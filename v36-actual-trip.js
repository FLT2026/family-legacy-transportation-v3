(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const cash=value=>Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const number=value=>{if(value===null||value===undefined||String(value).trim()==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const records=load=>Array.isArray(load.actualTripRecords)?load.actualTripRecords:[];
  const latest=load=>records(load).at(-1)||null;
  const ledgerTotal=load=>(load.expenses||[]).reduce((sum,item)=>sum+Number(item.amount||0),0);
  const tollTotal=load=>(load.expenses||[]).filter(item=>/toll/i.test(String(item.category))).reduce((sum,item)=>sum+Number(item.amount||0),0);
  const receiptCount=load=>(load.expenses||[]).filter(item=>item.receipt).length;
  const estimateFor=load=>{
    let snapshots=[];
    try{const parsed=JSON.parse(localStorage.getItem('flt-v35-estimate-snapshots')||'[]');snapshots=Array.isArray(parsed)?parsed:[]}catch(error){}
    const snapshot=[...snapshots].reverse().find(item=>item.loadId===load.id)||(/^(DEMO|TEST)/i.test(String(load.id||''))?snapshots.at(-1):null);
    const explicit=[load.estimatedOperatingCosts,load.estimatedExpenses,load.estimatedCost].find(value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)));
    return{
      cost:explicit!==undefined?Number(explicit):(Number.isFinite(Number(snapshot?.metrics?.totalCost))?Number(snapshot.metrics.totalCost):null),
      miles:Number.isFinite(Number(snapshot?.metrics?.totalMiles))?Number(snapshot.metrics.totalMiles):number(load.totalMiles??load.mileage),
      gallons:Number.isFinite(Number(snapshot?.metrics?.fuelGallons))?Number(snapshot.metrics.fuelGallons):number(load.estimatedFuelGallons),
      fuelPrice:Number.isFinite(Number(snapshot?.inputs?.fuelPrice))?Number(snapshot.inputs.fuelPrice):number(load.fuelPricePerGallon)
    };
  };
  const assignedTruck=load=>{
    try{
      const fleet=JSON.parse(localStorage.getItem('flt-v35-fleet')||'{}'),locks=Array.isArray(fleet.locks)?fleet.locks:[];
      return [...locks].reverse().find(lock=>lock.loadId===load.id)||null;
    }catch(error){return null}
  };

  const finance=$('finance');
  if(!finance)return;
  const anchor=finance.querySelector('.grid.two');
  const panel=document.createElement('div');
  panel.id='v36-actual-trip';panel.className='panel';panel.style.cssText='margin-bottom:14px;position:relative;z-index:2';
  panel.innerHTML=`
    <div class="section-head"><div><div class="eyebrow">V3.6 · Actual Trip Cost</div><h2>Close the trip with actual operating facts</h2><p class="subtle" style="margin-top:5px">Save an immutable mileage and fuel snapshot. Tolls, other expenses, and receipt evidence come from this load's ledger.</p></div><span class="tag orange" id="v36-record-status">NOT RECORDED</span></div>
    <form id="v36-actual-form" class="form-grid">
      <div class="field"><label for="v36-odometer-start">Odometer start</label><input id="v36-odometer-start" name="odometerStart" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Optional"></div>
      <div class="field"><label for="v36-odometer-end">Odometer end</label><input id="v36-odometer-end" name="odometerEnd" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Optional"></div>
      <div class="field"><label for="v36-actual-miles-input">Actual total business miles</label><input id="v36-actual-miles-input" name="actualMiles" type="number" min="0.1" step="0.1" inputmode="decimal" required></div>
      <div class="field"><label for="v36-actual-gallons-input">Actual fuel gallons</label><input id="v36-actual-gallons-input" name="actualGallons" type="number" min="0.01" step="0.01" inputmode="decimal" required></div>
      <div class="field"><label for="v36-average-fuel-price-input">Average fuel price / gallon</label><input id="v36-average-fuel-price-input" name="averageFuelPrice" type="number" min="0.001" step="0.001" inputmode="decimal" required></div>
      <div class="field"><label for="v36-fuel-cost-input">Fuel receipt total</label><input id="v36-fuel-cost-input" name="fuelCost" type="number" min="0" step="0.01" inputmode="decimal" required></div>
      <div class="field full"><label for="v36-trip-note-input">Trip close note</label><input id="v36-trip-note-input" name="note" maxlength="240" placeholder="Route changes, idle time, fuel variance, or exceptions"></div>
      <div class="form-actions field full"><button class="btn" id="v36-use-estimate" type="button">Use Approved Estimate</button><button class="btn primary">Save Actual Trip Snapshot</button></div>
    </form>
    <div class="grid three" style="margin-top:14px">
      <div class="panel stat"><span class="label">Actual MPG</span><div class="value" id="v36-actual-mpg">—</div><span class="subtle" id="v36-truck-label">No assigned truck</span></div>
      <div class="panel stat"><span class="label">Cost variance</span><div class="value" id="v36-cost-variance">—</div><span class="subtle" id="v36-cost-detail">Save a V3.5 estimate first</span></div>
      <div class="panel stat"><span class="label">Mileage variance</span><div class="value" id="v36-mile-variance">—</div><span class="subtle" id="v36-mile-detail">Estimated versus actual</span></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="panel"><div class="section-head"><h3>Actual cost evidence</h3><span class="tag gray" id="v36-evidence-status">INCOMPLETE</span></div><div id="v36-evidence"></div></div>
      <div class="panel"><div class="section-head"><h3>Vehicle MPG history</h3><span class="tag gray" id="v36-history-count">0 trips</span></div><div id="v36-mpg-history" class="empty">No actual trip snapshots recorded.</div></div>
    </div>`;
  anchor.parentNode.insertBefore(panel,anchor);

  const test=$('test'),gate=document.createElement('div');
  gate.id='v36-gate';gate.className='panel';gate.style.marginTop='14px';
  gate.innerHTML='<div class="section-head"><div><div class="eyebrow">Blueprint-aligned gate</div><h2>V3.6 Actual Trip Cost</h2><p class="subtle" style="margin-top:5px">Validates actual mileage, fuel, expense evidence, variance, and vehicle efficiency history for the selected load.</p></div><span class="tag orange" id="v36-gate-status">PENDING</span></div><div id="v36-gate-checks"></div>';
  test.appendChild(gate);

  function allVehicleRecords(truckId){
    return store.loads.flatMap(load=>records(load).map(record=>({...record,loadId:load.id}))).filter(record=>truckId?record.truckId===truckId:true).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  function setVariance(id,value,kind){
    const el=$(id);el.textContent=value;el.style.color=kind==='bad'?'var(--red)':kind==='good'?'var(--green)':'var(--ink)';
  }
  function fillApprovedEstimate(notify=true){
    const form=$('v36-actual-form'),load=current(),estimate=estimateFor(load);
    if(!(estimate.miles>0&&estimate.gallons>0&&estimate.fuelPrice>0)){if(notify)toast('The approved estimate is missing miles, gallons, or fuel price.');return false}
    form.elements.actualMiles.value=estimate.miles.toFixed(1);
    form.elements.actualGallons.value=estimate.gallons.toFixed(2);
    form.elements.averageFuelPrice.value=estimate.fuelPrice.toFixed(3);
    form.elements.fuelCost.value=(estimate.gallons*estimate.fuelPrice).toFixed(2);
    if(!form.elements.note.value)form.elements.note.value='Actual trip matched approved estimate.';
    if(notify){form.elements.actualMiles.focus();toast('Approved estimate copied. Review the actual values before saving.');}
    return true;
  }
  function render(){
    const load=current(),record=latest(load),estimate=estimateFor(load),actualCost=ledgerTotal(load),assignment=assignedTruck(load),truckId=record?.truckId||assignment?.truckId||null,history=allVehicleRecords(truckId);
    $('v36-record-status').textContent=record?'SNAPSHOT SAVED':'NOT RECORDED';$('v36-record-status').className='tag '+(record?'':'orange');
    $('v36-actual-mpg').textContent=record?record.actualMpg.toFixed(2):'—';
    $('v36-truck-label').textContent=record?.truckUnit||assignment?.truckUnit||'No assigned truck';
    if(record&&estimate.cost!==null){const variance=actualCost-estimate.cost;setVariance('v36-cost-variance',(variance>0?'+':'')+cash(variance),variance>0?'bad':'good');$('v36-cost-detail').textContent=cash(estimate.cost)+' estimated · '+cash(actualCost)+' ledger actual'}else{setVariance('v36-cost-variance','—','');$('v36-cost-detail').textContent=record?'No saved V3.5 cost estimate':'Record the actual trip'}
    if(record&&estimate.miles!==null){const variance=record.actualMiles-estimate.miles;setVariance('v36-mile-variance',(variance>0?'+':'')+variance.toFixed(1)+' mi',variance>0?'bad':'good');$('v36-mile-detail').textContent=estimate.miles.toFixed(1)+' estimated · '+record.actualMiles.toFixed(1)+' actual'}else{setVariance('v36-mile-variance','—','');$('v36-mile-detail').textContent='Estimated versus actual'}
    const evidence=[['Actual mileage',Boolean(record?.actualMiles)],['Gallons and average price',Boolean(record?.actualGallons&&record?.averageFuelPrice)],['Fuel receipt total',Boolean(record&&Number.isFinite(record.fuelCost))],['Dispatched truck linked',Boolean(record?.truckId)],['Tolls recorded in ledger',tollTotal(load)>0],['Expense ledger',actualCost>0],['Receipt attached',receiptCount(load)>0]];
    $('v36-evidence').innerHTML=evidence.map(([label,pass])=>'<div class="metric-row"><span>'+label+'</span><span class="tag '+(pass?'':'gray')+'">'+(pass?'RECORDED':'PENDING')+'</span></div>').join('');
    const evidencePass=evidence.every(item=>item[1]);$('v36-evidence-status').textContent=evidencePass?'COMPLETE':'INCOMPLETE';$('v36-evidence-status').className='tag '+(evidencePass?'':'gray');
    $('v36-history-count').textContent=history.length+' trip'+(history.length===1?'':'s');
    $('v36-mpg-history').className=history.length?'':'empty';$('v36-mpg-history').innerHTML=history.length?history.slice(0,8).map(item=>'<div class="metric-row"><span><strong>'+esc(item.loadId)+'</strong><br><small class="subtle">'+new Date(item.createdAt).toLocaleDateString()+' · '+esc(item.truckUnit||'Unassigned truck')+'</small></span><strong>'+item.actualMpg.toFixed(2)+' MPG</strong></div>').join(''):'No actual trip snapshots recorded.';
    const form=$('v36-actual-form'),required=['actualMiles','actualGallons','averageFuelPrice','fuelCost'];
    if(!record&&required.every(name=>String(form.elements[name].value).trim()===''))fillApprovedEstimate(false);
    renderGate();
  }
  function renderGate(){
    const load=current(),record=latest(load),estimate=estimateFor(load),actualCost=ledgerTotal(load),checks={
      'Actual mileage recorded':Boolean(record?.actualMiles),
      'Actual gallons and fuel price recorded':Boolean(record?.actualGallons&&record?.averageFuelPrice),
      'Receipt evidence attached':receiptCount(load)>0,
      'Tolls and operating expenses recorded':tollTotal(load)>0&&actualCost>0,
      'Estimated-versus-actual variance available':Boolean(record&&estimate.cost!==null&&estimate.miles!==null),
      'Vehicle MPG history created':Boolean(record?.truckId&&Number.isFinite(record.actualMpg))
    };
    $('v36-gate-checks').innerHTML=Object.entries(checks).map(([label,pass])=>'<div class="metric-row"><span>'+label+'</span><span class="tag '+(pass?'':'gray')+'">'+(pass?'PASS':'PENDING')+'</span></div>').join('');
    const pass=Object.values(checks).every(Boolean);$('v36-gate-status').textContent=pass?'PASS':'PENDING';$('v36-gate-status').className='tag '+(pass?'':'orange');
  }
  $('v36-actual-form').addEventListener('input',event=>{
    const form=event.currentTarget,gallons=number(form.elements.actualGallons.value),price=number(form.elements.averageFuelPrice.value);
    if(event.target.name!=='fuelCost'&&gallons!==null&&price!==null)form.elements.fuelCost.value=(gallons*price).toFixed(2);
  });
  $('v36-use-estimate').addEventListener('click',()=>fillApprovedEstimate(true));
  $('v36-actual-form').addEventListener('submit',event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),start=number(data.get('odometerStart')),end=number(data.get('odometerEnd')),actualMiles=number(data.get('actualMiles')),actualGallons=number(data.get('actualGallons')),averageFuelPrice=number(data.get('averageFuelPrice')),fuelCost=number(data.get('fuelCost'));
    if(!(actualMiles>0&&actualGallons>0&&averageFuelPrice>0&&fuelCost>=0)){toast('Enter valid actual miles, gallons, fuel price, and fuel receipt total.');return}
    if((start===null)!==(end===null)){toast('Enter both odometer readings or leave both blank.');return}
    if(start!==null&&end<=start){toast('Odometer end must be greater than odometer start.');return}
    if(start!==null&&Math.abs((end-start)-actualMiles)>1){toast('Actual miles must be within 1 mile of the odometer difference.');return}
    const load=current(),assignment=assignedTruck(load),record={snapshotId:'ACT-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),version:'V3.6',createdAt:new Date().toISOString(),loadId:load.id,odometerStart:start,odometerEnd:end,actualMiles,actualGallons,averageFuelPrice,fuelCost,actualMpg:actualMiles/actualGallons,truckId:assignment?.truckId||null,truckUnit:assignment?.truckUnit||null,tollsAtSnapshot:tollTotal(load),ledgerCostAtSnapshot:ledgerTotal(load),receiptCountAtSnapshot:receiptCount(load),note:String(data.get('note')||'').trim()};
    load.actualTripRecords=records(load);load.actualTripRecords.push(record);load.actualMiles=actualMiles;load.actualFuelGallons=actualGallons;load.actualFuelPrice=averageFuelPrice;load.actualMpg=record.actualMpg;persist();toast('V3.6 actual trip snapshot saved.');renderFinance();form.reset();
  });

  const priorFinance=renderFinance;renderFinance=()=>{priorFinance();render()};
  const priorGate=renderGate;
  document.querySelectorAll('[data-view="test"],[data-view-jump="test"]').forEach(button=>button.addEventListener('click',()=>setTimeout(priorGate,0)));
  document.title='Family Legacy Commercial Command™ V3.6';
  const header=document.querySelector('header .eyebrow');if(header)header.textContent='Family Legacy Commercial Command™ / V3.6';
  const footer=$('clock')?.parentElement;if(footer)footer.childNodes[0].textContent='V3.6 COMMERCIAL COMMAND · ';
  const testTitle=document.querySelector('#test > .panel > .section-head h2');if(testTitle)testTitle.textContent='V3.6 Test Gate';
  const testNav=document.querySelector('[data-view="test"] .nav-label');if(testNav)testNav.textContent='V3.6 Test Gate';
  render();
})();
