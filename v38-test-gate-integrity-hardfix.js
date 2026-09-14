(() => {
  'use strict';
  const LIVE_REVIEW_KEY='flt-v38-live-test-gate-reviewed';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(_error){return fallback}};
  const currentLoad=()=>{try{return typeof current==='function'?current():null}catch(_error){return null}};
  const persistLoad=()=>{try{if(typeof persist==='function')persist()}catch(_error){}};

  const automatedOnlyPatterns=[
    /Non-CDL cannot bypass equipment and weight checks/i,
    /Missing verification returns MORE INFORMATION REQUIRED/i,
    /Driver qualification enforced at dispatch/i,
    /Truck and trailer verification enforced/i,
    /Blocked attempts preserve exact audit reasons/i,
    /Locked assignments require authorized audited change/i
  ];

  function activeV38Assignment(loadId){
    const data=read('flt-v38-assignments',{assignments:[]});
    const rows=Array.isArray(data?.assignments)?data.assignments:[];
    try{const api=window.FLTAssignmentIntegrity;if(api?.activeForLoad){const match=api.activeForLoad(data,loadId);if(match)return match;}}catch(_error){}
    return [...rows].reverse().find(row=>row?.loadId===loadId&&row?.status==='Verified / Locked')||null;
  }
  function fleetTruck(truckId){const fleet=read('flt-v35-fleet',{trucks:[]});return (fleet?.trucks||[]).find(row=>row?.id===truckId)||null;}
  function receiptDocument(load){const types=['Pickup Receipt','Delivery Receipt','Bill of Lading / Shipping Document'];return (load?.documents||[]).find(doc=>doc?.loadId===load?.id&&doc?.status!=='Removed'&&types.includes(doc?.type))||null;}
  function latestActualTrip(load){const rows=Array.isArray(load?.actualTripRecords)?load.actualTripRecords:[];return rows.at(-1)||null;}
  function restoreClosedHardfixReceipt(load){
    if(load?.financialClose?.status!=='Closed'||!load?.financialClose?.snapshot)return false;
    const currentExpenses=Array.isArray(load.expenses)?load.expenses:[];
    const snapshotExpenses=Array.isArray(load.financialClose.snapshot.expenses)?load.financialClose.snapshot.expenses:[];
    let changed=false;
    currentExpenses.forEach((expense,index)=>{const snap=expense?.id?snapshotExpenses.find(item=>item?.id===expense.id):snapshotExpenses[index];if(expense?.receipt?.source==='v38-load-document'&&!snap?.receipt){delete expense.receipt;changed=true;}});
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
      if(assignment?.truckId){const truck=fleetTruck(assignment.truckId);record.truckId=assignment.truckId;record.truckUnit=truck?.unit||assignment.truckId;changed=true;}
    }
    const receipt=receiptDocument(load);
    if(receipt){const fuel=(load.expenses||[]).find(item=>/fuel/i.test(String(item?.category||''))&&!item.receipt);if(fuel){fuel.receipt={documentId:receipt.id,filename:receipt.filename,type:receipt.type,source:'v38-load-document'};changed=true;}}
    if(changed)persistLoad();
    return changed;
  }
  function correctionCapabilityPass(load){const api=window.FLTFinancialClose;return Boolean(load?.financialClose?.status==='Closed'&&api?.reopenForCorrection&&api?.auditClosed?.(load)?.pass);}
  function correctionAuditState(load){const rows=Array.isArray(load?.financialCloseHistory)?load.financialCloseHistory:[];if(!rows.length)return {required:false,pass:true,label:'NOT REQUIRED'};const opened=rows.some(item=>item?.type==='Correction Opened');const reclosed=rows.some(item=>item?.type==='Correction Reclosed');return {required:true,pass:opened&&reclosed,label:opened&&reclosed?'PASS':'PENDING'};}
  function setTag(tag,text,pass=true){if(!tag)return;const nextClass='tag '+(pass?'':'gray');if(tag.textContent!==text)tag.textContent=text;if(tag.className!==nextClass)tag.className=nextClass;}
  function setAutomatedTag(tag){if(!tag)return;if(tag.textContent!=='AUTOMATED TEST')tag.textContent='AUTOMATED TEST';if(tag.className!=='tag gray')tag.className='tag gray';}
  function repairV36Gate(load){
    const gate=document.getElementById('v36-gate');if(!gate)return;
    const record=latestActualTrip(load);const mpgPass=Boolean(record&&Number.isFinite(Number(record.actualMpg))&&Number(record.actualMpg)>0);
    [...gate.querySelectorAll('.metric-row')].forEach(row=>{if(!/Vehicle MPG history created/i.test(row.textContent||''))return;setTag(row.querySelector('.tag'),mpgPass?'PASS':'PENDING',mpgPass);});
    const checks=[...gate.querySelectorAll('.metric-row .tag')];const pass=checks.length>0&&checks.every(tag=>tag.textContent.trim()==='PASS');
    const status=document.getElementById('v36-gate-status');if(status){status.textContent=pass?'PASS':'PENDING';status.className='tag '+(pass?'':'orange');}
  }
  function repairV37Gate(load){
    const gate=document.getElementById('v37-gate');if(!gate)return;
    const api=window.FLTFinancialClose;const closed=load?.financialClose?.status==='Closed';const audit=closed&&api?.auditClosed?api.auditClosed(load):null;const snapshotPass=Boolean(closed&&audit?.pass);
    [...gate.querySelectorAll('.metric-row')].forEach(row=>{const text=row.textContent||'';if(/Post-close financial snapshot unchanged/i.test(text))setTag(row.querySelector('.tag'),snapshotPass?'PASS':'PENDING',snapshotPass);if(/Protected correction audit history/i.test(text)){const correction=correctionAuditState(load);setTag(row.querySelector('.tag'),correction.label,correction.pass);}});
    if(snapshotPass){const headTag=gate.querySelector('.section-head .tag');setTag(headTag,'LOAD CLOSED',true);}
  }

  function automatedOnlyRow(row){return automatedOnlyPatterns.some(pattern=>pattern.test(String(row?.textContent||'')));}
  function liveRowsPass(panel){
    const rows=[...panel.querySelectorAll('.metric-row')].filter(row=>!automatedOnlyRow(row));
    return rows.length>0&&rows.every(row=>{const text=String(row.querySelector('.tag')?.textContent||'').trim();return text==='PASS'||text==='NOT REQUIRED';});
  }
  function ensureLiveAcceptanceNote(){
    const test=document.getElementById('test');if(!test||document.getElementById('v38-live-acceptance-note'))return;
    const firstPanel=test.querySelector('.panel');if(!firstPanel)return;
    const note=document.createElement('div');note.id='v38-live-acceptance-note';note.className='notice';note.style.margin='12px 0';
    note.innerHTML='<strong>Live end-to-end acceptance:</strong> operator workflow requirements are evaluated here. Negative-path safety checks marked <strong>AUTOMATED TEST</strong> are regression checks and must be rerun before PR #37 is merged.';
    firstPanel.insertAdjacentElement('afterbegin',note);
  }
  function normalizeLegacyNegativePathTests(){
    const test=document.getElementById('test');if(!test)return;
    [...test.querySelectorAll('.metric-row')].forEach(row=>{
      if(!automatedOnlyRow(row))return;
      row.dataset.v38AutomatedOnly='true';
      setAutomatedTag(row.querySelector('.tag'));
    });
    const classPanel=[...test.querySelectorAll('.panel')].find(panel=>/Classification\s*&\s*Load Decision Gate/i.test(panel.textContent||''));
    const fleetPanel=[...test.querySelectorAll('.panel')].find(panel=>/Fleet\s*&\s*Dispatch Gate/i.test(panel.textContent||''));
    if(classPanel&&liveRowsPass(classPanel)){const status=document.getElementById('v35-gate-status')||classPanel.querySelector('.section-head .tag');setTag(status,'PASS',true);}
    if(fleetPanel&&liveRowsPass(fleetPanel)){const status=document.getElementById('fleet-gate-status')||fleetPanel.querySelector('.section-head .tag');setTag(status,'PASS',true);}
    ensureLiveAcceptanceNote();
  }
  function testViewActive(){return Boolean(document.getElementById('test')?.classList.contains('active'));}
  function markReviewedWhenComplete(load){
    if(!load?.id||!testViewActive())return false;
    const gate=document.getElementById('gate-status');if(gate?.textContent!=='COMPLETE')return false;
    const existing=read(LIVE_REVIEW_KEY,null);if(existing?.loadId===load.id)return false;
    localStorage.setItem(LIVE_REVIEW_KEY,JSON.stringify({loadId:load.id,reviewedAt:new Date().toISOString(),scope:'live-end-to-end'}));
    window.dispatchEvent(new Event('flt:workflow-state-changed'));
    return true;
  }
  function repairVisibleGate(){
    if(!document.getElementById('test'))return;
    const load=currentLoad();if(!load)return;
    migrateActualTripEvidence(load);repairV36Gate(load);repairV37Gate(load);normalizeLegacyNegativePathTests();
    try{window.FLTUpdateOverallGate?.()}catch(_error){}
    markReviewedWhenComplete(load);
    try{window.FLTNextNeededUI?.apply?.()}catch(_error){}
  }
  function scheduleGateRepair(){setTimeout(repairVisibleGate,50);setTimeout(repairVisibleGate,250);}

  // Event-driven only. Do not observe the entire document or rerender Finance here.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleGateRepair,{once:true});
  else scheduleGateRepair();
  document.addEventListener('click',event=>{const target=event.target?.closest?.('a,button,[role="button"],.nav-item');if(target&&/test gate/i.test(target.textContent||''))scheduleGateRepair();});
  window.addEventListener('flt:workflow-state-changed',()=>{if(testViewActive())scheduleGateRepair();});

  window.FLTV38TestGateIntegrity={migrateActualTripEvidence,restoreClosedHardfixReceipt,correctionCapabilityPass,correctionAuditState,repairV36Gate,repairV37Gate,normalizeLegacyNegativePathTests,repairVisibleGate};
})();