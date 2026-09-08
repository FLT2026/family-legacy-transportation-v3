(() => {
  if(typeof document==='undefined')return;
  const nav=document.getElementById('nav');
  if(!nav)return;

  const style=document.createElement('style');
  style.id='v38-process-training-hardfix-style';
  style.textContent=`
    .v38-hard-field-next{
      border:4px solid #d4b900!important;
      background:#fff9b8!important;
      box-shadow:0 0 0 6px rgba(207,232,106,.68)!important;
      outline:none!important;
    }
    .v38-hard-field-wrap{position:relative!important}
    .v38-hard-field-wrap::before{
      content:'NEXT';position:absolute;right:8px;top:-13px;z-index:40;
      background:#d4d72f;color:#173f39;border:2px solid #173f39;
      font-size:10px;font-weight:900;padding:4px 8px;border-radius:999px;
    }
    #v38-hard-training-banner{
      position:sticky;top:8px;z-index:45;margin:0 0 12px 0;padding:10px 14px;
      border-left:6px solid #d4d72f;background:#f8f8dc;border-radius:7px;
      box-shadow:0 5px 18px rgba(0,0,0,.12);font-weight:800;color:#173f39;
    }
    #v38-hard-training-banner small{display:block;margin-top:3px;font-weight:600;color:#49635e}
  `;
  document.head.appendChild(style);

  const steps={
    intelligence:[
      {id:'v38-quick-source',label:'Select the load source',valid:c=>Boolean(c.value)},
      {id:'v38-quick-pickup-zip',label:'Enter the 5-digit pickup ZIP',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'v38-quick-delivery-zip',label:'Enter the 5-digit delivery ZIP',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'v35-loaded-miles',label:'Confirm loaded miles',valid:c=>Number(c.value)>0},
      {id:'v35-deadhead-miles',label:'Enter or confirm deadhead miles',valid:c=>String(c.value||'').trim()!==''&&Number(c.value)>=0},
      {id:'v35-offer',label:'Enter the offered rate',valid:c=>Number(c.value)>0},
      {id:'v35-cargo-weight',label:'Enter the cargo weight',valid:c=>Number(c.value)>0}
    ],
    load:[
      {id:'customer-name',label:'Enter or select the Customer / Company Name',valid:c=>String(c.value||'').trim()!==''},
      {id:'billing-street',label:'Enter or select the customer billing street',valid:c=>String(c.value||'').trim()!==''},
      {id:'billing-zip',label:'Enter the customer billing ZIP',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'pickup-facility',label:'Enter or select the pickup facility / contact',valid:c=>String(c.value||'').trim()!==''},
      {id:'pickup-street',label:'Enter or select the pickup street',valid:c=>String(c.value||'').trim()!==''},
      {id:'pickup-zip',label:'Enter the pickup ZIP',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'delivery-facility',label:'Enter or select the delivery facility / contact',valid:c=>String(c.value||'').trim()!==''},
      {id:'delivery-street',label:'Enter or select the delivery street',valid:c=>String(c.value||'').trim()!==''},
      {id:'delivery-zip',label:'Enter the delivery ZIP',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'pickup-date',label:'Enter the pickup date',valid:c=>String(c.value||'').trim()!==''},
      {id:'delivery-date',label:'Enter the delivery date',valid:c=>String(c.value||'').trim()!==''}
    ]
  };

  let lastStepId='';
  let enteringView=false;

  const activeView=()=>nav.querySelector('button.active')?.dataset.view||'';
  const controlFor=step=>document.getElementById(step.id);
  const isUsable=control=>Boolean(control&&!control.disabled&&!control.readOnly);
  const isValid=step=>{
    const control=controlFor(step);
    if(!control)return true;
    if(!isUsable(control))return true;
    try{return Boolean(step.valid(control))}catch(error){return false}
  };
  const nextStep=()=>{
    const list=steps[activeView()]||[];
    return list.find(step=>!isValid(step))||null;
  };

  function clearHighlight(){
    document.querySelectorAll('.v38-hard-field-next').forEach(el=>el.classList.remove('v38-hard-field-next'));
    document.querySelectorAll('.v38-hard-field-wrap').forEach(el=>el.classList.remove('v38-hard-field-wrap'));
    document.getElementById('v38-hard-training-banner')?.remove();
  }

  function placeBanner(control,step){
    const form=control.closest('form')||control.closest('.panel')||control.parentElement;
    if(!form)return;
    const banner=document.createElement('div');
    banner.id='v38-hard-training-banner';
    banner.innerHTML='NEXT REQUIRED: '+step.label+'<small>Commercial Command will keep guiding you until this step is complete and valid.</small>';
    form.insertBefore(banner,form.firstElementChild);
  }

  function applyTraining({scroll=false,focus=false}={}){
    clearHighlight();
    const view=activeView();
    if(view!=='intelligence'&&view!=='load'){lastStepId='';return}
    const step=nextStep();
    if(!step){lastStepId='';return}
    const control=controlFor(step);if(!control)return;
    control.classList.add('v38-hard-field-next');
    const wrap=control.closest('.field')||control.parentElement;
    wrap?.classList.add('v38-hard-field-wrap');
    placeBanner(control,step);
    const changed=lastStepId!==step.id;
    lastStepId=step.id;
    if(scroll||changed&&enteringView){
      setTimeout(()=>control.scrollIntoView({behavior:'smooth',block:'center'}),30);
    }
    if(focus&&changed)setTimeout(()=>{try{control.focus({preventScroll:true})}catch(error){control.focus()}},250);
    enteringView=false;
  }

  function onControlProgress(event){
    const view=activeView();
    if(view!=='intelligence'&&view!=='load')return;
    const step=(steps[view]||[]).find(item=>item.id===event.target.id);
    if(!step)return;
    const before=lastStepId;
    applyTraining();
    if(before&&lastStepId&&before!==lastStepId){
      const next=controlFor((steps[view]||[]).find(item=>item.id===lastStepId));
      if(next)setTimeout(()=>next.scrollIntoView({behavior:'smooth',block:'center'}),40);
    }
  }

  document.addEventListener('input',onControlProgress,true);
  document.addEventListener('change',onControlProgress,true);
  document.addEventListener('blur',onControlProgress,true);
  nav.addEventListener('click',event=>{
    const button=event.target.closest('button[data-view]');
    if(!button)return;
    enteringView=true;
    setTimeout(()=>applyTraining({scroll:true,focus:false}),100);
  },true);

  const observer=new MutationObserver(()=>queueMicrotask(()=>applyTraining()));
  observer.observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('flt:modules-loaded',()=>setTimeout(()=>applyTraining({scroll:true}),80));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyTraining()});
  setTimeout(()=>applyTraining({scroll:true}),100);
  setTimeout(()=>applyTraining(),350);
})();