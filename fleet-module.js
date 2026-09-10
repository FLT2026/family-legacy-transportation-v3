(() => {
  const modules=[
    'v38-version-ui.js?v=20260908b',
    'v36-date-utils.js?v=20260903d',
    'v38-assignment-integrity.js?v=20260908b',
    'v38-weight-equipment-fit.js?v=20260908b',
    'v38-document-compliance.js?v=20260908b',
    'v38-pickup-delivery-integrity.js?v=20260908b',
    'fleet-core.js?v=20260906a',
    'v35-guided-workflow.js?v=20260908g',
    'v35-fleet-master.js?v=20260904c',
    'v35-proposed-load.js?v=20260906b',
    'v35-data-controls.js?v=20260906a',
    'v36-actual-trip.js?v=20260906a',
    'v37-financial-close.js?v=20260908d',
    'v37-itemized-invoice.js?v=20260908a',
    'v37-payments-receivables.js?v=20260908b',
    'v37-double-entry-ledger.js?v=20260908a',
    'v38-assignment-ui.js?v=20260908b',
    'v38-owner-operator-dispatch-hardfix.js?v=20260910a',
    'v38-weight-equipment-ui.js?v=20260908b',
    'v38-document-compliance-ui.js?v=20260908b',
    'v38-dispatch-control-page.js?v=20260910a',
    'v38-pickup-delivery-ui.js?v=20260908b',
    'v38-finance-pod-compat-hardfix.js?v=20260908a',
    'v38-test-gate-integrity-hardfix.js?v=20260908a',
    'v38-fast-load-workflow.js?v=20260908a',
    'v38-nav-next-hardfix.js?v=20260908a',
    'v38-process-training-hardfix.js?v=20260908a',
    'v38-proposed-load-layout-hardfix.js?v=20260908a',
    'v38-unit-affixes.js?v=20260908a',
    'v38-v36-autopopulate-hardfix.js?v=20260908a',
    'v38-navigation-prerequisites-hardfix.js?v=20260909a',
    'v38-test-data-reset.js?v=20260909a',
    'v38-current-rig-display-hardfix.js?v=20260909a',
    'v38-workflow-authority.js?v=20260910a'
  ];

  // HARD DEV CACHE RULE:
  // Every page refresh must execute the branch's current module files.
  // Codespaces/browser caches previously masked fixes even after git pull.
  // One page-load token is shared by every module so dependencies stay on
  // the same code generation while stale copies are never reused.
  const pageBuildToken=Date.now().toString(36);
  const freshSrc=src=>src+(src.includes('?')?'&':'?')+'devbuild='+pageBuildToken;

  const load=src=>new Promise(resolve=>{
    const script=document.createElement('script');
    script.src=freshSrc(src);
    script.charset='utf-8';
    script.async=false;
    script.dataset.commercialCommandModule=src.split('?')[0];
    script.addEventListener('load',()=>resolve({src,ok:true}),{once:true});
    script.addEventListener('error',()=>{console.error('Unable to load Commercial Command module:',src);resolve({src,ok:false})},{once:true});
    document.body.appendChild(script);
  });

  (async()=>{
    const results=[];
    for(const src of modules)results.push(await load(src));
    window.FLTModuleLoadStatus={pageBuildToken,results,allLoaded:results.every(item=>item.ok)};
    window.dispatchEvent(new CustomEvent('flt:modules-loaded',{detail:window.FLTModuleLoadStatus}));
  })();
})();