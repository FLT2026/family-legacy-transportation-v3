(() => {
  const loadScript=(src,next)=>{
    const script=document.createElement('script');
    script.src=src;
    script.charset='utf-8';
    script.async=false;
    if(next)script.addEventListener('load',next,{once:true});
    script.addEventListener('error',()=>console.error('Unable to load Commercial Command module:',src),{once:true});
    document.body.appendChild(script);
  };
  loadScript('v36-date-utils.js?v=20260903d',()=>loadScript('v38-assignment-integrity.js?v=20260908a',()=>loadScript('fleet-core.js?v=20260906a',()=>loadScript('v35-guided-workflow.js?v=20260904f',()=>loadScript('v35-fleet-master.js?v=20260904c',()=>loadScript('v35-proposed-load.js?v=20260906b',()=>loadScript('v35-data-controls.js?v=20260906a',()=>loadScript('v36-actual-trip.js?v=20260906a',()=>loadScript('v37-financial-close.js?v=20260908d',()=>loadScript('v37-itemized-invoice.js?v=20260908a',()=>loadScript('v37-payments-receivables.js?v=20260908b',()=>loadScript('v37-double-entry-ledger.js?v=20260908a',()=>loadScript('v38-assignment-ui.js?v=20260908a'))))))))))))));
})();
