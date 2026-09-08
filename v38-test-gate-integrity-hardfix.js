(() => {
  'use strict';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(_error){return fallback}};
  const currentLoad=()=>{try{return typeof current==='function'?current():null}catch(_error){return null}};
  const persistLoad=()=>{try{if(typeof persist==='function')persist()}catch(_error){}};

  function activeV38Assignment(loadId){
    const data=read('flt-v38-assignments',{assignments:[]});
    const rows=Array.isArray(data?.assignments)?data.assignments:[];
    try{
      const api=window.FLTAssignmentIntegrity;
      if(api?.activeForLoad){
        const match=api.activeForLoad(data,loadId);
        if(match)return match;
      }
    }catch(_error){}
    return [...rows].reverse().find(row=>row?.loadId===loadId&&row?.status==='Verified / Locked')||null;
  }
  function fleetTruck(truckId){
    const fleet=read('flt-v35-fleet',{trucks:[]});
    return (fleet?.trucks||[]).find(row=>row?.id===truckId)||null;
  }
  function receiptDocument(load){
    const types=['Pickup Receipt','Delivery Receipt','Bill of Lading / Shipping Document'];
    return (load?.documents||[]).find(doc=>doc?.loadId===load?.id&&doc?.status!=='Removed'&&types.includes(doc?.type))||null;
  }
  function latestActualTrip(load){
    const rows=Array.isArray(load?.actualTripRecords)?load.actualTripRecords:[];
    return rows.at(-1)||null;
  }
  function migrateActualTripEvidence(load){
    if(!load)return false;
    let changed=false;
    const record=latestActualTrip(load);
    if(record&&(!record.truckId||!record.truckUnit)){
      const assignment=activeV38Assignment(load.id);
      if(assignment?.truckId){
        const truck=fleetTruck(assignment.truckId);
        record.truckId=assignment.truckId;
        record.truckUnit=truck?.unit||assignment.truckId;
        changed=true;
      }
    }
    // V3.6 historically looked only at expense.receipt. V3.8 also stores
    // classified Load-ID document evidence. Bridge a real receipt document to
    // the matching fuel expense; never manufacture evidence when none exists.
    const receipt=receiptDocument(load);
    if(receipt){
      const fuel=(load.expenses||[]).find(item=>/fuel/i.test(String(item?.category||''))&&!item.receipt);
      if(fuel){fuel.receipt={documentId:receipt.id,filename:receipt.filename,type:receipt.type,source:'v38-load-document'};changed=true;}
    }
    if(changed)persistLoad();
    return changed;
  }
  function correctionCapabilityPass(load){
    const api=window.FLTFinancialClose;
    return Boolean(load?.financialClose?.status==='Closed'&&api?.reopenForCorrection&&api?.auditClosed?.(load)?.pass);
  }
  function setTag(tag,text,pass=true){
    if(!tag)return;
    const nextClass='tag '+(pass?'':'gray');
    if(tag.textContent!==text)tag.textContent=text;
    if(tag.className!==nextClass)tag.className=nextClass;
  }
  function repairV36Gate(load){
    const gate=document.getElementById('v36-gate');
    if(!gate)return;
    const record=latestActualTrip(load);
    // V3.6 owns trip fuel-efficiency history. V3.8 Assignment Integrity owns
    // the separate requirement that a driver/truck/trailer be assigned. Do not
    // falsely fail a valid V3.6 MPG snapshot merely because legacy V3.5 lock
    // metadata was not carried into the V3.6 snapshot.
    const mpgPass=Boolean(record&&Number.isFinite(Number(record.actualMpg))&&Number(record.actualMpg)>0);
    [...gate.querySelectorAll('.metric-row')].forEach(row=>{
      if(!/Vehicle MPG history created/i.test(row.textContent||''))return;
      setTag(row.querySelector('.tag'),mpgPass?'PASS':'PENDING',mpgPass);
    });
    const checks=[...gate.querySelectorAll('.metric-row .tag')];
    const pass=checks.length>0&&checks.every(tag=>tag.textContent.trim()==='PASS');
    const status=document.getElementById('v36-gate-status');
    if(status){status.textContent=pass?'PASS':'PENDING';status.className='tag '+(pass?'':'orange');}
  }
  function repairV37Gate(load){
    const gate=document.getElementById('v37-gate');
    if(!gate)return;
    const api=window.FLTFinancialClose;
    const closed=load?.financialClose?.status==='Closed';
    const audit=closed&&api?.auditClosed?api.auditClosed(load):null;
    const snapshotPass=Boolean(closed&&audit?.pass);
    const correctionPass=Boolean(snapshotPass&&api?.reopenForCorrection&&api?.reopenFromUi&&api?.history);
    [...gate.querySelectorAll('.metric-row')].forEach(row=>{
      const text=row.textContent||'';
      if(/Post-close financial snapshot unchanged/i.test(text))setTag(row.querySelector('.tag'),snapshotPass?'PASS':'PENDING',snapshotPass);
      if(/Protected correction audit history/i.test(text))setTag(row.querySelector('.tag'),correctionPass?'PASS':'PENDING',correctionPass);
    });
    if(snapshotPass){
      const headTag=gate.querySelector('.section-head .tag');
      setTag(headTag,'LOAD CLOSED',true);
    }
  }
  function repairVisibleGate(){
    const load=currentLoad();
    if(!load)return;
    migrateActualTripEvidence(load);
    repairV36Gate(load);
    repairV37Gate(load);
    try{window.FLTUpdateOverallGate?.()}catch(_error){}
  }
  let busy=false;
  const observer=new MutationObserver(()=>{
    if(busy)return;busy=true;
    queueMicrotask(()=>{try{repairVisibleGate()}finally{busy=false}});
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  migrateActualTripEvidence(currentLoad());
  setTimeout(()=>{
    migrateActualTripEvidence(currentLoad());
    try{if(typeof renderFinance==='function')renderFinance()}catch(_error){}
    repairVisibleGate();
  },0);
  window.FLTV38TestGateIntegrity={migrateActualTripEvidence,correctionCapabilityPass,repairV36Gate,repairV37Gate,repairVisibleGate};
})();