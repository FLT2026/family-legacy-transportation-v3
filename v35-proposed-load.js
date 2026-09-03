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
  const requiredCostKeys=['fuel','mileageCosts','baseCost','dispatchRate','factoringRate','feeRate','dispatcher','factoring','tolls','driverPay','parking','permits','lodging','meals','scales','washout','loading','securement','insuranceAllocation','other'];

  const fields=document.createElement('div');
  fields.id='v35-completion-fields';
  fields.className='field full';
  fields.innerHTML=`<div class="panel" style="margin-top:10px">
    <div class="section-head"><div><div class="eyebrow">V3.5 completion pass</div><h2>Complete Proposed-Load Economics</h2><p class="subtle" style="margin-top:5px">Pricing can be evaluated before dispatch qualification is complete. Missing driver/equipment data blocks dispatch, not the economic estimate.</p></div></div>
    <div class="form-grid">
      <div class="field"><label>Repositioning / Return Deadhead Miles</label><input id="v35-return-deadhead" type="number" min="0" step="0.1" value="0"></div>
      <div class="field"><label>MPG Calculation Mode</label><select id="v35-mpg-mode"><option value="blended">Blended MPG</option><option value="separate">Separate Loaded / Empty MPG</option></select></div>
      <div class="field"><label>Loaded MPG</label><input id="v35-loaded-mpg" type="number" min="0.1" step="0.1" placeholder="Used in separate mode"></div>
      <div class="field"><label>Empty MPG</label><input id="v35-empty-mpg" type="number" min="0.1" step="0.1" placeholder="Used in separate mode"></div>
      <details id="v35-advanced-economics" class="field full advanced-economics"><summary>Advanced trip costs & profit controls <span>Optional</span></summary><p class="subtle">Open this section when the load has extra expenses, percentage fees, hourly requirements, or custom profit floors.</p><div class="form-grid" style="margin-top:12px"><div class="subhead"><h3>Additional trip costs</h3></div>
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
      <div class="field"><label>Factoring / Payment Fee (%)</label><input id="v35-factoring-percent" type="number" min="0" max="99" step="0.01" value="0"></div>
      <div class="subhead"><h3>Required profit floors</h3></div>
      <div class="field"><label>Minimum Required Profit ($)</label><input id="v35-min-profit" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Target Margin (%)</label><input id="v35-target-margin" type="number" min="0" max="95" step="0.1" value="0"></div>
      <div class="field"><label>Minimum Profit / Total Mile ($)</label><input id="v35-profit-mile-floor" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Expected Trip Hours</label><input id="v35-trip-hours" type="number" min="0" step="0.25" value="0"></div>
      <div class="field"><label>Minimum Profit / Hour ($)</label><input id="v35-hourly-floor" type="number" min="0" step="0.01" value="0"></div>
      <div class="field"><label>Negotiation Allowance (%)</label><input id="v35-negotiation-percent" type="number" min="0" step="0.1" value="5"></div></div></details>
    </div>
    <div class="grid three" style="margin-top:14px">
      <div class="panel"><div class="eyebrow">Minimum acceptable</div><h3 id="v35-minimum-acceptable">—</h3><p class="subtle">Walk-away plus minimum required profit</p></div>
      <div class="panel"><div class="eyebrow">Additional needed</div><h3 id="v35-counteroffer">—</h3><p class="subtle" id="v35-counteroffer-rate">—</p></div>
      <div class="panel"><div class="eyebrow">Estimate history</div><h3 id="v35-snapshot-count">0 snapshots</h3><p class="subtle">Append-only browser prototype history</p></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="panel"><div class="eyebrow">Profit floors</div><h3 id="v35-profit-floor-result">—</h3></div>
      <div class="panel"><div class="eyebrow">Hourly result</div><h3 id="v35-hourly-result">—</h3></div>
    </div>
  </div>`;
  const actions=form.querySelector('.form-actions');
  if(actions)form.insertBefore(fields,actions);else form.appendChild(fields);
  const selection=document.createElement('div');selection.id='v35-master-selection';selection.className='panel';selection.style.marginBottom='14px';
  selection.innerHTML='<div class="section-head"><div><div class="eyebrow">Reusable master records</div><h2>Driver & Equipment for This Estimate</h2><p class="subtle" style="margin-top:5px">Your saved default combination is selected automatically. Change it only when another driver, truck, or trailer will handle this load.</p></div><span class="tag" id="v35-selection-status">CHECK RECORDS</span></div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Driver</label><select id="v35-estimate-driver"></select></div><div class="field"><label>Truck</label><select id="v35-estimate-truck"></select></div><div class="field"><label>Trailer</label><select id="v35-estimate-trailer"></select></div></div>';
  form.insertBefore(selection,form.firstElementChild);

  function readClassification(){try{return JSON.parse(localStorage.getItem(classKey)||'null')}catch(error){return null}}
  function readFleet(){try{return {...{drivers:[],trucks:[],trailers:[]},...JSON.parse(localStorage.getItem('flt-v35-fleet')||'{}')}}catch(error){return{drivers:[],trucks:[],trailers:[]}}}
  function driverReady(x){
    if(x?.status!=='active'||!x.licenseState||!x.expiration)return false;
    const expiration=new Date(x.expiration+'T23:59:59');
    return !Number.isNaN(expiration.getTime())&&expiration>=new Date();
  }
  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const validScaleDate=value=>{const date=new Date(String(value||'')+'T23:59:59');return Number.isFinite(date.getTime())&&date<=new Date()};
  function truckReady(x){return Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&validScaleDate(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.gcwr)>0&&Number(x.emptyWeight)>0&&Number(x.frontGawr)>0&&Number(x.rearGawr)>0&&Number(x.frontTireCapacity)>=Number(x.frontGawr)&&Number(x.rearTireCapacity)>=Number(x.rearGawr)&&Number(x.hitchCapacity)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.gvwr)<=Number(x.gcwr))}
  function trailerReady(x){return Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&validScaleDate(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.emptyWeight)>0&&Number(x.axleCapacity)>0&&Number(x.tireCapacity)>0&&Number(x.hitchCapacity)>0&&Number(x.emptyWeight)<Number(x.gvwr))}
  const selectionKey='flt-v35-default-fleet-selection';
  function readSelection(){try{return JSON.parse(localStorage.getItem(selectionKey)||'{}')}catch(error){return{}}}
  function saveSelection(){
    const selected={driverId:$('v35-estimate-driver')?.value||'',truckId:$('v35-estimate-truck')?.value||'',trailerId:$('v35-estimate-trailer')?.value||''};
    localStorage.setItem(selectionKey,JSON.stringify(selected));updateSelectionStatus();
  }
  function optionLabel(record,ready){return (record.name||record.unit||'Unnamed')+' · '+(ready?'VERIFIED':(record.status==='active'?'INCOMPLETE':'PLANNED'))}
  function populateFleetSelection(){
    const fleet=readFleet(),saved=readSelection(),pairs=[['driver',fleet.drivers||[],driverReady],['truck',fleet.trucks||[],truckReady],['trailer',fleet.trailers||[],trailerReady]];
    pairs.forEach(([kind,items,ready])=>{
      const select=$('v35-estimate-'+kind);if(!select)return;
      select.innerHTML='<option value="">Select '+kind+'</option>'+items.map(item=>'<option value="'+String(item.id).replaceAll('"','&quot;')+'">'+optionLabel(item,ready(item))+'</option>').join('');
      const savedId=saved[kind+'Id'],fallback=items.find(ready)?.id||items.at(-1)?.id||'';
      select.value=items.some(item=>item.id===savedId)?savedId:fallback;
    });
    saveSelection();
  }
  function fleetReadiness(){
    const fleet=readFleet(),saved=readSelection();
    const driver=fleet.drivers?.find(x=>x.id===($('v35-estimate-driver')?.value||saved.driverId)),truck=fleet.trucks?.find(x=>x.id===($('v35-estimate-truck')?.value||saved.truckId)),trailer=fleet.trailers?.find(x=>x.id===($('v35-estimate-trailer')?.value||saved.trailerId));
    const missing=[];if(!driverReady(driver))missing.push('Select a current Active / Verified driver record.');if(!truckReady(truck))missing.push('Select an Active / Verified truck with complete VIN, GVWR, GCWR, GAWR, tire, hitch, scale-weight, and verification-date records.');if(!trailerReady(trailer))missing.push('Select an Active / Verified trailer with complete VIN, GVWR, axle, tire, hitch, scale-weight, and verification-date records.');
    return{ready:Boolean(driverReady(driver)&&truckReady(truck)&&trailerReady(trailer)),driver,truck,trailer,missing};
  }
  function updateSelectionStatus(){
    const status=$('v35-selection-status'),fleet=fleetReadiness();if(!status)return;
    status.textContent=fleet.ready?'VERIFIED COMBINATION':'MORE INFORMATION REQUIRED';status.className='tag '+(fleet.ready?'':'orange');
  }
  ['driver','truck','trailer'].forEach(kind=>$('v35-estimate-'+kind)?.addEventListener('change',saveSelection));
  populateFleetSelection();

  function readSnapshots(){try{const x=JSON.parse(localStorage.getItem(snapshotKey)||'[]');return Array.isArray(x)?x:[]}catch(error){return[]}}
  function saveSnapshot(snapshot){const list=readSnapshots();list.push({...snapshot});localStorage.setItem(snapshotKey,JSON.stringify(list));return list.length}
  function updateSnapshotCount(){const el=$('v35-snapshot-count');if(el)el.textContent=readSnapshots().length+' snapshots'}

  function renderDecision(decision,reasons,metrics={},economicDecision=null,dispatchStatus=''){
    const card=$('v35-decision-card');
    if(card)card.className='panel decision-card'+(decision==='DO NOT DISPATCH'?' block':(['NEGOTIATE RATE','PASS ON LOAD','MORE INFORMATION REQUIRED'].includes(decision)?' warn':''));
    if($('v35-decision'))$('v35-decision').textContent=decision;
    const summaries={
      'ACCEPT LOAD':'The rate is profitable and the required master driver and equipment records are verified.',
      'NEGOTIATE RATE':'The load is eligible for consideration, but the offered rate must be increased.',
      'PASS ON LOAD':'The offer is below the minimum acceptable price.',
      'MORE INFORMATION REQUIRED':economicDecision?'The rate has been calculated, but this is not a final acceptance. Complete the missing master-record verification shown below.':'Complete the highlighted load information to calculate profitability.',
      'DO NOT DISPATCH':'A non-negotiable driver, weight, insurance, authority, or equipment check failed.'
    };
    if($('v35-decision-summary'))$('v35-decision-summary').textContent=summaries[decision]||'';
    let profitability=$('v35-profitability-result');
    if(!profitability&&$('v35-decision-summary')){
      profitability=document.createElement('div');profitability.id='v35-profitability-result';
      $('v35-decision-summary').insertAdjacentElement('afterend',profitability);
    }
    if(profitability){
      profitability.hidden=!economicDecision;
      if(economicDecision){
        const profitLabel=economicDecision==='ACCEPT LOAD'?'PROFITABLE':(economicDecision==='NEGOTIATE RATE'?'NEGOTIATE':'UNPROFITABLE');
        const detail=economicDecision==='ACCEPT LOAD'?'The offer meets the configured profit target.':(economicDecision==='NEGOTIATE RATE'?'The offer covers the minimum but is below the target.':'The offer is below the minimum acceptable amount.');
        profitability.className='notice';
        profitability.innerHTML='<strong>Rate profitability: '+profitLabel+'</strong><br>'+detail;
      }
    }
    let readiness=$('v35-dispatch-readiness');
    if(!readiness&&profitability){
      readiness=document.createElement('div');readiness.id='v35-dispatch-readiness';
      profitability.insertAdjacentElement('afterend',readiness);
    }
    if(readiness){
      readiness.hidden=!economicDecision;
      if(economicDecision){
        readiness.className='notice'+(dispatchStatus==='BLOCKED'?' hard-stop':'');
        readiness.innerHTML='<strong>Final load decision: '+decision+'</strong><br>'+(dispatchStatus==='PENDING'?'Profitability alone does not authorize acceptance or dispatch. Complete the missing reusable driver, truck, trailer, rating, and compliance records.':(dispatchStatus==='BLOCKED'?'The rate result is shown above, but a non-negotiable safety or compliance failure blocks the load.':'The reusable master records and current checks support this final decision.'));
      }
    }
    const list=$('v35-decision-reasons');if(list){list.innerHTML='';reasons.forEach(reason=>{const li=document.createElement('li');li.textContent=reason;list.appendChild(li)})}
    const set=(id,text)=>{if($(id))$(id).textContent=text};
    set('v35-total-miles',metrics.totalMiles!=null?metrics.totalMiles.toLocaleString()+' mi':'—');
    set('v35-cpm',metrics.cpm!=null?cash(metrics.cpm)+' / mi':'—');
    set('v35-rpm',metrics.rpm!=null?cash(metrics.rpm)+' / mi':'—');
    set('v35-profit',metrics.profit!=null?cash(metrics.profit):'—');
    set('v35-walkaway',metrics.walkaway!=null?cash(metrics.walkaway):'—');
    set('v35-target',metrics.target!=null?cash(metrics.target):'—');
    set('v35-ask',metrics.ask!=null?cash(metrics.ask):'—');
    set('v35-payload',metrics.payload!=null?metrics.payload.toLocaleString()+' lb':'Unavailable — verify ratings');
    set('v35-minimum-acceptable',metrics.minimumAcceptable!=null?cash(metrics.minimumAcceptable):'—');
    set('v35-counteroffer',metrics.counteroffer!=null?cash(metrics.counteroffer):'—');
    set('v35-counteroffer-rate',metrics.counterofferRate!=null?(Number(metrics.counteroffer)===0?'No increase needed · ':'Additional revenue needed · ')+cash(metrics.counterofferRate)+' / total mile target':'—');
    set('v35-profit-floor-result',metrics.margin!=null?percent(metrics.margin)+' margin · '+cash(metrics.profitPerMile)+'/mi':'—');
    set('v35-hourly-result',metrics.profitPerHour!=null?cash(metrics.profitPerHour)+'/hr':'No hourly floor configured');
  }

  function renderOfficialGate(){
    const test=$('test');if(!test)return;
    let panel=$('v35-official-gate');
    if(!panel){
      panel=document.createElement('div');panel.id='v35-official-gate';panel.className='panel';panel.style.marginTop='14px';
      panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Blueprint-aligned gate</div><h2>V3.5 Accurate Proposed Load</h2><p class="subtle" style="margin-top:5px">This gate validates the proposed-load economic engine separately from V3.8 dispatch qualification.</p></div><span class="tag orange" id="v35-official-status">PENDING</span></div><div id="v35-official-checks"></div>';
      test.appendChild(panel);
    }
    const snapshots=readSnapshots(),last=snapshots.at(-1);
    const costsComplete=Boolean(last&&last.costs&&requiredCostKeys.every(k=>Number.isFinite(last.costs[k])));
    const allowedEconomicDecisions=['ACCEPT LOAD','NEGOTIATE RATE','PASS ON LOAD'];
    const checks={
      'Loaded + all deadhead miles':Boolean(last&&Number.isFinite(last.inputs?.loadedMiles)&&Number.isFinite(last.inputs?.deadheadToPickup)&&Number.isFinite(last.inputs?.returnDeadhead)),
      'Loaded/empty or blended MPG':Boolean(last&&last.inputs?.mpgMode&&Number.isFinite(last.metrics?.fuelGallons)),
      'Fuel price per gallon':Boolean(last&&Number.isFinite(last.inputs?.fuelPrice)&&last.inputs.fuelPrice>0),
      'Complete configurable costs + reserves':costsComplete,
      'Walk-away + minimum + target + ask + counteroffer':Boolean(last&&['walkaway','minimumAcceptable','target','ask','counteroffer'].every(k=>Number.isFinite(last.metrics?.[k]))),
      'ACCEPT / NEGOTIATE / DECLINE economic decision':Boolean(last&&allowedEconomicDecisions.includes(last.economicDecision)),
      'Decision with reasons':Boolean(last&&Array.isArray(last.reasons)&&last.reasons.length),
      'Saved estimate snapshot':Boolean(last&&last.snapshotId&&snapshots.length>0)
    };
    const box=$('v35-official-checks');if(!box)return;box.innerHTML='';
    Object.entries(checks).forEach(([label,pass])=>{const row=document.createElement('div');row.className='metric-row';const text=document.createElement('span');text.textContent=label;const tag=document.createElement('span');tag.className='tag '+(pass?'':'gray');tag.textContent=pass?'PASS':'PENDING';row.append(text,tag);box.appendChild(row)});
    const pass=Object.values(checks).every(Boolean),status=$('v35-official-status');
    if(status){status.textContent=pass?'PASS':'PENDING';status.className='tag '+(pass?'':'orange')}
    const legacy=$('v35-gate-status');if(legacy){legacy.textContent=pass?'PASS':'V3.5 COMPLETION PENDING';legacy.className='tag '+(pass?'':'orange')}
    updateSnapshotCount();
  }

  function handleSubmit(event){
    event.preventDefault();event.stopImmediatePropagation();
    const classification=readClassification();
    const loaded=requiredNumber('v35-loaded-miles'),deadheadToPickup=requiredNumber('v35-deadhead-miles'),returnDeadhead=number('v35-return-deadhead'),offer=requiredNumber('v35-offer'),cargoWeight=requiredNumber('v35-cargo-weight'),fuelPrice=requiredNumber('v35-fuel-price');
    const mpgMode=value('v35-mpg-mode')||'blended',blendedMpg=requiredNumber('v35-mpg'),loadedMpg=requiredNumber('v35-loaded-mpg'),emptyMpg=requiredNumber('v35-empty-mpg');
    const economicsMissing=[loaded,deadheadToPickup,offer,cargoWeight,fuelPrice].some(v=>v===null||!Number.isFinite(v))||(mpgMode==='blended'&&(!Number.isFinite(blendedMpg)||blendedMpg<=0))||(mpgMode==='separate'&&(!Number.isFinite(loadedMpg)||loadedMpg<=0||!Number.isFinite(emptyMpg)||emptyMpg<=0));
    if(economicsMissing){renderDecision('MORE INFORMATION REQUIRED',['Enter loaded miles, deadhead miles, offer, cargo weight, fuel price, and a valid MPG method.']);renderOfficialGate();return}

    const emptyMiles=deadheadToPickup+returnDeadhead,totalMiles=loaded+emptyMiles;
    const fuelGallons=mpgMode==='separate'?(loaded/loadedMpg+emptyMiles/emptyMpg):(totalMiles/blendedMpg),fuel=fuelGallons*fuelPrice;
    const accessorials=number('v35-tarping')+number('v35-detention')+number('v35-other-accessorials'),totalRevenue=offer+accessorials;
    const mileageCosts=totalMiles*(number('v35-maintenance')+number('v35-tires')+number('v35-fixed-cpm'));
    const dispatchRate=Math.max(0,number('v35-dispatch-percent'))/100,factoringRate=Math.max(0,number('v35-factoring-percent'))/100,feeRate=dispatchRate+factoringRate;
    const flatCosts={tolls:number('v35-tolls'),driverPay:number('v35-driver-pay'),parking:number('v35-parking'),permits:number('v35-permits'),lodging:number('v35-lodging'),meals:number('v35-meals'),scales:number('v35-scales'),washout:number('v35-washout'),loading:number('v35-loading-cost'),securement:number('v35-securement-cost'),insuranceAllocation:number('v35-insurance-allocation'),other:number('v35-other-costs')};
    const additionalFlat=Object.values(flatCosts).reduce((sum,v)=>sum+v,0),baseCost=fuel+mileageCosts+additionalFlat;
    if(feeRate>=1){renderDecision('MORE INFORMATION REQUIRED',['Dispatcher plus factoring/payment percentages must total less than 100%.']);renderOfficialGate();return}

    const dispatcher=totalRevenue*dispatchRate,factoring=totalRevenue*factoringRate,totalCost=baseCost+dispatcher+factoring,walkaway=baseCost/(1-feeRate);
    const minimumProfit=number('v35-min-profit'),minimumAcceptable=(baseCost+minimumProfit)/(1-feeRate);
    const targetProfit=number('v35-target-profit'),targetMargin=Math.min(.95,number('v35-target-margin')/100),profitMileFloor=number('v35-profit-mile-floor'),tripHours=number('v35-trip-hours'),hourlyFloor=number('v35-hourly-floor');
    if(targetMargin>0&&1-feeRate-targetMargin<=0){renderDecision('MORE INFORMATION REQUIRED',['The selected target margin is impossible with the configured percentage fees. Lower the target margin or percentage fees.']);renderOfficialGate();return}

    const targets=[minimumAcceptable,(baseCost+targetProfit)/(1-feeRate)];
    if(targetMargin>0)targets.push(baseCost/(1-feeRate-targetMargin));
    if(profitMileFloor>0)targets.push((baseCost+profitMileFloor*totalMiles)/(1-feeRate));
    if(hourlyFloor>0&&tripHours>0)targets.push((baseCost+hourlyFloor*tripHours)/(1-feeRate));
    const target=Math.max(...targets),negotiation=Math.max(0,number('v35-negotiation-percent'))/100,ask=target*(1+negotiation),counteroffer=Math.max(0,target-totalRevenue),counterofferRate=totalMiles?target/totalMiles:null;

    const profit=totalRevenue-totalCost,margin=totalRevenue?profit/totalRevenue:null,profitPerMile=totalMiles?profit/totalMiles:null,profitPerHour=tripHours>0?profit/tripHours:null;
    const baseMetrics={totalMiles,cpm:totalMiles?totalCost/totalMiles:null,rpm:totalMiles?totalRevenue/totalMiles:null,profit,walkaway,minimumAcceptable,target,ask,counteroffer,counterofferRate,fuelGallons,totalCost,margin,profitPerMile,profitPerHour};
    const reasons=['Economic decision can be calculated independently of dispatch qualification.','Total business miles: '+loaded.toLocaleString()+' loaded + '+deadheadToPickup.toLocaleString()+' pickup deadhead + '+returnDeadhead.toLocaleString()+' reposition/return deadhead.','Fuel estimate: '+fuelGallons.toFixed(2)+' gal · '+cash(fuel)+' at '+cash(fuelPrice)+'/gal using '+(mpgMode==='separate'?'loaded/empty MPG':'blended MPG')+'.','Base trip cost before percentage fees: '+cash(baseCost)+'. Walk-away: '+cash(walkaway)+'. Minimum acceptable: '+cash(minimumAcceptable)+'.','Configured target: '+cash(target)+'. Recommended ask: '+cash(ask)+'.','Accessorial revenue included: '+cash(accessorials)+'. Percentage fees: '+percent(feeRate)+'.'];
    let economicDecision;
    if(totalRevenue>=target){economicDecision='ACCEPT LOAD';reasons.push('Rate profitability: PROFITABLE — offer satisfies all configured profit floors.')}
    else if(totalRevenue>=minimumAcceptable){economicDecision='NEGOTIATE RATE';reasons.push('Rate profitability: NEGOTIATE — counteroffer requires '+cash(counteroffer)+' additional revenue; target rate is '+cash(counterofferRate)+' per total mile.')}
    else{economicDecision='PASS ON LOAD';reasons.push('Rate profitability: UNPROFITABLE — offer is '+cash(minimumAcceptable-totalRevenue)+' below minimum acceptable.')}

    let decision=economicDecision,dispatchStatus='QUALIFIED',payload=null,selectedFleet=null;
    const classificationCore=Boolean(classification?.primaryOperation&&classification?.companyRole&&classification?.operatingArea);
    const fleet=fleetReadiness(),pending=[];
    if(!classificationCore)pending.push('Company operation, role, and operating area must be saved in Business Setup.');
    if(!classification?.insuranceOk)pending.push('Insurance and cargo coverage are not verified.');
    if(!classification?.authorityOk)pending.push('Operating authority and service area are not verified.');
    if(!classification?.equipmentOk)pending.push('Current equipment safety has not been confirmed.');
    pending.push(...fleet.missing);
    if(pending.length){
      dispatchStatus='PENDING';decision='MORE INFORMATION REQUIRED';
      reasons.push('Final acceptance is withheld. The profitability result above is preliminary only.',...pending);
    }else{
      const driver=fleet.driver,truck=fleet.truck,trailer=fleet.trailer;
      selectedFleet={driverId:driver.id,driverName:driver.name,truckId:truck.id,truckUnit:truck.unit,trailerId:trailer.id,trailerUnit:trailer.unit};
      const actualCombination=Number(truck.emptyWeight)+Number(trailer.emptyWeight)+cargoWeight,combinationRating=Number(truck.gvwr)+Number(trailer.gvwr),legalCapacity=Math.min(combinationRating,Number(truck.gcwr)),hard=[];
      payload=Math.max(0,legalCapacity-Number(truck.emptyWeight)-Number(trailer.emptyWeight));
      if(driver.qualification==='Non-CDL Driver'&&combinationRating>=26001)hard.push('The '+combinationRating.toLocaleString()+' lb combined GVWR requires a CDL evaluation; the selected Non-CDL driver cannot be dispatched.');
      if(actualCombination>Number(truck.gcwr))hard.push('Estimated combination weight exceeds the selected truck manufacturer GCWR.');
      if(actualCombination>combinationRating)hard.push('Estimated combination weight exceeds the selected truck-plus-trailer GVWR limit.');
      const estimatedTrailerWeight=Number(trailer.emptyWeight)+cargoWeight;
      if(cargoWeight>payload)hard.push('Cargo weight exceeds the calculated remaining payload for the selected verified truck and trailer.');
      if(estimatedTrailerWeight>Number(trailer.axleCapacity))hard.push('Estimated loaded trailer weight exceeds the trailer combined axle rating.');
      if(estimatedTrailerWeight>Number(trailer.tireCapacity))hard.push('Estimated loaded trailer weight exceeds the trailer combined tire capacity.');
      if(estimatedTrailerWeight>Number(trailer.hitchCapacity))hard.push('Estimated loaded trailer weight exceeds the trailer hitch/coupler rating.');
      reasons.push('Reusable master records used: '+driver.name+' · '+truck.unit+' · '+trailer.unit+'.');
      reasons.push('Verified ratings used: truck GVWR '+Number(truck.gvwr).toLocaleString()+' lb · truck GCWR '+Number(truck.gcwr).toLocaleString()+' lb · trailer GVWR '+Number(trailer.gvwr).toLocaleString()+' lb.');
      if(hard.length){dispatchStatus='BLOCKED';decision='DO NOT DISPATCH';reasons.push(...hard)}
    }
    const metrics={...baseMetrics,payload};
    const snapshot={snapshotId:'EST-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),version:'V3.5',createdAt:new Date().toISOString(),decision,economicDecision,dispatchStatus,reasons:[...reasons],classification:classification?{...classification}:null,selectedFleet:selectedFleet?{...selectedFleet}:null,inputs:{loadedMiles:loaded,deadheadToPickup,returnDeadhead,offer,cargoWeight,fuelPrice,mpgMode,blendedMpg,loadedMpg,emptyMpg,accessorialRevenue:accessorials,minimumProfit,targetProfit,targetMargin,profitMileFloor,tripHours,hourlyFloor,negotiationAllowance:negotiation},costs:{fuel,mileageCosts,baseCost,dispatchRate,factoringRate,feeRate,dispatcher,factoring,...flatCosts},metrics:{...metrics}};
    const count=saveSnapshot(snapshot);
    localStorage.setItem('flt-v35-last-decision',JSON.stringify({decision,economicDecision,dispatchStatus,reasons,metrics,at:snapshot.createdAt,snapshotId:snapshot.snapshotId}));
    renderDecision(decision,reasons,metrics,economicDecision,dispatchStatus);updateSnapshotCount();renderOfficialGate();
    if(typeof toast==='function')toast('V3.5 estimate snapshot saved · '+count+' total.');
  }

  form.addEventListener('submit',handleSubmit,true);
  $('v35-mpg-mode')?.addEventListener('change',()=>{const separate=value('v35-mpg-mode')==='separate';$('v35-loaded-mpg').disabled=!separate;$('v35-empty-mpg').disabled=!separate;if($('v35-mpg'))$('v35-mpg').disabled=separate});
  $('v35-mpg-mode')?.dispatchEvent(new Event('change'));
  document.querySelectorAll('[data-view="test"],[data-view-jump="test"]').forEach(button=>button.addEventListener('click',()=>setTimeout(renderOfficialGate,0)));
  updateSnapshotCount();renderOfficialGate();
})();