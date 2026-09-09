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
    const reviewed=['insurance','authority','equipment'].every(key=>['pending','verified'].includes(classification?.[key+'Status']));
    return reviewed;
  }
  function fleetReady(){
    const fleet=readJson('flt-v35-fleet',{drivers:[],trucks:[],trailers:[]});
    return Boolean((fleet.drivers||[]).some(driverReady)&&(fleet.trucks||[]).some(truckReady)&&(fleet.trailers||[]).some(trailerReady));
  }
  function prerequisite(){
    if(localStorage.getItem(dashboardKey)!=='true')return{view:'dashboard',label:'Dashboard'};
    if(!businessReady())return{view:'business',label:'Business Setup'};
    if(!fleetReady())return{view:'fleet',label:'Drivers & Equipment'};
    return null;
  }
  function clearTraining(){
    document.getElementById('v38-hard-training-banner')?.remove();
    document.querySelectorAll('.v38-hard-field-next,.v38-hard-action-next').forEach(el=>el.classList.remove('v38-hard-field-next','v38-hard-action-next'));
    document.querySelectorAll('.v38-hard-field-wrap').forEach(el=>el.classList.remove('v38-hard-field-wrap'));
  }
  function apply(){
    const required=prerequisite();
    if(!required)return;
    nav.querySelectorAll('button[data-view]').forEach(button=>{
      const isRequired=button.dataset.view===required.view;
      button.classList.toggle('nav-required',isRequired);
      if(!isRequired&&button.dataset.view!=='test')button.classList.add('nav-waiting');
    });
    clearTraining();
    const active=nav.querySelector('button.active')?.dataset.view||'';
    if(active===required.view){
      const root=document.getElementById(required.view);
      if(root&&!document.getElementById('v38-prerequisite-banner')){
        const banner=document.createElement('div');banner.id='v38-prerequisite-banner';banner.className='panel next-action';banner.style.marginBottom='14px';
        banner.innerHTML='<div><div class="eyebrow">Current required step</div><h2>'+required.label+'</h2><p class="subtle" style="margin-top:5px">Complete this section before Commercial Command advances the highlighted workflow to the next step.</p></div>';
        root.insertBefore(banner,root.firstElementChild);
      }
    }else document.getElementById('v38-prerequisite-banner')?.remove();
  }
  function markDashboardReviewed(){
    localStorage.setItem(dashboardKey,'true');
    document.getElementById('v38-prerequisite-banner')?.remove();
    setTimeout(apply,0);
  }

  nav.querySelector('[data-view="dashboard"]')?.addEventListener('click',markDashboardReviewed,true);
  ['business-profile-form','v35-classification-form','fleet-driver-form','fleet-truck-form','fleet-trailer-form'].forEach(id=>document.getElementById(id)?.addEventListener('submit',()=>setTimeout(apply,80),true));
  nav.addEventListener('click',()=>setTimeout(apply,60),true);
  window.addEventListener('flt:modules-loaded',()=>setTimeout(apply,0));
  const observer=new MutationObserver(()=>{if(prerequisite())setTimeout(apply,0)});
  observer.observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  setTimeout(apply,120);

  window.FLTNavigationPrerequisitesHardfix={apply,prerequisite,businessReady,fleetReady,markDashboardReviewed};
})();