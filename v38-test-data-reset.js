(() => {
  'use strict';
  if(window.FLTTestDataReset)return;

  const freshStartKey='commercial-command-fresh-start';
  const fullSetupResetKey='commercial-command-full-setup-reset';
  const resetLandingKey='commercial-command-reset-dashboard-top';
  const resetLandingPending=sessionStorage.getItem(resetLandingKey)==='1';
  if(resetLandingPending&&window.history)window.history.scrollRestoration='manual';
  const protectedBackupKey='commercial-command-master-backup-v1';
  const isCommercialCommandKey=key=>/^flt-/i.test(String(key||''));
  // Durable owner-operator setup must survive acceptance-test resets. These are
  // reusable master records, not disposable test transactions.
  const durableKeys=new Set([
    'flt-v34-business-profile',
    'flt-v35-classification',
    'flt-v35-fleet',
    'flt-v36-regular-rig',
    'flt-v35-default-fleet-selection',
    'flt-v32-customers',
    'flt-address-book-v1',
    'flt-v38-operating-assumptions'
  ]);
  const isResettableCommercialCommandKey=key=>isCommercialCommandKey(key)&&!durableKeys.has(String(key||''));
  const matchingKeys=storage=>{
    const keys=[];
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(isResettableCommercialCommandKey(key))keys.push(key);
    }
    return keys;
  };

  function preview(){
    return {localStorage:matchingKeys(localStorage),sessionStorage:matchingKeys(sessionStorage)};
  }

  function setFreshStartMode(){localStorage.setItem(freshStartKey,'1');}
  function clearFreshStartMode(){localStorage.removeItem(freshStartKey);}
  function isFreshStartMode(){return localStorage.getItem(freshStartKey)==='1';}

  function reset(){
    const before=preview();
    before.localStorage.forEach(key=>localStorage.removeItem(key));
    before.sessionStorage.forEach(key=>sessionStorage.removeItem(key));
    setFreshStartMode();
    sessionStorage.setItem('flt-reset-complete','1');
    return before;
  }

  function confirmReset(){
    const before=preview(),count=before.localStorage.length+before.sessionStorage.length;
    const first=globalThis.confirm?.('Reset Commercial Command TEST TRANSACTIONS?\n\nThis will delete '+count+' disposable Commercial Command browser data item'+(count===1?'':'s')+' such as loads, invoices, payments, documents, estimates, and acceptance-test history.\n\nBusiness Setup, classification, Driver/Truck/Trailer master records, My Regular Rig, and the fleet audit trail will be preserved. GitHub code and unrelated browser/site data will NOT be deleted.');
    if(!first)return false;
    const second=globalThis.confirm?.('FINAL CONFIRMATION\n\nStart a fresh transaction test while keeping saved owner-operator setup and master records?\n\nCleared transaction/test records cannot be restored unless you exported a backup.');
    if(!second)return false;
    reset();location.reload();return true;
  }

  function fullResetKeys(storage){
    const keys=[];
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(isCommercialCommandKey(key)||key===protectedBackupKey||key===freshStartKey||key===fullSetupResetKey)keys.push(key);
    }
    return keys;
  }

  function fullReset(){
    const retained=new Map(),customerKey='flt-v32-customers',bookKey='flt-address-book-v1',raw=localStorage.getItem(customerKey);
    if(raw){
      try{
        const customers=JSON.parse(raw);if(!Array.isArray(customers))throw new Error('Invalid customer store');
        const legitimate=customers.filter(customer=>customer.isTest!==true);
        if(legitimate.length){
          retained.set(customerKey,JSON.stringify(legitimate));
          const ids=new Set(legitimate.map(customer=>customer.id).filter(Boolean)),addressKey=value=>[value?.street,value?.city,value?.state,value?.zip].map(part=>String(part||'').trim().toLowerCase()).join('|');
          const addresses=new Set(legitimate.flatMap(customer=>[customer.billingAddress||customer,...(customer.pickupLocations||[]),...(customer.deliveryLocations||[])]).map(addressKey));
          const book=JSON.parse(localStorage.getItem(bookKey)||'[]');
          const saved=Array.isArray(book)?book.filter(item=>item.customerId?ids.has(item.customerId):addresses.has(addressKey(item))):[];
          if(saved.length)retained.set(bookKey,JSON.stringify(saved));
        }
      }catch(error){retained.set(customerKey,raw);const book=localStorage.getItem(bookKey);if(book)retained.set(bookKey,book)}
    }
    const before={localStorage:fullResetKeys(localStorage),sessionStorage:fullResetKeys(sessionStorage)};
    before.localStorage.forEach(key=>localStorage.removeItem(key));
    before.sessionStorage.forEach(key=>sessionStorage.removeItem(key));
    retained.forEach((value,key)=>localStorage.setItem(key,value));
    localStorage.setItem(fullSetupResetKey,'1');
    return before;
  }

  function confirmFullReset(){
    const before={localStorage:fullResetKeys(localStorage),sessionStorage:fullResetKeys(sessionStorage)},count=before.localStorage.length+before.sessionStorage.length;
    const first=globalThis.confirm?.('RESET ALL SETUP & TEST DATA?\n\nThis permanently deletes saved Business Setup, classification, Driver/Truck/Trailer records, My Regular Rig, default fleet selections, protected master backups, fleet audit history, and all loads, invoices, payments, documents, estimates, signatures, and acceptance-test data.\n\nCustomers marked Development / fictitious and their saved locations will be removed. Legitimate Customer Master records and their locations will be retained.\n\nGitHub/code files and unrelated browser/site data will NOT be changed. Continue?');
    if(!first)return false;
    const second=globalThis.confirm?.('FINAL CONFIRMATION\n\nDelete '+count+' Commercial Command setup/test data item'+(count===1?'':'s')+' and return to a first-time-user state? This cannot be undone.');
    if(!second)return false;
    fullReset();sessionStorage.setItem(resetLandingKey,'1');location.reload();return true;
  }

  function scrollResetLandingToTop(){
    if(resetLandingPending)window.scrollTo({left:0,top:0,behavior:'instant'});
  }

  function applyResetLanding(){
    if(!resetLandingPending)return;
    if(typeof showView==='function')showView('dashboard');
    scrollResetLandingToTop();
    window.requestAnimationFrame(()=>{
      scrollResetLandingToTop();
      sessionStorage.removeItem(resetLandingKey);
    });
  }

  function neutralizeFirstRunControls(){
    if(localStorage.getItem(fullSetupResetKey)!=='1')return false;
    document.querySelectorAll('#fleet input, #fleet textarea').forEach(input=>{
      if(['button','submit','reset'].includes(input.type))return;
      if(['checkbox','radio'].includes(input.type)){input.checked=false;input.defaultChecked=false}
      else{input.value='';input.defaultValue=''}
    });
    document.querySelectorAll('input[type="number"]').forEach(input=>{input.value=''});
    document.querySelectorAll('input[type="checkbox"]').forEach(input=>{input.checked=false});
    document.querySelectorAll('select').forEach(select=>{
      let placeholder=[...select.options].find(option=>option.value===''&&/^select\b/i.test(option.textContent.trim()));
      if(!placeholder){
        placeholder=[...select.options].find(option=>option.value==='');
        if(placeholder)placeholder.textContent='Select...';
        else{placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select...';select.insertBefore(placeholder,select.firstChild)}
      }
      [...select.options].forEach(option=>{option.selected=option===placeholder;if(select.closest?.('#fleet'))option.defaultSelected=option===placeholder});
    });
    return true;
  }

  function hasSavedSetupOrTestData(){
    if(localStorage.getItem('flt-v34-business-profile')||localStorage.getItem('flt-v35-classification')||localStorage.getItem('flt-v36-regular-rig')||localStorage.getItem('flt-v35-default-fleet-selection'))return true;
    try{
      const fleet=JSON.parse(localStorage.getItem('flt-v35-fleet')||'{}');
      if(['drivers','trucks','trailers','locks','audit'].some(bucket=>Array.isArray(fleet[bucket])&&fleet[bucket].length))return true;
      const loads=JSON.parse(localStorage.getItem('flt-v32-loads')||'[]');
      if(Array.isArray(loads)&&loads.length)return true;
      const estimates=JSON.parse(localStorage.getItem('flt-v35-estimate-snapshots')||'[]');
      if(Array.isArray(estimates)&&estimates.length)return true;
    }catch(error){return false}
    return false;
  }

  function clearFullResetModeAfterFirstSave(){
    if(localStorage.getItem(fullSetupResetKey)==='1'&&hasSavedSetupOrTestData())localStorage.removeItem(fullSetupResetKey);
  }

  function statByLabel(label){
    return [...document.querySelectorAll('#dashboard .stat')].find(card=>card.querySelector('.label')?.textContent.trim()===label)||null;
  }
  function setStat(label,value,trend){
    const card=statByLabel(label);if(!card)return;
    const valueNode=card.querySelector('.value');if(valueNode)valueNode.textContent=value;
    const trendNode=card.querySelector('.trend');if(trendNode)trendNode.textContent=trend;
  }
  function setFreshNext(){
    // V3.8 workflow authority is the only owner of the NEXT navigation marker.
    // A fresh transaction reset may change workflow state, but must not create a
    // second legacy NEXT marker that can disagree with missing setup/fleet data.
    document.getElementById('nav')?.querySelectorAll('.v38-nav-next').forEach(item=>item.classList.remove('v38-nav-next'));
    window.FLTWorkflowAuthority?.apply?.();
  }
  function clearFreshBusinessPlanningDefaults(){
    if(!isFreshStartMode()||localStorage.getItem('flt-v35-classification'))return;
    ['v35-truck-gvwr','v35-trailer-gvwr','v35-truck-empty','v35-trailer-empty','v35-gcwr'].forEach(id=>{
      const input=document.getElementById(id);
      if(input)input.value='';
    });
  }
  function protectAgainstHardcodedPlanningDefault(){
    const clear=()=>setTimeout(clearFreshBusinessPlanningDefaults,0);
    const profile=document.getElementById('v35-load-flt-profile');
    if(profile&&!profile.dataset.fltFreshResetGuard){
      profile.dataset.fltFreshResetGuard='1';
      profile.addEventListener('click',clear,true);
      profile.addEventListener('click',()=>setTimeout(clearFreshBusinessPlanningDefaults,20));
    }
    clearFreshBusinessPlanningDefaults();
  }
  function showEmptyDashboard(){
    const heroTitle=document.getElementById('hero-title'),heroRoute=document.getElementById('hero-route');
    if(heroTitle)heroTitle.textContent='Commercial Command is ready for a fresh test.';
    if(heroRoute)heroRoute.textContent=localStorage.getItem('flt-v34-business-profile')?'Saved setup is intact. Evaluate the next proposed load when ready.':'Start with Business Setup, then Drivers & Equipment, then evaluate the first proposed load.';
    setStat('Open loads','0','No loads yet');
    setStat('Revenue in motion','$0','No active revenue');
    setStat('Fleet utilization','0%','Setup not completed');
    setStat('Pending signatures','0','Nothing pending');
    const table=document.getElementById('load-table');if(table)table.innerHTML='<tr><td colspan="4" class="empty">No loads yet. Complete setup, then evaluate your first proposed load.</td></tr>';
    const ready=document.getElementById('health-ready');if(ready)ready.textContent='0% ready';
    const completeness=document.getElementById('health-completeness');if(completeness)completeness.textContent='0%';
    const documents=document.getElementById('health-documents');if(documents)documents.textContent='0 / 4';
    const invoice=document.getElementById('health-invoice');if(invoice)invoice.textContent='Not started';
    const bar=document.getElementById('health-bar');if(bar)bar.style.width='0%';
    const openRecord=document.querySelector('#dashboard [data-view-jump="record"]');
    if(openRecord){openRecord.textContent='Start Business Setup →';openRecord.dataset.viewJump='business-setup';}
    setFreshNext();
  }

  function applyFreshStart(){
    if(!isFreshStartMode())return false;
    try{
      if(typeof store!=='undefined'&&Array.isArray(store.loads)){
        const onlyDemo=store.loads.length===1&&String(store.loads[0]?.id||'')==='DEMO-000001';
        if(onlyDemo||sessionStorage.getItem('flt-reset-complete')==='1'){
          store.loads=[];store.selectedId='';
          localStorage.setItem('flt-v32-loads','[]');
          localStorage.removeItem('flt-v32-loads-selected');
        }
      }
    }catch(error){console.warn('Unable to clear seeded demo load after fresh reset.',error)}
    protectAgainstHardcodedPlanningDefault();
    showEmptyDashboard();return true;
  }

  function watchForFirstRealLoad(){
    document.getElementById('load-form')?.addEventListener('submit',()=>setTimeout(()=>{
      try{if(typeof store!=='undefined'&&Array.isArray(store.loads)&&store.loads.some(load=>load&&load.id&&load.id!=='DEMO-000001'))clearFreshStartMode()}catch(error){}
    },50));
  }

  function mount(){
    if(document.getElementById('v38-test-data-reset'))return;
    const business=document.getElementById('business-setup')||document.querySelector('.view#business-setup')||document.querySelector('.view[data-view="business-setup"]');
    if(!business)return;
    const panel=document.createElement('div');panel.id='v38-test-data-reset';panel.className='panel';panel.style.marginTop='18px';
    panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Acceptance testing</div><h2>Fresh Transaction Test</h2><p class="subtle" style="margin-top:5px">Clear disposable Commercial Command transaction/test data, then restart at Dashboard. GitHub code is untouched.</p></div><span class="tag orange">TEST DATA ONLY</span></div><div class="notice" style="margin-top:12px"><strong>Saved owner-operator setup is protected.</strong><br>Business Setup, classification, Driver/Truck/Trailer master records, My Regular Rig, and the fleet audit trail remain saved. Loads, invoices, payments, documents, estimates, and acceptance-test records are cleared.</div><div class="form-actions" style="margin-top:14px"><button class="btn danger" id="v38-reset-test-data" type="button">Reset Transaction Test Data</button></div><div class="notice hard-stop" style="margin-top:18px"><strong>Full Setup & Test Reset warning:</strong> This permanently deletes saved Business Setup, classification, Driver/Truck/Trailer records, My Regular Rig, default fleet selections, protected master backups, fleet audit history, and all test transactions. GitHub/code files and unrelated browser data are not touched.</div><div class="form-actions" style="margin-top:12px"><button class="btn danger" id="v38-reset-all-setup-test-data" type="button">Reset All Setup & Test Data</button></div>';
    business.appendChild(panel);
    document.getElementById('v38-reset-test-data')?.addEventListener('click',confirmReset);
    document.getElementById('v38-reset-all-setup-test-data')?.addEventListener('click',confirmFullReset);
  }

  window.FLTTestDataReset={preview,reset,confirmReset,fullReset,confirmFullReset,mount,isCommercialCommandKey,isResettableCommercialCommandKey,durableKeys:[...durableKeys],applyFreshStart,isFreshStartMode,clearFreshStartMode};
  applyFreshStart();watchForFirstRealLoad();mount();
  document.addEventListener('submit',()=>setTimeout(clearFullResetModeAfterFirstSave,0),true);
  document.addEventListener('click',()=>setTimeout(clearFullResetModeAfterFirstSave,0),true);
  new MutationObserver(()=>{if(isFreshStartMode())protectAgainstHardcodedPlanningDefault()}).observe(document.body,{childList:true,subtree:true});
  if(resetLandingPending)window.addEventListener('pageshow',scrollResetLandingToTop,{once:true});
  window.addEventListener('flt:modules-loaded',()=>{applyFreshStart();mount();protectAgainstHardcodedPlanningDefault();neutralizeFirstRunControls();setTimeout(neutralizeFirstRunControls,650);applyResetLanding()},{once:true});
})();
