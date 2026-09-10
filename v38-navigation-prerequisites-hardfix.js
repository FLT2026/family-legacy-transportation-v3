(() => {
  if(typeof document==='undefined'||window.FLTNavigationPrerequisitesHardfix)return;
  const nav=document.getElementById('nav');
  if(!nav)return;

  const dashboardKey='flt-v38-dashboard-reviewed';
  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(error){return fallback}};
  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const notFuture=value=>{if(!value)return false;const d=new Date(String(value)+'T23:59:59');return Number.isFinite(d.getTime())&&d<=new Date()};
  const driverReady=x=>{if(x?.status!=='active'||!x.licenseState||!x.expiration)return false;const d=new Date(x.expiration+'T23:59:59');return Number.isFinite(d.getTime())&&d>=new Date()};
  const truckReady=x=>Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&notFuture(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.gcwr)>=Number(x.gvwr)&&Number(x.emptyWeight)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.frontGawr)>0&&Number(x.rearGawr)>0&&Number(x.frontGawr)+Number(x.rearGawr)>=Number(x.gvwr)&&Number(x.frontTireCapacity)>=Number(x.frontGawr)&&Number(x.rearTireCapacity)>=Number(x.rearGawr)&&Number(x.hitchCapacity)>0);
  const trailerReady=x=>Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&notFuture(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.emptyWeight)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.axleCapacity)>=Number(x.gvwr)&&Number(x.tireCapacity)>=Number(x.gvwr)&&Number(x.hitchCapacity)>=Number(x.gvwr));

  function businessReady(){
    const profile=readJson('flt-v34-business-profile',null),classification=readJson('flt-v35-classification',null);
    if(!profile||!classification)return false;
    return ['insurance','authority','equipment'].every(key=>['pending','verified'].includes(classification?.[key+'Status']));
  }
  function fleetReady(){
    const fleet=readJson('flt-v35-fleet',{drivers:[],trucks:[],trailers:[]});
    return Boolean((fleet.drivers||[]).some(driverReady)&&(fleet.trucks||[]).some(truckReady)&&(fleet.trailers||[]).some(trailerReady));
  }
  function prerequisite(){
    if(localStorage.getItem(dashboardKey)!=='true')return{view:'dashboard',label:'Dashboard'};
    if(!businessReady())return{view:'business-setup',label:'Business Setup'};
    if(!fleetReady())return{view:'fleet',label:'Drivers & Equipment'};
    return null;
  }
  function hasRealLoad(){
    try{if(typeof store!=='undefined'&&Array.isArray(store.loads))return store.loads.some(load=>load&&load.id&&!String(load.id).startsWith('DEMO-'))}catch(error){}
    const loads=readJson('flt-v32-loads',[]);
    return Array.isArray(loads)&&loads.some(load=>load&&load.id&&!String(load.id).startsWith('DEMO-'));
  }
  function blockedView(view){
    // Navigation should guide, not trap. Readiness is enforced by the actual workflow gates.
    // Users must always be able to move among setup, fleet, dispatch, and proposed-load screens.
    if(['dashboard','business-setup','fleet','dispatch-control','intelligence'].includes(view))return false;
    if(!hasRealLoad()&&['load','pickup','delivery','finance','test'].includes(view))return true;
    return false;
  }
  function targetView(){const required=prerequisite();return required?.view||(!hasRealLoad()?'intelligence':null)}
  function clearTraining(){
    document.getElementById('v38-hard-training-banner')?.remove();
    document.querySelectorAll('.v38-hard-field-next,.v38-hard-action-next').forEach(el=>el.classList.remove('v38-hard-field-next','v38-hard-action-next'));
    document.querySelectorAll('.v38-hard-field-wrap').forEach(el=>el.classList.remove('v38-hard-field-wrap'));
  }
  function apply(){
    const required=prerequisite();
    nav.querySelectorAll('button[data-view]').forEach(button=>{
      const view=button.dataset.view,isRequired=Boolean(required&&view===required.view);
      button.classList.toggle('nav-required',isRequired);
      button.classList.toggle('nav-waiting',Boolean(required)&&!isRequired);
      button.setAttribute('aria-disabled',blockedView(view)?'true':'false');
    });
    clearTraining();
    const active=nav.querySelector('button.active')?.dataset.view||'';
    if(active&&blockedView(active)){
      const target=targetView();
      if(target&&target!==active){setTimeout(()=>nav.querySelector(`[data-view="${target}"]`)?.click(),0);return}
    }
    if(!required){document.getElementById('v38-prerequisite-banner')?.remove();return}
    if(active===required.view){
      const root=document.getElementById(required.view);
      if(root&&!document.getElementById('v38-prerequisite-banner')){
        const banner=document.createElement('div');banner.id='v38-prerequisite-banner';banner.className='panel next-action';banner.style.marginBottom='14px';
        banner.innerHTML='<div><div class="eyebrow">Current required step</div><h2>'+required.label+'</h2><p class="subtle" style="margin-top:5px">Complete this section to advance the highlighted workflow. You may still open setup, fleet, dispatch, and proposed-load screens for review.</p></div>';
        root.insertBefore(banner,root.firstElementChild);
      }
    }else document.getElementById('v38-prerequisite-banner')?.remove();
  }
  function markDashboardReviewed(){localStorage.setItem(dashboardKey,'true');setTimeout(apply,0)}

  nav.addEventListener('click',event=>{
    const button=event.target.closest('button[data-view]');if(!button)return;
    const view=button.dataset.view;
    if(blockedView(view)){
      event.preventDefault();event.stopImmediatePropagation();
      if(typeof toast==='function')toast('Evaluate and accept a proposed load before opening downstream load-completion screens.');
      return;
    }
    if(view==='dashboard')markDashboardReviewed();
    setTimeout(apply,60);
  },true);

  ['business-profile-form','v35-classification-form','fleet-driver-form','fleet-truck-form','fleet-trailer-form'].forEach(id=>document.getElementById(id)?.addEventListener('submit',()=>setTimeout(apply,100),true));
  window.addEventListener('flt:modules-loaded',()=>setTimeout(apply,0));
  new MutationObserver(()=>setTimeout(apply,0)).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  setTimeout(apply,120);

  window.FLTNavigationPrerequisitesHardfix={apply,prerequisite,businessReady,fleetReady,markDashboardReviewed,blockedView,hasRealLoad};
})();