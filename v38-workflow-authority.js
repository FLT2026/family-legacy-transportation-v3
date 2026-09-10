(() => {
  'use strict';
  if(typeof document==='undefined'||window.FLTWorkflowAuthority)return;
  const nav=document.getElementById('nav');
  if(!nav)return;

  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(error){return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){return false}};
  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const fiveZip=value=>{const match=String(value||'').trim().match(/^(\d{5})(?:-\d{4})?$/);return match?match[1]:''};
  const notFuture=value=>{if(!value)return false;const d=new Date(String(value)+'T23:59:59');return Number.isFinite(d.getTime())&&d<=new Date()};
  const driverReady=x=>{if(x?.status!=='active'||!x.licenseState||!x.expiration)return false;const d=new Date(x.expiration+'T23:59:59');return Number.isFinite(d.getTime())&&d>=new Date()};
  const truckReady=x=>Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&notFuture(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.gcwr)>=Number(x.gvwr)&&Number(x.emptyWeight)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.frontGawr)>0&&Number(x.rearGawr)>0&&Number(x.frontGawr)+Number(x.rearGawr)>=Number(x.gvwr)&&Number(x.frontTireCapacity)>=Number(x.frontGawr)&&Number(x.rearTireCapacity)>=Number(x.rearGawr)&&Number(x.hitchCapacity)>0);
  const trailerReady=x=>Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&notFuture(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.emptyWeight)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.axleCapacity)>=Number(x.gvwr)&&Number(x.tireCapacity)>=Number(x.gvwr)&&Number(x.hitchCapacity)>=Number(x.gvwr));

  function businessReady(){
    const profile=read('flt-v34-business-profile',null),c=read('flt-v35-classification',null);
    return Boolean(profile&&c&&c.insuranceStatus==='verified'&&c.authorityStatus==='verified'&&c.equipmentStatus==='verified'&&c.driverOk===true);
  }
  function fleetReady(){
    const fleet=read('flt-v35-fleet',{drivers:[],trucks:[],trailers:[]});
    const current=read('flt-v38-current-working-rig',{});
    const currentDriver=(fleet.drivers||[]).find(item=>item.id===current.driverId&&item.status==='active');
    const currentTruck=(fleet.trucks||[]).find(item=>item.id===current.truckId&&item.status==='active');
    const currentTrailer=(fleet.trailers||[]).find(item=>item.id===current.trailerId&&item.status==='active');
    if(currentDriver&&currentTruck&&currentTrailer)return true;
    const regular=read('flt-v36-regular-rig',read('flt-v35-default-fleet-selection',{}))||{};
    const regularDriver=(fleet.drivers||[]).find(item=>item.id===regular.driverId&&item.status==='active');
    const regularTruck=(fleet.trucks||[]).find(item=>item.id===regular.truckId&&item.status==='active');
    const regularTrailer=(fleet.trailers||[]).find(item=>item.id===regular.trailerId&&item.status==='active');
    if(regularDriver&&regularTruck&&regularTrailer)return true;
    return Boolean((fleet.drivers||[]).some(driverReady)&&(fleet.trucks||[]).some(truckReady)&&(fleet.trailers||[]).some(trailerReady));
  }
  function acceptedDecision(){return read('flt-v35-last-decision',null)?.decision==='ACCEPT LOAD'}
  function acceptedProposal(){return read('flt-v38-accepted-proposal',null)}
  function acceptedProposalReady(){const p=acceptedProposal();return Boolean(p&&fiveZip(p.pickupZip)&&fiveZip(p.deliveryZip)&&Number(p.offer)>0&&Number(p.loadedMiles)>=0&&Number(p.deadheadMiles)>=0)}
  function hasRealLoad(){
    try{if(typeof store!=='undefined'&&Array.isArray(store.loads))return store.loads.some(load=>load&&load.id&&!String(load.id).startsWith('DEMO-'))}catch(error){}
    const loads=read('flt-v32-loads',[]);return Array.isArray(loads)&&loads.some(load=>load&&load.id&&!String(load.id).startsWith('DEMO-'));
  }
  function allLoads(){
    try{if(typeof store!=='undefined'&&Array.isArray(store.loads))return store.loads}catch(error){}
    const loads=read('flt-v32-loads',[]);return Array.isArray(loads)?loads:[];
  }
  function selectedLoad(){
    try{if(typeof current==='function'){const load=current();if(load)return load}}catch(error){}
    const loads=allLoads();
    const selectedIds=[localStorage.getItem('flt-selected-load-id'),localStorage.getItem('flt-v32-loads-selected')].filter(Boolean);
    for(const selected of selectedIds){const found=loads.find(x=>x?.id===selected);if(found)return found}
    const real=loads.filter(x=>x?.id&&!String(x.id).startsWith('DEMO-'));
    return real.at(-1)||loads.at(-1)||null;
  }
  function financiallyClosed(load){
    const status=String(load?.financialClose?.status||'').trim().toLowerCase();
    return status==='closed'&&Boolean(load?.financialClose?.snapshot);
  }
  function nextView(){
    if(!businessReady())return'business-setup';
    if(!fleetReady())return'fleet';
    if(!acceptedDecision())return'intelligence';
    if(!hasRealLoad())return'load';
    const load=selectedLoad();
    if(financiallyClosed(load))return'test';
    if(load&&!load.pickupProof?.signature)return'pickup';
    if(load?.pickupProof?.signature&&!load.deliveryProof?.signature)return'delivery';
    if(load?.deliveryProof?.signature)return'finance';
    return null;
  }

  const style=document.createElement('style');
  style.id='v38-workflow-authority-style';
  style.textContent=`
    #nav button.nav-required::after,#nav button.v38-nav-next::after,#nav button[data-v38-hard-next="true"]::after{display:none!important;content:none!important}
    #nav button[data-v38-authoritative-next="true"]{background:#214f48!important;color:#fff!important;border-left:6px solid #d4d72f!important;box-shadow:inset 0 0 0 2px rgba(212,215,47,.88),0 0 0 2px rgba(212,215,47,.3)!important;opacity:1!important}
    #nav button[data-v38-authoritative-next="true"] .nav-label{font-weight:900!important}
    #nav button[data-v38-authoritative-next="true"]::after{display:inline-block!important;content:'NEXT'!important;margin-left:auto;background:#d4d72f;color:#173f39;font-size:9px;font-weight:900;padding:4px 7px;border-radius:999px}
    .v38-authority-missing{border:4px solid #ffea00!important;background:#fff8a8!important;box-shadow:0 0 0 5px rgba(255,234,0,.32)!important}
    .v38-authority-wrap{position:relative!important}.v38-authority-wrap::before{content:'NEXT';position:absolute;right:8px;top:-15px;z-index:61;background:#ffea00;color:#102f2b;border:2px solid #102f2b;font-size:10px;font-weight:900;padding:4px 8px;border-radius:999px}
  `;
  document.head.appendChild(style);

  const nextLabels={'business-setup':'Business Setup',fleet:'Drivers & Equipment',intelligence:'Evaluate Proposed Load',load:'Complete Accepted Load',pickup:'Pickup + E-Signature',delivery:'Delivery + E-Signature',finance:'Finance & Ledger',test:'V3.8 Test Gate'};

  function hideIntegrityBadge(){
    document.querySelectorAll('body *').forEach(el=>{
      if(el.children.length===0&&/V3\.8\s*[·-]\s*OPERATIONAL INTEGRITY/i.test((el.textContent||'').trim())&&el.style.display!=='none')el.style.display='none';
    });
  }
  function clearLegacyNext(){nav.querySelectorAll('button[data-view]').forEach(button=>{button.classList.remove('nav-required','v38-nav-next');button.removeAttribute('data-v38-hard-next');button.removeAttribute('data-v38-authoritative-next')})}
  function applyNav(){clearLegacyNext();const view=nextView(),button=view?nav.querySelector(`[data-view="${view}"]`):null;if(button)button.setAttribute('data-v38-authoritative-next','true')}
  function syncDashboardCallToAction(){
    const view=nextView();if(!view)return;
    const label=nextLabels[view]||'Continue';
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const hero=dashboard.querySelector('.hero');
    const buttons=[...dashboard.querySelectorAll('button,.btn')];
    const button=buttons.find(el=>/Start Business Setup|Continue to|Start Drivers|Start .*Setup/i.test((el.textContent||'').trim()))||hero?.querySelector('button,.btn');
    const title=hero?.querySelector('h2');
    const detail=hero?.querySelector('.subtle,p');
    const buttonText='Continue to '+label+' →';
    const titleText='Commercial Command is ready for the next step.';
    const detailText='Next required step: '+label+'. Commercial Command will keep one NEXT marker on the correct workflow step.';
    if(button){
      if(button.textContent!==buttonText)button.textContent=buttonText;
      if(button.dataset.viewJump!==view)button.dataset.viewJump=view;
      if(button.dataset.v38AuthorityBound!==view){
        button.dataset.v38AuthorityBound=view;
        button.onclick=event=>{event.preventDefault();nav.querySelector(`[data-view="${view}"]`)?.click()};
      }
    }
    if(title&&title.textContent!==titleText)title.textContent=titleText;
    if(detail&&detail.textContent!==detailText)detail.textContent=detailText;
  }

  function clearFieldGuide(){document.querySelectorAll('.v38-authority-missing').forEach(el=>el.classList.remove('v38-authority-missing'));document.querySelectorAll('.v38-authority-wrap').forEach(el=>el.classList.remove('v38-authority-wrap'))}
  function visible(control){return Boolean(control&&!control.disabled&&!control.readOnly&&control.offsetParent!==null)}
  function mark(control){if(!visible(control))return false;control.classList.add('v38-authority-missing');(control.closest('.field')||control.closest('.choice')||control.parentElement)?.classList.add('v38-authority-wrap');return true}
  function firstBusinessMissing(){
    const profile=read('flt-v34-business-profile',null),c=read('flt-v35-classification',null);
    if(!profile){for(const id of ['business-legal-name','business-ein']){const control=document.getElementById(id);if(visible(control)&&!String(control.value||'').trim())return control}return document.getElementById('business-profile-save')}
    if(!c){const form=document.getElementById('v35-classification-form');return [...(form?.querySelectorAll('select[required],input[required]')||[])].find(x=>visible(x)&&!String(x.value||'').trim())||form?.querySelector('button[type="submit"],button:not([type])')}
    if(c.insuranceStatus!=='verified')return document.getElementById('v35-insurance-ok');
    if(c.authorityStatus!=='verified')return document.getElementById('v35-authority-ok');
    if(c.equipmentStatus!=='verified')return document.getElementById('v35-equipment-ok');
    if(c.driverOk!==true)return document.getElementById('v35-driver-ok');
    return null;
  }
  function firstGenericMissing(root){if(!root)return null;return [...root.querySelectorAll('input[required],select[required],textarea[required],[data-v38-required="true"]')].find(c=>visible(c)&&((c.type==='checkbox'||c.type==='radio')?!c.checked:!String(c.value||'').trim()))||null}
  function applyFieldGuide(){clearFieldGuide();const active=nav.querySelector('button.active')?.dataset.view||'',needed=nextView();if(active!==needed)return;let control=null;if(active==='business-setup')control=firstBusinessMissing();else control=firstGenericMissing(document.getElementById(active));if(control)mark(control)}

  function proposalFromDecisionScreen(){
    if(!acceptedDecision())return null;
    const get=id=>document.getElementById(id);
    const source=get('v38-quick-source')?.value||'',pickupZip=fiveZip(get('v38-quick-pickup-zip')?.value),deliveryZip=fiveZip(get('v38-quick-delivery-zip')?.value);
    if(!source||!pickupZip||!deliveryZip)return null;
    const d=read('flt-v35-last-decision',null)||{};
    return {source,sourceName:String(get('v38-quick-source-name')?.value||'').trim(),sourceReference:String(get('v38-quick-reference')?.value||'').trim(),pickupZip,deliveryZip,pickupPlace:String(get('v38-quick-pickup-place')?.textContent||'').trim(),deliveryPlace:String(get('v38-quick-delivery-place')?.textContent||'').trim(),loadedMiles:Number(get('v35-loaded-miles')?.value||0),deadheadMiles:Number(get('v35-deadhead-miles')?.value||0),offer:Number(get('v35-offer')?.value||0),cargoWeight:Number(get('v35-cargo-weight')?.value||0),averageMpg:Number(get('v35-mpg')?.value||0),fuelPrice:Number(get('v35-fuel-price')?.value||0),decision:d.decision,metrics:d.metrics||{},acceptedAt:new Date().toISOString()};
  }
  nav.addEventListener('click',event=>{const button=event.target.closest('button[data-view="load"]');if(!button||acceptedProposalReady())return;const proposal=proposalFromDecisionScreen();if(proposal){write('flt-v38-accepted-proposal',proposal);setTimeout(()=>window.FLTFastLoadWorkflow&&document.getElementById('load-form')&&window.dispatchEvent(new Event('flt:workflow-state-changed')),0)}},true);

  let scheduled=false,applying=false;
  function apply(){if(applying)return;applying=true;try{applyNav();syncDashboardCallToAction();applyFieldGuide()}finally{applying=false}}
  function schedule(delay=30){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;apply()},delay)}

  // Event-driven only: do not observe/rewrite the nav or Finance DOM continuously.
  // The previous MutationObservers + interval formed a feedback loop with legacy navigation code,
  // repeatedly changing the nav layout and making its scrollbar flash/jump.
  document.addEventListener('input',()=>schedule(30),true);
  document.addEventListener('change',()=>schedule(30),true);
  document.addEventListener('submit',()=>schedule(100),true);
  document.addEventListener('click',()=>schedule(100),true);
  window.addEventListener('storage',()=>schedule(50));
  window.addEventListener('flt:modules-loaded',()=>schedule(50));
  window.addEventListener('flt:workflow-state-changed',()=>schedule(50));
  window.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(50)});

  // Hide the floating integrity badge once after modules settle; never poll it.
  hideIntegrityBadge();
  setTimeout(hideIntegrityBadge,250);
  apply();
  setTimeout(apply,200);

  window.FLTWorkflowAuthority={apply,nextView,businessReady,fleetReady,acceptedDecision,acceptedProposalReady,hasRealLoad,selectedLoad,financiallyClosed,syncDashboardCallToAction};
})();