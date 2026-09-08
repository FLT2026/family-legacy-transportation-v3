(() => {
  function deliveryPassed(load){
    try{
      return Boolean(load && window.FLTPickupDeliveryIntegrity?.delivery?.(load)?.pass);
    }catch(error){
      console.warn('Unable to evaluate V3.8 delivery integrity for finance compatibility.',error);
      return false;
    }
  }

  function syncLoad(load){
    if(!load || !deliveryPassed(load)) return false;
    let changed=false;
    // V3.7 finance requires the legacy POD flag. V3.8 delivery integrity is the
    // authoritative gate, so mirror a verified V3.8 delivery into that flag.
    if(load.pod !== true){load.pod=true;changed=true;}
    // Keep a positive legacy completion marker for older financial-close logic.
    if(load.deliveryComplete !== true){load.deliveryComplete=true;changed=true;}
    return changed;
  }

  function getLoads(){
    try{
      if(typeof store !== 'undefined' && Array.isArray(store?.loads)) return store.loads;
    }catch(_error){}
    return [];
  }

  function getCurrent(){
    try{
      return typeof current === 'function' ? current() : null;
    }catch(_error){return null;}
  }

  function save(){
    try{if(typeof persist === 'function')persist();}catch(error){console.warn('Unable to persist V3.8 finance POD compatibility.',error);}
  }

  function syncAll(){
    const loads=getLoads();
    let changed=false;
    loads.forEach(load=>{if(syncLoad(load))changed=true;});
    const selected=getCurrent();
    if(syncLoad(selected))changed=true;
    if(changed)save();
    return changed;
  }

  // Backfill loads that completed V3.8 delivery integrity before this bridge.
  syncAll();

  // Capture the click before the V3.7 invoice handler evaluates its legacy POD
  // requirement so the first Finalize Invoice click succeeds.
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#v37-finalize-invoice');
    if(!target)return;
    syncAll();
  },true);

  // Navigation and render paths can surface finance after delivery without a
  // full page refresh. Re-sync every time the finance area is entered/clicked.
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-route="finance"],#nav-finance,#finance'))syncAll();
  },true);

  window.addEventListener('flt:modules-loaded',()=>{
    const changed=syncAll();
    try{if(changed && typeof renderFinance==='function')renderFinance();}catch(_error){}
  },{once:true});

  window.FLTV38FinancePodCompatibility={deliveryPassed,syncLoad,syncAll};
})();
