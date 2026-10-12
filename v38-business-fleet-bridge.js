(() => {
  'use strict';
  function resolve(fleet,rigs,ready,overrides={}){
    const result={};
    for(const [kind,bucket] of [['driver','drivers'],['truck','trucks'],['trailer','trailers']]){
      const items=(fleet[bucket]||[]).filter(item=>item.status!=='cancelled'),ids=[overrides[kind],...rigs.map(rig=>rig?.[kind+'Id'])].filter(Boolean);
      result[kind]=ids.map(id=>items.find(item=>item.id===id)).find(Boolean)||(items.length===1?items[0]:null);
    }
    result.references={truckGvwr:ready('truck',result.truck)?result.truck.gvwr:'',truckEmpty:ready('truck',result.truck)?result.truck.emptyWeight:'',gcwr:ready('truck',result.truck)?result.truck.gcwr:'',trailerGvwr:ready('trailer',result.trailer)?result.trailer.gvwr:'',trailerEmpty:ready('trailer',result.trailer)?result.trailer.emptyWeight:''};
    const vehicle=result.truck?.vehicleType||result.truck?.configuration||'',trailer=result.trailer?.configuration||'';
    const pickupConfigurations={'Gooseneck trailer':'Pickup and gooseneck trailer','Bumper-pull trailer':'Pickup and bumper-pull trailer','Fifth-wheel trailer':'Pickup and fifth-wheel trailer'};
    result.configuration=vehicle==='Pickup'&&pickupConfigurations[trailer]?pickupConfigurations[trailer]:[vehicle,trailer==='No trailer'?'':trailer].filter(Boolean).join(' / ');
    return result;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={resolve};
  if(typeof document==='undefined'||window.FLTBusinessFleetBridge)return;
  const hub=window.FLTFleetMasterHub,form=document.getElementById('v35-classification-form');if(!hub||!form)return;
  const overrides={},esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const bridge=document.createElement('div');bridge.id='v38-business-fleet-bridge';bridge.className='notice';
  bridge.innerHTML='<div class="form-grid">'+['driver','truck','trailer'].map(kind=>'<div class="field"><label>Master '+kind+'<select id="business-master-'+kind+'"><option value="">Select '+kind+' master</option></select></label></div>').join('')+'<div class="field full" id="business-master-driver-reference"></div><div class="form-actions field full"><button type="button" class="btn" data-manage-fleet>Manage Drivers & Equipment</button></div></div>';
  form.insertAdjacentElement('beforebegin',bridge);
  bridge.querySelector('[data-manage-fleet]').addEventListener('click',()=>document.querySelector('#nav [data-view="fleet"]')?.click());
  function selected(){return resolve(hub.fleet(),[hub.regular(),hub.current(),hub.read(hub.LEGACY,{}),hub.read('flt-v35-classification',{})?.masterRecordIds],hub.ready,overrides)}
  function setChoice(fieldId,value,locked){
    const field=document.getElementById(fieldId);if(!field)return;
    if(value&&![...field.options].some(option=>option.value===value))field.add(new Option(value,value));
    if(locked)field.value=value||'';
    field.disabled=locked;
  }
  function apply(){
    const state=selected(),data=hub.fleet();
    for(const [kind,bucket] of [['driver','drivers'],['truck','trucks'],['trailer','trailers']]){
      const select=document.getElementById('business-master-'+kind),items=(data[bucket]||[]).filter(item=>item.status!=='cancelled');
      select.innerHTML='<option value="">Select '+kind+' master</option>'+items.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.name||item.unit)+' - '+(hub.ready(kind,item)?'Verified':'Planned / incomplete')+'</option>').join('');
      select.value=state[kind]?.id||'';
    }
    setChoice('v35-driver-class',state.driver?.qualification,Boolean(state.driver));
    setChoice('v35-operating-area',state.driver?.area,Boolean(state.driver));
    setChoice('v35-vehicle-config',state.configuration,Boolean(state.truck||state.trailer));
    if(state.truck||state.trailer)setChoice('v35-equipment-status',hub.ready('truck',state.truck)&&hub.ready('trailer',state.trailer)?'active':'planned',true);
    const values={'v35-truck-gvwr':state.references.truckGvwr,'v35-truck-empty':state.references.truckEmpty,'v35-gcwr':state.references.gcwr,'v35-trailer-gvwr':state.references.trailerGvwr,'v35-trailer-empty':state.references.trailerEmpty};
    Object.entries(values).forEach(([fieldId,value])=>{const field=document.getElementById(fieldId);if(field){field.readOnly=true;field.value=value==null?'':String(value);field.defaultValue=''}});
    const driver=state.driver;
    document.getElementById('business-master-driver-reference').textContent=driver?[driver.name,driver.licenseState,driver.expiration?'License expires '+driver.expiration:'',driver.endorsements?'Endorsements: '+driver.endorsements:'',driver.restrictions?'Restrictions: '+driver.restrictions:''].filter(Boolean).join(' | '):'Driver profile is stored in the Driver master record.';
  }
  for(const kind of ['driver','truck','trailer'])document.getElementById('business-master-'+kind).addEventListener('change',event=>{
    if(event.target.value&&!confirm('Use this saved '+kind+' for Business Setup references? This does not change a dispatch assignment.')){apply();return}
    overrides[kind]=event.target.value;apply();
  });
  form.addEventListener('submit',()=>apply(),true);
  document.getElementById('v35-load-flt-profile')?.addEventListener('click',()=>setTimeout(apply,0));
  document.getElementById('v35-primary-operation')?.addEventListener('change',()=>setTimeout(apply,0));
  let timer;const schedule=(delay=100)=>{clearTimeout(timer);timer=setTimeout(apply,delay)};
  document.getElementById('nav')?.addEventListener('click',event=>{if(event.target.closest('[data-view="business-setup"]'))schedule(0)},true);
  document.addEventListener('submit',()=>schedule(400),true);
  window.addEventListener('flt:modules-loaded',()=>schedule(0));window.addEventListener('flt:workflow-state-changed',()=>schedule());
  window.FLTBusinessFleetBridge={apply,selected,resolve};apply();
})();
