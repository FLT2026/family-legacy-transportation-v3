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
    <div class="section-head"><div><div class="eyebrow">V3.5 completion pass</div><h2>Complete Proposed-Load Economics</h2><p class="subtle" style="margin-top:5px">Adds return/repositioning miles, separate loaded/empty MPG, full configurable trip costs, profit floors, negotiation allowance, counteroffer, and saved estimate history.</p></div></div>
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
      <div class="field"><label>Factoring / Payment Fee (%)</label><input id="v35-factoring-percent" type="number" min="0" max="99" step="0.01" value="0"></div>
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
  function saveSnapshot(snapshot){const list=readSnapshots();list.push({...snapshot});localStorage.setItem(snapshotKey,JSON.stringify(list));return list.length}
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
      panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Blueprint-aligned gate</div><h2>V3.5 Accurate Proposed Load</h2><p class="subtle" style="margin-top:5px">Passes only when the latest saved estimate proves every V3.5 build requirement.</p></div><span class="tag orange" id="v35-official-status">PENDING</span></div><div id="v35-official-checks"></div>';
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
      'Saved estimate snapshot':Boolean(last&&last.snapshotId&&snapshots.length>0)
    };
    const box=$('v35-official-checks');if(!box)return;box.innerHTML='';Object.entries(checks).forEach(([label,pass])=>{const row=document.createElement('div');row.className='metric-row';const text=document.createElement('span');text.textContent=label;const tag=document.createElement('span');tag.className='tag '+(pass?'':'gray');tag.textContent=pass?'PASS':'PENDING';row.append(text,tag);box.appendChild(row)});
    const pass=Object.values(checks).every(Boolean),status=$('v35-official-status');if(status){status.textContent=pass?'PASS':'PENDING';status.className='tag '+(pass?'':'orange')}
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
    const dispatchRate=Math.max(0,number('v35-dispatch-percent'))/100,factoringRate=Math.max(0,number('v35-factoring-percent'))/100,feeRate=dispatchRate+factoringRate;
    const flatCosts={tolls:number('v35-tolls'),driverPay:number('v35-driver-pay'),parking:number('v35-parking'),permits:number('v35-permits'),lodging:number('v35-lodging'),meals:number('v35-meals'),scales:number('v35-scales'),washout:number('v35-washout'),loading:number('v35-loading-cost'),securement:number('v35-securement-cost'),insuranceAllocation:number('v35-insurance-allocation'),other:number('v35-other-costs')};
    const additionalFlat=Object.values(flatCosts).reduce((sum,v)=>sum+v,0),baseCost=fuel+mileageCosts+additionalFlat;
    if(feeRate>=1){renderDecision('MORE INFORMATION REQUIRED',['Dispatcher plus factoring/payment percentages must total less than 100%.'],{});renderOfficialGate();return}
    const dispatcher=totalRevenue*dispatchRate,factoring=totalRevenue*factoringRate,totalCost=baseCost+dispatcher+factoring,walkaway=baseCost/(1-feeRate);
    const targetProfit=number('v35-target-profit'),targetMargin=Math.min(.95,number('v35-target-margin')/100),profitMileFloor=number('v35-profit-mile-floor'),tripHours=number('v35-trip-hours'),hourlyFloor=number('v35-hourly-floor');
    if(targetMargin>0&&1-feeRate-targetMargin<=0){renderDecision('MORE INFORMATION REQUIRED',['The selected target margin is impossible with the configured percentage fees. Lower the target margin or percentage fees.'],{});renderOfficialGate();return}
    const targets=[(baseCost+targetProfit)/(1-feeRate)];
    if(targetMargin>0)targets.push(baseCost/(1-feeRate-targetMargin));
    if(profitMileFloor>0)targets.push((baseCost+profitMileFloor*totalMiles)/(1-feeRate));
    if(hourlyFloor>0&&tripHours>0)targets.push((baseCost+hourlyFloor*tripHours)/(1-feeRate));
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
    const reasons=['Total business miles: '+loaded.toLocaleString()+' loaded + '+deadheadToPickup.toLocaleString()+' pickup deadhead + '+returnDeadhead.toLocaleString()+' reposition/return deadhead.','Fuel estimate: '+fuelGallons.toFixed(2)+' gal · '+cash(fuel)+' at '+cash(fuelPrice)+'/gal using '+(mpgMode==='separate'?'loaded/empty MPG':'blended MPG')+'.','Base trip cost before percentage fees: '+cash(baseCost)+'. Walk-away after percentage fees: '+cash(walkaway)+'.','Configured target: '+cash(target)+'. Recommended ask: '+cash(ask)+'.','Accessorial revenue included: '+cash(accessorials)+'. Percentage fees: '+percent(feeRate)+'.'];
    let decision;if(hard.length){decision='DO NOT DISPATCH';reasons.push(...hard)}else if(totalRevenue>=target){decision='ACCEPT LOAD';reasons.push('Offer satisfies all configured profit floors.')}else if(totalRevenue>=walkaway){decision='NEGOTIATE RATE';reasons.push('Counteroffer requires '+cash(counteroffer)+' additional revenue; target rate is '+cash(counterofferRate)+' per total mile.')}else{decision='PASS ON LOAD';reasons.push('Offer is '+cash(walkaway-totalRevenue)+' below walk-away.')}

    const snapshot={snapshotId:'EST-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),version:'V3.5',createdAt:new Date().toISOString(),decision,reasons:[...reasons],classification:{...classification},inputs:{loadedMiles:loaded,deadheadToPickup,returnDeadhead,offer,cargoWeight,fuelPrice,mpgMode,blendedMpg,loadedMpg,emptyMpg,accessorialRevenue:accessorials,targetProfit,targetMargin,profitMileFloor,tripHours,hourlyFloor,negotiationAllowance:negotiation},costs:{fuel,mileageCosts,baseCost,dispatchRate,factoringRate,feeRate,dispatcher,factoring,...flatCosts},metrics:{...metrics}};
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