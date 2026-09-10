(() => {
  if(typeof document==='undefined')return;
  const nav=document.getElementById('nav');
  if(!nav)return;
  const decisionNav=nav.querySelector('[data-view="intelligence"]');
  const loadNav=nav.querySelector('[data-view="load"]');
  const financeNav=nav.querySelector('[data-view="finance"]');
  const testNav=nav.querySelector('[data-view="test"]');
  if(!decisionNav||!loadNav)return;

  const style=document.createElement('style');
  style.id='v38-nav-next-hardfix-style';
  style.textContent=`
    #nav button[data-v38-hard-next="true"]{
      background:#214f48!important;
      color:#fff!important;
      border-left:6px solid #d4d72f!important;
      box-shadow:inset 0 0 0 2px rgba(212,215,47,.88),0 0 0 2px rgba(212,215,47,.3)!important;
    }
    #nav button[data-v38-hard-next="true"] .nav-label{font-weight:900!important}
    #nav button[data-v38-hard-next="true"]::after{
      content:'NEXT';margin-left:auto;background:#d4d72f;color:#173f39;
      font-size:9px;font-weight:900;padding:4px 7px;border-radius:999px;
    }
  `;
  document.head.appendChild(style);

  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(error){return fallback}};
  const fiveZip=value=>/^\d{5}(?:-\d{4})?$/.test(String(value||'').trim());
  const acceptedProposalReady=()=>{const p=read('flt-v38-accepted-proposal',null);return Boolean(p&&fiveZip(p.pickupZip)&&fiveZip(p.deliveryZip)&&Number(p.offer)>0)};
  const acceptedDecisionReady=()=>read('flt-v35-last-decision',null)?.decision==='ACCEPT LOAD';
  const setupPrerequisitePending=()=>{
    if(localStorage.getItem('commercial-command-fresh-start')==='1')return true;
    try{return Boolean(window.FLTNavigationPrerequisitesHardfix?.prerequisite?.())}catch(error){return false}
  };
  const currentLoad=()=>{try{return typeof current==='function'?current():null}catch(error){return null}};
  const financiallyClosed=()=>currentLoad()?.financialClose?.status==='Closed';

  let applying=false;
  function applyHardNext(){
    if(applying)return;
    applying=true;
    try{
      [decisionNav,loadNav,financeNav,testNav].filter(Boolean).forEach(button=>button.removeAttribute('data-v38-hard-next'));

      // A financially closed load has finished Finance & Ledger. The only NEXT
      // marker now belongs on the V3.8 Test Gate.
      if(financiallyClosed()){
        testNav?.setAttribute('data-v38-hard-next','true');
        return;
      }

      if(setupPrerequisitePending())return;
      const active=nav.querySelector('button.active')?.dataset.view||'';
      if(active==='dashboard'){
        decisionNav.setAttribute('data-v38-hard-next','true');
      }else if(active==='intelligence'){
        if(acceptedDecisionReady()&&acceptedProposalReady())loadNav.setAttribute('data-v38-hard-next','true');
      }else if(active!=='load'&&!acceptedProposalReady()){
        decisionNav.setAttribute('data-v38-hard-next','true');
      }
    }finally{
      applying=false;
    }
  }

  const observer=new MutationObserver(()=>queueMicrotask(applyHardNext));
  observer.observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(applyHardNext,80),true);
  window.addEventListener('storage',applyHardNext);
  window.addEventListener('flt:modules-loaded',applyHardNext);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyHardNext()});
  window.FLTNavNextHardfix={apply:applyHardNext,financiallyClosed};
  applyHardNext();
  setTimeout(applyHardNext,50);
  setTimeout(applyHardNext,250);
})();