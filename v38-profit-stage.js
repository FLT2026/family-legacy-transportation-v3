(() => {
  'use strict';
  if(typeof window==='undefined'||window.FLTProfitStage)return;

  const amount=value=>Number.isFinite(Number(value))?Number(value):0;
  const expensesOf=load=>Array.isArray(load?.expenses)?load.expenses:[];

  // Classifies how far a load's profit figure can be trusted. Formulas are unchanged
  // (recorded revenue minus recorded expenses); only the label reflects completeness.
  function stage(load){
    const close=load?.financialClose;
    if(String(close?.status||'')==='Closed'&&close?.snapshot)return{key:'final',missing:[]};
    const records=Array.isArray(load?.actualTripRecords)?load.actualTripRecords:[];
    const trip=records.at(-1)||null,expenses=expensesOf(load),missing=[];
    if(!(trip&&amount(trip.actualMiles)>0&&amount(trip.actualGallons)>0))missing.push('Actual Trip mileage and fuel snapshot');
    if(trip&&!trip.truckId)missing.push('Verified truck on the Actual Trip snapshot');
    if(!(expenses.some(item=>/toll/i.test(String(item?.category||''))&&amount(item.amount)>0)||trip?.noTollsIncurred))missing.push('Toll status');
    if(!expenses.some(item=>amount(item?.amount)>0))missing.push('Recorded operating expenses');
    if(!expenses.some(item=>item?.receipt))missing.push('Receipt evidence');
    return missing.length?{key:'provisional',missing}:{key:'actual',missing:[]};
  }

  const LABELS={
    provisional:{title:'Provisional profit',row:'Provisional profit (recorded expenses only)',stat:'Provisional profit',trend:'Provisional — unrecorded costs are excluded'},
    actual:{title:'Actual profit',row:'Actual profit (actual trip costs recorded)',stat:'Actual profit',trend:'Actual costs recorded — not financially closed'},
    final:{title:'Final earned profit',row:'Final earned profit',stat:'Final earned profit',trend:'Financially closed — locked snapshot'}
  };
  function labels(load){const result=stage(load);return{...LABELS[result.key],key:result.key,missing:result.missing}}

  function receivableLabel(load){
    const invoice=load?.invoice;
    if(!invoice?.number)return'Unbilled revenue';
    if(invoice.status==='Finalized'||invoice.finalizedAt)return'Receivable balance';
    return'Unbilled revenue (invoice is a draft)';
  }

  function apply(){
    if(typeof current!=='function')return;
    const load=current();if(!load)return;
    const text=labels(load),set=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value};
    const card=document.querySelector('#finance > .grid.two > .panel:nth-child(2)');
    if(card){
      set(card.querySelector('h2'),text.title);
      const rows=card.querySelectorAll('.metric-row');
      set(rows[3]?.querySelector('span'),text.row);
      const variance=rows[2]?.querySelector('strong');
      if(variance&&text.key==='provisional'&&/estimate$/.test(variance.textContent||''))variance.textContent+=' (provisional — actual costs incomplete)';
      if(variance&&text.key==='provisional')variance.style.color='var(--muted)';
      card.dataset.profitStage=text.key;
      card.title=text.missing.length?'Still needed: '+text.missing.join(', '):'';
    }
    const profitStat=document.querySelector('#finance .stat:nth-child(3)');
    if(profitStat){
      set(profitStat.querySelector('.label'),text.stat);
      set(profitStat.querySelector('.trend'),text.trend);
      profitStat.dataset.profitStage=text.key;
    }
    set(document.querySelector('#finance .stat:nth-child(4) .label'),receivableLabel(load));
  }

  window.FLTProfitStage={stage,labels,receivableLabel,apply};
  if(typeof renderFinance==='function'){const prior=renderFinance;renderFinance=()=>{prior();apply()}}
  apply();
})();
