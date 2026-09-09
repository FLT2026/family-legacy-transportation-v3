(() => {
  'use strict';
  if(window.FLTV36AutopopulateHardfix)return;

  const $=id=>document.getElementById(id);
  const num=value=>{if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null};
  const readJson=(key,fallback)=>{try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return parsed??fallback}catch(error){return fallback}};

  function getLoad(){
    try{if(typeof current==='function')return current()}catch(error){}
    const saved=readJson('flt-v32-loads',[]);
    if(!Array.isArray(saved)||!saved.length)return null;
    const selected=localStorage.getItem('flt-selected-load-id');
    return saved.find(load=>load.id===selected)||saved.at(-1)||null;
  }

  function deepFindTruck(value,loadId,seen=new Set()){
    if(!value||typeof value!=='object'||seen.has(value))return null;
    seen.add(value);
    if(String(value.loadId||value.entityId||'')===String(loadId)&&value.truckId)return value;
    if(Array.isArray(value)){
      for(let i=value.length-1;i>=0;i--){const found=deepFindTruck(value[i],loadId,seen);if(found)return found}
      return null;
    }
    const priority=['after','before','assignment','current','previous','lock','snapshot','record','data'];
    for(const key of priority){if(key in value){const found=deepFindTruck(value[key],loadId,seen);if(found)return found}}
    for(const [key,child] of Object.entries(value)){
      if(priority.includes(key))continue;
      const found=deepFindTruck(child,loadId,seen);if(found)return found;
    }
    return null;
  }

  function getV38Assignment(loadId){
    const data=readJson('flt-v38-assignments',{assignments:[],assignmentAudit:[]});
    const assignments=Array.isArray(data?.assignments)?data.assignments:[];
    const active=[...assignments].reverse().find(item=>item.loadId===loadId&&item.status==='Verified / Locked');
    if(active)return active;
    return deepFindTruck(data,loadId);
  }

  function getLegacyAssignment(loadId){
    const fleet=readJson('flt-v35-fleet',{locks:[],audit:[]});
    const locks=Array.isArray(fleet?.locks)?fleet.locks:[];
    const active=[...locks].reverse().find(lock=>lock.loadId===loadId&&lock.truckId);
    if(active)return active;
    return deepFindTruck(fleet,loadId);
  }

  function getAnyStoredAssignment(loadId){
    // Final recovery for completed loads: search Family Legacy local records for
    // a load-specific object that already contains the historical truck ID.
    // This handles older/newer audit shapes, including nested before/after arrays.
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i);
      if(!key||!/^flt-/i.test(key))continue;
      try{
        const parsed=JSON.parse(localStorage.getItem(key)||'null');
        const found=deepFindTruck(parsed,loadId);
        if(found)return found;
      }catch(error){}
    }
    return null;
  }

  function resolveAssignment(loadId){
    return getV38Assignment(loadId)||getLegacyAssignment(loadId)||getAnyStoredAssignment(loadId);
  }

  function resolveTruckUnit(truckId,assignment){
    if(assignment?.truckUnit)return assignment.truckUnit;
    if(assignment?.truckSnapshot?.unit)return assignment.truckSnapshot.unit;
    if(assignment?.unit)return assignment.unit;
    const fleet=readJson('flt-v35-fleet',{trucks:[]});
    const truck=(Array.isArray(fleet?.trucks)?fleet.trucks:[]).find(item=>String(item.id)===String(truckId));
    return truck?.unit||truck?.name||truckId||null;
  }

  function resolveEstimate(load){
    const snapshots=readJson('flt-v35-estimate-snapshots',[]);
    const list=Array.isArray(snapshots)?snapshots:[];
    const snapshot=[...list].reverse().find(item=>item.loadId===load?.id)||null;
    return {
      miles:num(snapshot?.metrics?.totalMiles)??num(load?.totalMiles??load?.mileage),
      gallons:num(snapshot?.metrics?.fuelGallons)??num(load?.estimatedFuelGallons),
      fuelPrice:num(snapshot?.inputs?.fuelPrice)??num(load?.fuelPricePerGallon)
    };
  }

  function fuelLedgerActual(load){
    const entries=Array.isArray(load?.expenses)?load.expenses:[];
    const fuel=[...entries].reverse().find(item=>String(item.category||'').toLowerCase()==='fuel'&&num(item.amount)!==null);
    return fuel?num(fuel.amount):null;
  }

  function enrichLatestSnapshot(load){
    if(!load)return false;
    const records=Array.isArray(load.actualTripRecords)?load.actualTripRecords:[];
    const record=records.at(-1);
    if(!record)return false;
    const assignment=resolveAssignment(load.id);
    let changed=false;

    if(assignment?.truckId&&record.truckId!==String(assignment.truckId)){record.truckId=String(assignment.truckId);changed=true}
    const unit=assignment?.truckId?resolveTruckUnit(assignment.truckId,assignment):record.truckUnit;
    if(unit&&record.truckUnit!==unit){record.truckUnit=unit;changed=true}

    const miles=num(record.actualMiles),gallons=num(record.actualGallons);
    if(miles>0&&gallons>0){
      const mpg=miles/gallons;
      if(!Number.isFinite(record.actualMpg)||Math.abs(Number(record.actualMpg)-mpg)>0.0001){record.actualMpg=mpg;changed=true}
    }

    if(changed){
      load.actualMiles=miles??load.actualMiles;
      load.actualFuelGallons=gallons??load.actualFuelGallons;
      load.actualFuelPrice=num(record.averageFuelPrice)??load.actualFuelPrice;
      try{if(typeof persist==='function')persist()}catch(error){}
    }
    return changed;
  }

  function fillForm(){
    const form=$('v36-actual-form'),load=getLoad();
    if(!form||!load)return;
    const records=Array.isArray(load.actualTripRecords)?load.actualTripRecords:[];
    const record=records.at(-1)||null;
    const estimate=resolveEstimate(load);
    const actualFuel=fuelLedgerActual(load);
    const set=(name,value,force=false)=>{const field=form.elements[name];if(!field||value===null||value===undefined||value==='')return;if(force||String(field.value).trim()==='')field.value=value};

    if(record){
      set('odometerStart',record.odometerStart,true);
      set('odometerEnd',record.odometerEnd,true);
      set('actualMiles',record.actualMiles,true);
      set('actualGallons',record.actualGallons,true);
      set('averageFuelPrice',record.averageFuelPrice,true);
      set('fuelCost',record.fuelCost,true);
      set('note',record.note,true);
      if(form.elements.noTollsIncurred)form.elements.noTollsIncurred.checked=Boolean(record.noTollsIncurred);
      return;
    }

    set('actualMiles',num(load.actualMiles)??estimate.miles);
    set('actualGallons',num(load.actualFuelGallons)??estimate.gallons);
    set('averageFuelPrice',num(load.actualFuelPrice)??estimate.fuelPrice);
    const gallons=num(form.elements.actualGallons?.value),price=num(form.elements.averageFuelPrice?.value);
    set('fuelCost',actualFuel??(gallons>0&&price>0?gallons*price:null));
    if(!form.elements.note?.value&&estimate.miles>0)form.elements.note.value='Review auto-populated trip values and change only where actual results differ.';
  }

  function refreshV36(){
    const load=getLoad();
    if(!load)return;
    const changed=enrichLatestSnapshot(load);
    if(changed){try{if(typeof renderFinance==='function')renderFinance()}catch(error){}}
    fillForm();
  }

  function afterSubmit(){setTimeout(refreshV36,0)}

  const form=$('v36-actual-form');
  form?.addEventListener('submit',afterSubmit);
  document.querySelectorAll('[data-view="finance"],[data-view-jump="finance"]').forEach(button=>button.addEventListener('click',()=>setTimeout(refreshV36,0)));
  window.addEventListener('flt:modules-loaded',()=>setTimeout(refreshV36,0),{once:true});
  setTimeout(refreshV36,0);

  window.FLTV36AutopopulateHardfix={refresh:refreshV36,fillForm,enrichLatestSnapshot,getV38Assignment,getLegacyAssignment,getAnyStoredAssignment,resolveAssignment};
})();
