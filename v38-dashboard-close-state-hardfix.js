(() => {
  'use strict';
  const financiallyClosed=load=>String(load?.financialClose?.status||'').trim().toLowerCase()==='closed'&&Boolean(load?.financialClose?.snapshot);
  const revenue=load=>Number(load?.actualRevenue??load?.revenue??0)||0;
  const summarize=loads=>{
    const all=Array.isArray(loads)?loads:[];
    const active=all.filter(load=>!financiallyClosed(load));
    return {
      active,
      openLoads:active.length,
      revenueInMotion:active.reduce((sum,load)=>sum+revenue(load),0),
      pendingSignatures:active.filter(load=>!load?.pickupProof?.signature||!load?.deliveryProof?.signature).length
    };
  };
  const statusLabel=load=>financiallyClosed(load)?'Closed':load?.deliveryProof?'Delivered':load?.pickupProof?'In transit':'Open';

  if(typeof window!=='undefined'){
    const prior=window.FLTDashboardCloseState||{};
    if(prior.apply)return;
    window.FLTDashboardCloseState={...prior,financiallyClosed,summarize,statusLabel};
  }
  if(typeof document==='undefined')return;

  const readLoads=()=>{
    try{if(typeof store!=='undefined'&&Array.isArray(store.loads))return store.loads}catch(error){}
    try{const loads=JSON.parse(localStorage.getItem('flt-v32-loads')||'[]');return Array.isArray(loads)?loads:[]}catch(error){return[]}
  };
  const moneyValue=value=>'$'+Number(value||0).toLocaleString(undefined,{maximumFractionDigits:0});
  const todayLabel=()=>`Today, ${new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date())}`;

  function apply(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return;
    const loads=readLoads();
    const summary=summarize(loads);
    const stats=dashboard.querySelectorAll('.grid.stats .stat');

    const openValue=document.getElementById('open-loads');
    if(openValue)openValue.textContent=String(summary.openLoads);
    const openTrend=stats[0]?.querySelector('.trend');
    if(openTrend)openTrend.textContent=summary.openLoads?`${summary.openLoads} active ${summary.openLoads===1?'load':'loads'}`:'No active loads';

    const revenueValue=stats[1]?.querySelector('.value');
    const revenueTrend=stats[1]?.querySelector('.trend');
    if(revenueValue)revenueValue.textContent=moneyValue(summary.revenueInMotion);
    if(revenueTrend)revenueTrend.textContent=summary.revenueInMotion?'Active load revenue':'No active revenue';

    if(summary.openLoads===0){
      const utilizationValue=stats[2]?.querySelector('.value');
      const utilizationTrend=stats[2]?.querySelector('.trend');
      if(utilizationValue)utilizationValue.textContent='0%';
      if(utilizationTrend)utilizationTrend.textContent='Fleet available';
    }

    const pendingValue=document.getElementById('pending-count');
    const pendingTrend=stats[3]?.querySelector('.trend');
    if(pendingValue)pendingValue.textContent=String(summary.pendingSignatures);
    if(pendingTrend)pendingTrend.textContent=summary.pendingSignatures?'Signature action required':'No signatures pending';

    const pipelinePanel=document.getElementById('load-table')?.closest('.panel');
    const pipelineDate=pipelinePanel?.querySelector('.section-head .subtle');
    if(pipelineDate)pipelineDate.textContent=todayLabel();

    dashboard.querySelectorAll('#load-table tr[data-load-id]').forEach(row=>{
      const load=loads.find(item=>item?.id===row.dataset.loadId);
      if(!load)return;
      const status=row.querySelector('td:nth-child(3) .tag');
      if(!status)return;
      status.textContent=statusLabel(load);
      status.className=financiallyClosed(load)?'tag':(load.deliveryProof?'tag':'tag orange');
    });
  }

  if(typeof renderDashboard==='function'){
    const prior=renderDashboard;
    renderDashboard=function(){const result=prior.apply(this,arguments);apply();return result};
  }
  window.addEventListener('flt:workflow-state-changed',()=>setTimeout(apply,0));
  window.addEventListener('flt:modules-loaded',()=>setTimeout(apply,0));
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="dashboard"],[data-view-jump="dashboard"]'))setTimeout(apply,0)},true);
  window.FLTDashboardCloseState.apply=apply;
  apply();
})();
