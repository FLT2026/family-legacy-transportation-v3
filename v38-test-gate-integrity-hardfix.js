(() => {
  'use strict';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(_error){return fallback}};
  const currentLoad=()=>{try{return typeof current==='function'?current():null}catch(_error){return null}};
  const persistLoad=()=>{try{if(typeof persist==='function')persist()}catch(_error){}};

  function activeV38Assignment(loadId){
    const data=read('flt-v38-assignments',{assignments:[]});
    const rows=Array.isArray(data?.assignments)?data.assignments:[];
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
  function migrateActualTripEvidence(load){
    if(!load)return false;
    let changed=false;
    const records=Array.isArray(load.actualTripRecords)?load.actualTripRecords:[];
    const record=records.at(-1);
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
    return Boolean(load?.financialClose?.status==='Closed'&&window.FLTFinancialClose?.reopenForCorrection&&window.FLTFinancialClose?.auditClosed?.(load)?.pass);
  }
  function repairVisibleGate(){
    const load=currentLoad();
    if(!load)return;
    migrateActualTripEvidence(load);
    const gate=document.getElementById('v37-gate');
    if(gate&&correctionCapabilityPass(load)){
      [...gate.querySelectorAll('.metric-row')].forEach(row=>{
        if(!/Protected correction audit history/i.test(row.textContent||''))return;
        const badge=row.querySelector('.tag');
        if(badge){badge.textContent=(load.financialCloseHistory||[]).length?'PASS':'AVAILABLE';badge.className='tag';}
      });
    }
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
    try{window.FLTUpdateOverallGate?.()}catch(_error){}
  },0);
  window.FLTV38TestGateIntegrity={migrateActualTripEvidence,correctionCapabilityPass,repairVisibleGate};
})();
