(() => {
  'use strict';
  if(typeof document==='undefined'||window.FLTProtectedMasterBackup)return;

  const BACKUP_KEY='commercial-command-master-backup-v1';
  const DURABLE_KEYS=[
    'flt-v34-business-profile',
    'flt-v35-classification',
    'flt-v35-fleet',
    'flt-v36-regular-rig',
    'flt-v35-default-fleet-selection'
  ];

  const readRaw=key=>localStorage.getItem(key);
  const meaningful=()=>{
    const profile=readRaw('flt-v34-business-profile');
    const classification=readRaw('flt-v35-classification');
    let fleet=null;
    try{fleet=JSON.parse(readRaw('flt-v35-fleet')||'null')}catch(error){}
    return Boolean(profile||classification||(fleet&&['drivers','trucks','trailers'].some(bucket=>Array.isArray(fleet[bucket])&&fleet[bucket].length)));
  };

  function collect(){
    const data={};
    DURABLE_KEYS.forEach(key=>{const value=readRaw(key);if(value!==null)data[key]=value});
    return {schema:'FLT-PROTECTED-MASTER-BACKUP-1',savedAt:new Date().toISOString(),data};
  }

  function snapshot(reason='automatic'){
    if(!meaningful())return false;
    const payload=collect();
    payload.reason=reason;
    localStorage.setItem(BACKUP_KEY,JSON.stringify(payload));
    updatePanels();
    return true;
  }

  function readBackup(){
    try{
      const parsed=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');
      if(parsed?.schema!=='FLT-PROTECTED-MASTER-BACKUP-1'||!parsed.data||typeof parsed.data!=='object')return null;
      return parsed;
    }catch(error){return null}
  }

  function restore(){
    const backup=readBackup();
    if(!backup)return false;
    const ok=globalThis.confirm?.('Restore the protected Commercial Command master backup?\n\nThis restores Business Setup, classification, Driver/Truck/Trailer master records, My Regular Rig, and fleet audit history from the protected browser backup.');
    if(!ok)return false;
    DURABLE_KEYS.forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(backup.data,key))localStorage.setItem(key,backup.data[key]);
      else localStorage.removeItem(key);
    });
    localStorage.setItem('flt-v35-resume-view','fleet');
    location.reload();
    return true;
  }

  function backupSummary(){
    const backup=readBackup();
    if(!backup)return 'No protected master backup has been created yet.';
    const when=new Date(backup.savedAt);
    const label=Number.isFinite(when.getTime())?when.toLocaleString():backup.savedAt;
    let fleet={};
    try{fleet=JSON.parse(backup.data['flt-v35-fleet']||'{}')}catch(error){}
    const counts=['drivers','trucks','trailers'].map(bucket=>Array.isArray(fleet[bucket])?fleet[bucket].length:0);
    return 'Protected backup: '+label+' · '+counts[0]+' driver(s), '+counts[1]+' truck(s), '+counts[2]+' trailer(s).';
  }

  function panel(id){
    let el=document.getElementById(id);
    if(el)return el;
    el=document.createElement('div');
    el.id=id;
    el.className='notice';
    el.style.marginTop='12px';
    el.innerHTML='<strong>Protected master backup</strong><br><span data-master-backup-status></span><div class="form-actions" style="margin-top:10px"><button class="btn" type="button" data-master-backup-now>Save Protected Backup Now</button><button class="btn primary" type="button" data-master-backup-restore>Restore Protected Master Backup</button></div>';
    el.addEventListener('click',event=>{
      if(event.target.closest('[data-master-backup-now]')){
        if(snapshot('manual')&&typeof toast==='function')toast('Protected master backup saved.');
        else if(typeof toast==='function')toast('Nothing permanent is saved yet.');
      }
      if(event.target.closest('[data-master-backup-restore]'))restore();
    });
    return el;
  }

  function mount(){
    const business=document.getElementById('business-setup');
    if(business&&!document.getElementById('v38-business-master-backup')){
      const p=panel('v38-business-master-backup');
      const reset=document.getElementById('v38-test-data-reset');
      if(reset)reset.insertAdjacentElement('beforebegin',p);else business.appendChild(p);
    }
    const fleet=document.getElementById('fleet');
    if(fleet&&!document.getElementById('v38-fleet-master-backup')){
      const p=panel('v38-fleet-master-backup');
      fleet.appendChild(p);
    }
    updatePanels();
  }

  function updatePanels(){
    document.querySelectorAll('[data-master-backup-status]').forEach(node=>node.textContent=backupSummary());
    const hasBackup=Boolean(readBackup());
    document.querySelectorAll('[data-master-backup-restore]').forEach(button=>button.disabled=!hasBackup);
  }

  let timer;
  const schedule=(reason='automatic',delay=250)=>{
    clearTimeout(timer);
    timer=setTimeout(()=>snapshot(reason),delay);
  };

  ['business-profile-form','v35-classification-form','fleet-driver-form','fleet-truck-form','fleet-trailer-form'].forEach(id=>{
    document.getElementById(id)?.addEventListener('submit',()=>schedule(id,450),true);
  });
  document.getElementById('v36-rig-save')?.addEventListener('click',()=>schedule('regular-rig',120),true);
  document.getElementById('v36-rig-clear')?.addEventListener('click',()=>schedule('regular-rig-cleared',120),true);
  window.addEventListener('flt:workflow-state-changed',()=>schedule('workflow-change',300));
  window.addEventListener('beforeunload',()=>snapshot('page-close'));
  window.addEventListener('flt:modules-loaded',()=>{mount();schedule('modules-loaded',500)});

  mount();
  if(meaningful()&&!readBackup())snapshot('initial-protection');
  updatePanels();

  window.FLTProtectedMasterBackup={BACKUP_KEY,DURABLE_KEYS,collect,snapshot,readBackup,restore,meaningful,backupSummary,mount};
})();
