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
    if(load.pod === true) return false;
    // V3.7 finance used the legacy `pod` flag. V3.8 replaced that flag with
    // Load-ID delivery integrity. Keep the legacy flag synchronized so invoice
    // finalization and financial-close gates consume the verified V3.8 result.
    load.pod = true;
    return true;
  }

  function syncAll(){
    const loads = Array.isArray(globalThis.store?.loads) ? globalThis.store.loads : [];
    let changed = false;
    loads.forEach(load => { if(syncLoad(load)) changed = true; });
    if(typeof globalThis.current === 'function'){
      const load = globalThis.current();
      if(syncLoad(load)) changed = true;
    }
    if(changed && typeof globalThis.persist === 'function') globalThis.persist();
    return changed;
  }

  // Backfill loads that already completed V3.8 delivery integrity before this
  // compatibility fix was deployed.
  syncAll();

  // Run before the existing V3.7 finalize handler so a verified V3.8 POD is
  // recognized on the first click, without asking the operator to redo delivery.
  document.addEventListener('click',event=>{
    const target = event.target?.closest?.('#v37-finalize-invoice');
    if(!target) return;
    syncAll();
  },true);

  // Keep finance screens current when navigation/rendering happens after load.
  window.addEventListener('flt:modules-loaded',()=>{
    const changed = syncAll();
    if(changed && typeof globalThis.renderFinance === 'function') globalThis.renderFinance();
  },{once:true});

  window.FLTV38FinancePodCompatibility={deliveryPassed,syncLoad,syncAll};
})();
