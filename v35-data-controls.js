(() => {
  if(document.getElementById('v35-data-controls'))return;
  const test=document.getElementById('test');
  if(!test)return;
  const panel=document.createElement('div');
  panel.id='v35-data-controls';panel.className='panel';panel.style.marginTop='14px';
  panel.innerHTML=`
    <div class="section-head"><div><div class="eyebrow">Protected testing controls</div><h2>Export, Restore & Reset Test Data</h2><p class="subtle" style="margin-top:5px">Business Setup and completed FLT records are protected. Export before a controlled test or reset.</p></div><span class="tag">DATA SAFE</span></div>
    <div class="grid three" style="margin-top:14px">
      <div class="panel"><h3>1 · Export backup</h3><p class="subtle">Downloads every Family Legacy browser record as a JSON backup.</p><button class="btn primary" id="v35-export-data" type="button">Export Test Data</button></div>
      <div class="panel"><h3>2 · Restore backup</h3><p class="subtle">Restores a backup created by this screen after confirmation.</p><button class="btn" id="v35-restore-data" type="button">Choose Backup to Restore</button><input id="v35-restore-file" type="file" accept="application/json,.json" hidden></div>
      <div class="panel"><h3>3 · Reset test records</h3><p class="subtle">Removes only DEMO, TEST, and PLANNED test records plus estimate history. FLT loads and Business Setup remain.</p><button class="btn danger" id="v35-reset-test-data" type="button">Reset Test Records Only</button></div>
    </div>
    <div class="notice" id="v35-data-control-status" style="margin-top:14px"><strong>No data has been changed.</strong><br>Completed FLT records are never included in the test-only reset.</div>`;
  test.appendChild(panel);

  const status=document.getElementById('v35-data-control-status');
  const fltData=()=>{const data={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('flt-'))data[key]=localStorage.getItem(key)}return data};
  function downloadBackup(label='test-backup'){
    const payload={schema:'FLT-V3.5-BROWSER-BACKUP-1',exportedAt:new Date().toISOString(),data:fltData()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='FLT-V3.5-'+label+'-'+new Date().toISOString().slice(0,19).replaceAll(':','-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.innerHTML='<strong>Backup exported.</strong><br>Keep the JSON file until controlled testing is complete.';
    if(typeof toast==='function')toast('V3.5 browser-data backup downloaded.');
  }
  document.getElementById('v35-export-data').addEventListener('click',()=>downloadBackup());

  const fileInput=document.getElementById('v35-restore-file');
  document.getElementById('v35-restore-data').addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
    try{
      const payload=JSON.parse(await file.text());
      if(payload?.schema!=='FLT-V3.5-BROWSER-BACKUP-1'||!payload.data||typeof payload.data!=='object')throw new Error('This is not a valid FLT V3.5 backup.');
      const entries=Object.entries(payload.data);
      if(!entries.length||entries.some(([key,value])=>!key.startsWith('flt-')||typeof value!=='string'))throw new Error('The backup contains invalid records.');
      if(!confirm('Restore this FLT V3.5 backup? Current browser data will be exported first, then replaced.'))return;
      downloadBackup('automatic-pre-restore');
      Object.keys(localStorage).filter(key=>key.startsWith('flt-')).forEach(key=>localStorage.removeItem(key));
      entries.forEach(([key,value])=>localStorage.setItem(key,value));
      status.innerHTML='<strong>Backup restored.</strong><br>Refresh the application to load the restored records.';
      if(typeof toast==='function')toast('Backup restored. Refresh the application.');
    }catch(error){status.innerHTML='<strong>Restore stopped.</strong><br>'+String(error.message||error);if(typeof toast==='function')toast('Restore stopped: '+String(error.message||error))}
  });

  function parsed(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(error){return fallback}}
  const testName=value=>/(^|[-_ ])(?:DEMO|TEST|PLANNED)(?:[-_ ]|$)/i.test(String(value||''));
  document.getElementById('v35-reset-test-data').addEventListener('click',()=>{
    if(!confirm('Reset only DEMO, TEST, and PLANNED test records? Completed FLT loads and Business Setup will remain.'))return;
    const phrase=prompt('Type RESET TEST DATA to continue.');
    if(phrase!=='RESET TEST DATA'){status.innerHTML='<strong>Reset cancelled.</strong><br>No data was changed.';return}
    downloadBackup('automatic-pre-reset');
    const fleet=parsed('flt-v35-fleet',{drivers:[],trucks:[],trailers:[],locks:[],audit:[]});
    const removedIds=new Set();
    ['drivers','trucks','trailers'].forEach(bucket=>{fleet[bucket]=(fleet[bucket]||[]).filter(record=>{const remove=testName(record.id)||testName(record.name)||testName(record.unit);if(remove)removedIds.add(record.id);return !remove})});
    fleet.locks=(fleet.locks||[]).filter(lock=>!testName(lock.loadId)&&!removedIds.has(lock.driverId)&&!removedIds.has(lock.truckId)&&!removedIds.has(lock.trailerId));
    localStorage.setItem('flt-v35-fleet',JSON.stringify(fleet));
    const loads=parsed('flt-v32-loads',[]),kept=loads.filter(load=>!testName(load.id));
    localStorage.setItem('flt-v32-loads',JSON.stringify(kept));
    const selected=localStorage.getItem('flt-v32-loads-selected');if(testName(selected))localStorage.removeItem('flt-v32-loads-selected');
    localStorage.removeItem('flt-v35-estimate-snapshots');localStorage.removeItem('flt-v35-last-decision');
    status.innerHTML='<strong>Test records reset.</strong><br>Business Setup, classification, audit history, and completed FLT loads were preserved. Refresh to begin the controlled test.';
    if(typeof toast==='function')toast('Test records reset. FLT loads and Business Setup preserved.');
  });
})();