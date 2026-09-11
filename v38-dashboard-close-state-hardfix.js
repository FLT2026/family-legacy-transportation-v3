(() => {
  'use strict';
  if(typeof document==='undefined'||window.FLTDashboardCloseState)return;

  const readLoads=()=>{
    try{if(typeof store!=='undefined'&&Array.isArray(store.loads))return store.loads}catch(error){}
    try{const loads=JSON.parse(localStorage.getItem('flt-v32-loads')||'[]');return Array.isArray(loads)?loads:[]}catch(error){return[]}
  };
  const financiallyClosed=load=>String(load?.financialClose?.status||'').trim().toLowerCase()==='closed'&&Boolean(load?.financialClose?.snapshot);
  const revenue=load=>Number(load?.actualRevenue??load?.revenue??0)||0;
  const moneyValue=value=>'$'+Number(value||0).toLocaleString(undefined,{maximumFractionDigits:0});

  function apply(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return;
    const loads=readLoads();
    const active=loads.filter(load=>!financiallyClosed(load));
    const openCount=active.length;
    const activeRevenue=active.reduce((sum,load)=>sum+revenue(load),0);

    const openValue=document.getElementById('open-loads');
    if(openValue)openValue.textContent=String(openCount);
    const stats=dashboard.querySelectorAll('.grid.stats .stat');
    const openTrend=stats[0]?.querySelector('.trend');
    if(openTrend)openTrend.textContent=openCount?`${openCount} active ${openCount===1?'load':'loads'}`:'No active loads';
    const revenueValue=stats[1]?.querySelector('.value');
    const revenueTrend=stats[1]?.querySelector('.trend');
    if(revenueValue)revenueValue.textContent=moneyValue(activeRevenue);
    if(revenueTrend)revenueTrend.textContent=activeRevenue?'Active load revenue':'No active revenue';

    dashboard.querySelectorAll('#load-table tr[data-load-id]').forEach(row=>{
      const load=loads.find(item=>item?.id===row.dataset.loadId);
      if(!load)return;
      const status=row.querySelector('td:nth-child(3) .tag');
      if(!status)return;
      if(financiallyClosed(load)){
        status.textContent='Closed';
        status.className='tag';
      }
    });
  }

  if(typeof renderDashboard==='function'){
    const prior=renderDashboard;
    renderDashboard=function(){const result=prior.apply(this,arguments);apply();return result};
  }
  window.addEventListener('flt:workflow-state-changed',()=>setTimeout(apply,0));
  window.addEventListener('flt:modules-loaded',()=>setTimeout(apply,0));
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="dashboard"],[data-view-jump="dashboard"]'))setTimeout(apply,0)},true);
  apply();
  window.FLTDashboardCloseState={apply,financiallyClosed};
})();
