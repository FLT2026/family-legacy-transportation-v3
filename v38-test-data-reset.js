(() => {
  'use strict';
  if(window.FLTTestDataReset)return;

  const freshStartKey='commercial-command-fresh-start';
  const isCommercialCommandKey=key=>/^flt-/i.test(String(key||''));
  const matchingKeys=storage=>{
    const keys=[];
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(isCommercialCommandKey(key))keys.push(key);
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
    const first=globalThis.confirm?.('Reset Commercial Command TEST DATA?\n\nThis will delete '+count+' Commercial Command browser data item'+(count===1?'':'s')+' including loads, fleet records, invoices, payments, documents, audit/test records, saved addresses, and acceptance history.\n\nGitHub code and unrelated browser/site data will NOT be deleted.');
    if(!first)return false;
    const second=globalThis.confirm?.('FINAL CONFIRMATION\n\nStart a completely fresh Family Legacy Commercial Command end-to-end test?\n\nThis cannot restore the browser test records after they are cleared.');
    if(!second)return false;
    reset();location.reload();return true;
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
    const nav=document.getElementById('nav');if(!nav)return;
    nav.querySelectorAll('.v38-nav-next').forEach(item=>item.classList.remove('v38-nav-next'));
    nav.querySelector('[data-view="business-setup"]')?.classList.add('v38-nav-next');
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
    if(heroRoute)heroRoute.textContent='Start with Business Setup, then Drivers & Equipment, then evaluate the first proposed load.';
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
    panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Acceptance testing</div><h2>Fresh End-to-End Test</h2><p class="subtle" style="margin-top:5px">Clear only Family Legacy Commercial Command browser test data, then restart at Dashboard. GitHub code is untouched.</p></div><span class="tag orange">TEST DATA ONLY</span></div><div class="notice" style="margin-top:12px"><strong>Use this only when intentionally starting a fresh system test.</strong><br>Driver, truck, trailer, loads, invoices, payments, documents, saved addresses, and Commercial Command audit/test records stored in this browser will be cleared.</div><div class="form-actions" style="margin-top:14px"><button class="btn danger" id="v38-reset-test-data" type="button">Reset Commercial Command Test Data</button></div>';
    business.appendChild(panel);document.getElementById('v38-reset-test-data')?.addEventListener('click',confirmReset);
  }

  window.FLTTestDataReset={preview,reset,confirmReset,mount,isCommercialCommandKey,applyFreshStart,isFreshStartMode,clearFreshStartMode};
  applyFreshStart();watchForFirstRealLoad();mount();
  new MutationObserver(()=>{if(isFreshStartMode())protectAgainstHardcodedPlanningDefault()}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('flt:modules-loaded',()=>{applyFreshStart();mount();protectAgainstHardcodedPlanningDefault()},{once:true});
})();
