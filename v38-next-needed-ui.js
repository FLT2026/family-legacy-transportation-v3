(() => {
  'use strict';
  if(typeof document==='undefined'||window.FLTNextNeededUI)return;

  const style=document.createElement('style');
  style.id='v38-next-needed-style';
  style.textContent=`
    .v38-next-needed{position:relative!important;border:3px solid #d4d72f!important;background:#fffbd6!important;box-shadow:0 0 0 3px rgba(212,215,47,.22)!important}
    .v38-next-needed::before{content:'NEXT INFORMATION NEEDED';display:inline-block;margin:0 0 8px 0;background:#d4d72f;color:#173f39;font-size:10px;font-weight:900;letter-spacing:.04em;padding:5px 8px;border-radius:999px}
  `;
  document.head.appendChild(style);

  const clear=()=>document.querySelectorAll('.v38-next-needed').forEach(el=>el.classList.remove('v38-next-needed'));
  const isVisible=el=>Boolean(el&&el.offsetParent!==null);
  const pendingText=text=>/^(PENDING|INCOMPLETE|MORE INFORMATION REQUIRED|DO NOT DISPATCH)$/i.test(String(text||'').trim());
  const automatedOnly=el=>Boolean(el?.closest?.('[data-v38-automated-only="true"]'));

  function actionableRow(el,root){
    const granular=el.closest('.metric-row,tr,.choice,li,.notice');
    if(granular&&root.contains(granular))return granular;

    let node=el.parentElement;
    while(node&&node!==root){
      if(node.classList?.contains('section-head'))return null;
      if(node.children.length>1&&!node.classList?.contains('panel'))return node;
      node=node.parentElement;
    }
    return null;
  }

  function summaryRow(el,root){
    const preferred=el.closest('.panel,.section-head');
    if(preferred&&root.contains(preferred))return preferred;
    return el.parentElement||el;
  }

  function apply(){
    clear();
    const active=document.querySelector('.view.active');
    if(!active)return;

    const candidates=[...active.querySelectorAll('*')].filter(el=>isVisible(el)&&el.children.length===0&&!automatedOnly(el)&&pendingText(el.textContent));
    if(!candidates.length)return;

    for(const candidate of candidates){
      const target=actionableRow(candidate,active);
      if(target&&!automatedOnly(target)){
        target.classList.add('v38-next-needed');
        return;
      }
    }

    const fallback=summaryRow(candidates[0],active);
    if(fallback&&!automatedOnly(fallback))fallback.classList.add('v38-next-needed');
  }

  let timer=null;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,80)};
  document.addEventListener('click',schedule,true);
  document.addEventListener('change',schedule,true);
  document.addEventListener('submit',schedule,true);
  window.addEventListener('flt:modules-loaded',schedule);
  window.addEventListener('flt:workflow-state-changed',schedule);
  apply();
  setTimeout(apply,250);

  window.FLTNextNeededUI={apply};
})();
