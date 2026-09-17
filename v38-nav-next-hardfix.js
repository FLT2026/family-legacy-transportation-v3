(() => {
  'use strict';
  if(typeof document==='undefined')return;
  const nav=document.getElementById('nav');
  if(!nav)return;

  /*
   * Compatibility shim only.
   *
   * V3.8 now has one source of truth for workflow progression:
   * window.FLTWorkflowAuthority. This older hard-fix previously calculated its
   * own NEXT destination and could re-apply a yellow outline to V3.8 Test Gate
   * after the authoritative workflow had already declared the load complete.
   *
   * Never choose a NEXT step here again. Clear any legacy marker and, when the
   * authoritative controller is available, ask it to render the current state.
   */
  function clearLegacyHardNext(){
    nav.querySelectorAll('button[data-v38-hard-next="true"]').forEach(button=>{
      button.removeAttribute('data-v38-hard-next');
    });
  }

  let scheduled=false;
  function sync(){
    clearLegacyHardNext();
    if(window.FLTWorkflowAuthority?.apply){
      window.FLTWorkflowAuthority.apply();
    }
  }
  function schedule(delay=0){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{
      scheduled=false;
      sync();
    },delay);
  }

  document.addEventListener('click',()=>schedule(80),true);
  window.addEventListener('storage',()=>schedule(25));
  window.addEventListener('flt:modules-loaded',()=>schedule(0));
  window.addEventListener('flt:workflow-state-changed',()=>schedule(0));
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)schedule(25);
  });

  clearLegacyHardNext();
  setTimeout(clearLegacyHardNext,50);
  setTimeout(sync,250);

  window.FLTNavNextHardfix={apply:sync};
})();
