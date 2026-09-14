(() => {
  'use strict';
  if(typeof document==='undefined'||window.FLTFleetRenewalGuidance)return;

  const CURRENT_KEY='flt-v38-current-working-rig';
  const FLEET_KEY='flt-v35-fleet';
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(error){return fallback}};
  const nav=document.getElementById('nav');
  if(!nav)return;

  const kindConfig={
    driver:{bucket:'drivers',typeValue:'drivers',formId:'fleet-driver-form',reason:'Renew driver license',focusName:'expiration'},
    truck:{bucket:'trucks',typeValue:'trucks',formId:'fleet-truck-form',reason:'Add or update scale ticket',focusName:'verificationDate'},
    trailer:{bucket:'trailers',typeValue:'trailers',formId:'fleet-trailer-form',reason:'Add or update scale ticket',focusName:'verificationDate'}
  };

  function visible(el){return Boolean(el&&el.offsetParent!==null&&!el.disabled)}
  function clearGuide(){
    document.querySelectorAll('.v38-authority-missing').forEach(el=>el.classList.remove('v38-authority-missing'));
    document.querySelectorAll('.v38-authority-wrap').forEach(el=>el.classList.remove('v38-authority-wrap'));
  }
  function mark(el){
    if(!visible(el))return false;
    el.classList.add('v38-authority-missing');
    (el.closest('.field')||el.parentElement)?.classList.add('v38-authority-wrap');
    return true;
  }

  function readinessFunction(kind){
    return window.FLTCurrentRigDisplayHardfix?.[kind+'Ready'];
  }

  function healedInvalidation(kind,item,current){
    const config=kindConfig[kind],fleet=read(FLEET_KEY,{drivers:[],trucks:[],trailers:[]});
    const record=(fleet[config.bucket]||[]).find(entry=>entry.id===item.id&&entry.status!=='cancelled');
    const ready=readinessFunction(kind);
    if(!record||typeof ready!=='function'||!ready(record))return false;

    current[kind+'Id']=record.id;
    if(current.invalidated)delete current.invalidated[kind];
    if(current.invalidated&&!Object.keys(current.invalidated).length)delete current.invalidated;
    current.updatedAt=new Date().toISOString();
    localStorage.setItem(CURRENT_KEY,JSON.stringify(current));
    setTimeout(()=>window.dispatchEvent(new Event('flt:workflow-state-changed')),0);
    return true;
  }

  function activeInvalidation(){
    const current=read(CURRENT_KEY,{}),invalidated=current?.invalidated||{};
    for(const kind of ['driver','truck','trailer']){
      const item=invalidated[kind];
      if(!item?.id)continue;
      if(healedInvalidation(kind,item,current))continue;
      return {kind,item};
    }
    return null;
  }

  function optionExists(select,value){return Boolean(select&&[...select.options].some(option=>option.value===value))}

  function prepareManager(kind,item){
    const config=kindConfig[kind];
    const type=document.getElementById('v35-master-type');
    const record=document.getElementById('v35-master-record');
    const reason=document.getElementById('v35-master-reason');
    const edit=document.getElementById('v35-master-edit');
    const notice=document.getElementById('v35-master-notice');
    if(!type||!record||!reason||!edit)return null;

    if(type.value!==config.typeValue){
      type.value=config.typeValue;
      type.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(optionExists(record,item.id))record.value=item.id;
    const reasonValue='edit|'+config.reason;
    if(optionExists(reason,reasonValue))reason.value=reasonValue;

    if(notice){
      const label=item.label||kind;
      notice.innerHTML='<strong>'+label+' is not ready: '+(item.reason||'verification required')+'.</strong><br>Use the saved record below. Do not create a duplicate '+kind+'. Click Load Record for Editing, correct the highlighted information, then update the record.';
    }
    return edit;
  }

  function guideLoadedForm(kind,item){
    const config=kindConfig[kind],form=document.getElementById(config.formId);
    if(!form||form.dataset.editId!==item.id)return false;
    const preferred=form.elements?.[config.focusName];
    if(preferred&&mark(preferred))return true;
    const control=[...(form.querySelectorAll('input,select,textarea')||[])].find(el=>visible(el)&&String(el.value||'').trim()==='');
    if(control&&mark(control))return true;
    const submit=form.querySelector('button[type="submit"],button:not([type])');
    return mark(submit);
  }

  function apply(){
    const active=nav.querySelector('button.active')?.dataset.view||'';
    if(active!=='fleet')return;
    const invalid=activeInvalidation();
    clearGuide();
    if(!invalid)return;

    if(guideLoadedForm(invalid.kind,invalid.item))return;
    const edit=prepareManager(invalid.kind,invalid.item);
    if(edit){
      edit.scrollIntoView({block:'center',behavior:'smooth'});
      mark(edit);
    }
  }

  let timer=null;
  function schedule(delay=170){clearTimeout(timer);timer=setTimeout(apply,delay)}
  document.addEventListener('click',()=>schedule(),true);
  document.addEventListener('change',()=>schedule(),true);
  document.addEventListener('submit',()=>schedule(260),true);
  window.addEventListener('flt:modules-loaded',()=>schedule(220));
  window.addEventListener('flt:workflow-state-changed',()=>schedule(220));
  window.addEventListener('storage',event=>{if(event.key===CURRENT_KEY||event.key===FLEET_KEY)schedule(220)});

  schedule(240);
  window.FLTFleetRenewalGuidance={apply,activeInvalidation};
})();
