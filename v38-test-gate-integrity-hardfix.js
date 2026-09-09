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
  function restoreClosedHardfixReceipt(load){
    if(load?.financialClose?.status!=='Closed'||!load?.financialClose?.snapshot)return false;
    const currentExpenses=Array.isArray(load.expenses)?load.expenses:[];
    const snapshotExpenses=Array.isArray(load.financialClose.snapshot.expenses)?load.financialClose.snapshot.expenses:[];
    let changed=false;
    currentExpenses.forEach((expense,index)=>{
      const snap=expense?.id?snapshotExpenses.find(item=>item?.id===expense.id):snapshotExpenses[index];
      if(expense?.receipt?.source==='v38-load-document'&&!snap?.receipt){
        delete expense.receipt;
        changed=true;
      }
    });
    if(changed)persistLoad();
    return changed;
  }
  function migrateActualTripEvidence(load){
    if(!load)return false;
    if(load?.financialClose?.status==='Closed')return restoreClosedHardfixReceipt(load);
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
      if(/Protected correction audit history/i.test(text)){
        const hasHistory=Boolean((load?.financialCloseHistory||[]).length);
        setTag(row.querySelector('.tag'),hasHistory?'PASS':'PENDING',hasHistory);
      }
    });
    if(snapshotPass){
      const headTag=gate.querySelector('.section-head .tag');
      const hasHistory=Boolean((load?.financialCloseHistory||[]).length);
      setTag(headTag,hasHistory?'LOAD CLOSED':'LOAD CLOSED',true);
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

  let repairTimer=null;
  const observerOptions={subtree:true,childList:true};
  const observer=new MutationObserver(mutations=>{
    const meaningful=mutations.some(m=>[...m.addedNodes].some(node=>{
      if(node?.nodeType!==1)return false;
      return node.id==='v36-gate'||node.id==='v37-gate'||node.querySelector?.('#v36-gate,#v37-gate');
    }));
    if(!meaningful)return;
    clearTimeout(repairTimer);
    repairTimer=setTimeout(()=>{
      observer.disconnect();
      try{repairVisibleGate()}finally{observer.observe(document.documentElement,observerOptions)}
    },25);
  });
  observer.observe(document.documentElement,observerOptions);

  migrateActualTripEvidence(currentLoad());
  setTimeout(()=>{
    observer.disconnect();
    try{
      migrateActualTripEvidence(currentLoad());
      try{if(typeof renderFinance==='function')renderFinance()}catch(_error){}
      repairVisibleGate();
    }finally{
      observer.observe(document.documentElement,observerOptions);
    }
  },0);
  window.FLTV38TestGateIntegrity={migrateActualTripEvidence,restoreClosedHardfixReceipt,correctionCapabilityPass,repairV36Gate,repairV37Gate,repairVisibleGate};
})();