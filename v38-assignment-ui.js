(() => {
  const api=window.FLTAssignmentIntegrity,form=document.getElementById('fleet-lock-form');
  if(!api||!form||window.FLTAssignmentUI)return;
  const fleetKey='flt-v35-fleet',assignmentKey='flt-v38-assignments';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readJson=(key,fallback)=>{try{return {...fallback,...JSON.parse(localStorage.getItem(key)||'{}')}}catch(error){return {...fallback}}};
  const readFleet=()=>readJson(fleetKey,{drivers:[],trucks:[],trailers:[],locks:[],audit:[]});
  const readAssignments=()=>readJson(assignmentKey,{assignments:[],assignmentAudit:[]});
  const saveAssignments=data=>localStorage.setItem(assignmentKey,JSON.stringify(data));
  const saveFleet=data=>localStorage.setItem(fleetKey,JSON.stringify(data));
  const loadSelect=document.getElementById('fleet-lock-load'),driver=document.getElementById('fleet-lock-driver'),truck=document.getElementById('fleet-lock-truck'),trailer=document.getElementById('fleet-lock-trailer'),reason=document.getElementById('fleet-lock-reason'),detail=document.getElementById('fleet-lock-reason-detail'),detailField=document.getElementById('fleet-lock-reason-detail-field'),submit=document.getElementById('fleet-lock-submit');
  const active=loadId=>api.activeForLoad(readAssignments(),loadId);
  const optionLabel=(fleet,bucket,id)=>{const item=(fleet[bucket]||[]).find(x=>x.id===id);return item?.name||item?.unit||id||'—'};
  function ensureControls(){
    if(document.getElementById('v38-assignment-state'))return;
    const status=document.createElement('div');status.id='v38-assignment-state';status.className='notice';status.style.marginBottom='12px';form.insertAdjacentElement('beforebegin',status);
    const actions=form.querySelector('.form-actions');
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn danger';cancel.id='v38-cancel-assignment';cancel.textContent='Cancel Assignment';cancel.hidden=true;actions?.insertBefore(cancel,submit);
    const history=document.createElement('div');history.id='v38-assignment-history';history.className='panel';history.style.marginTop='14px';form.closest('.panel')?.insertAdjacentElement('afterend',history);
    cancel.addEventListener('click',cancelCurrent);
  }
  function reasonOptions(){
    const loadId=loadSelect.value,current=active(loadId),action=current?'change':'assign',choices=api.reasons[action]||[];
    reason.innerHTML='<option value="">Select '+(current?'assignment-change':'assignment')+' reason</option>'+choices.map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join('');
    reason.value=current?'':(choices.includes('New load assignment')?'New load assignment':'');detail.value='';detail.required=false;detailField.hidden=true;
  }
  reason.addEventListener('change',()=>{const other=String(reason.value).startsWith('Other authorized'),show=other;detailField.hidden=!show;detail.required=show;if(show)detail.focus();else detail.value=''});
  function resolvedReason(){const value=String(reason.value||'').trim();if(!value.startsWith('Other authorized'))return value;const explanation=String(detail.value||'').trim();return explanation?value+' — '+explanation:''}
  function migrateLegacy(loadId){
    if(!loadId||active(loadId))return;
    const fleet=readFleet(),legacy=[...(fleet.locks||[])].reverse().find(lock=>lock.loadId===loadId);if(!legacy)return;
    const data=readAssignments(),at=legacy.lockedAt||new Date().toISOString(),assignment={id:'MIG-'+String(legacy.id||loadId),loadId,driverId:String(legacy.driverId||''),truckId:String(legacy.truckId||''),trailerId:String(legacy.trailerId||''),status:'Verified / Locked',reason:legacy.reason||'New load assignment',createdAt:at,updatedAt:at};
    data.assignments.push(assignment);data.assignmentAudit.push({type:'Assignment Migrated',loadId,assignmentId:assignment.id,reason:'Migrated from existing dispatch lock',after:JSON.parse(JSON.stringify(assignment)),recordedAt:at});saveAssignments(data);
  }
  function syncFromLegacy(){
    const loadId=loadSelect.value;if(!loadId)return;migrateLegacy(loadId);
    const fleet=readFleet(),legacy=[...(fleet.locks||[])].reverse().find(lock=>lock.loadId===loadId);if(!legacy)return;
    const data=readAssignments(),current=api.activeForLoad(data,loadId),ids={driverId:String(legacy.driverId||''),truckId:String(legacy.truckId||''),trailerId:String(legacy.trailerId||'')};
    const same=current&&current.driverId===ids.driverId&&current.truckId===ids.truckId&&current.trailerId===ids.trailerId;if(same){render();return}
    const selectedReason=resolvedReason()||legacy.reason||'Correct data-entry mistake';let result;
    if(current)result=api.change(data,loadId,{...ids,reason:selectedReason});else result=api.create(data,{loadId,...ids,reason:selectedReason});
    if(result.ok)saveAssignments(data);render();
  }
  function render(){
    ensureControls();const loadId=loadSelect.value;migrateLegacy(loadId);const data=readAssignments(),current=api.activeForLoad(data,loadId),fleet=readFleet(),state=document.getElementById('v38-assignment-state'),cancel=document.getElementById('v38-cancel-assignment');
    if(!loadId){state.innerHTML='<strong>V3.8 Assignment Integrity</strong><br><span class="subtle">Select an open Load ID to view or create its verified dispatch assignment.</span>';cancel.hidden=true;renderHistory();return}
    if(current){driver.value=current.driverId;truck.value=current.truckId;trailer.value=current.trailerId;state.innerHTML='<strong>'+esc(loadId)+' · VERIFIED / LOCKED</strong><br>'+esc(optionLabel(fleet,'drivers',current.driverId))+' · '+esc(optionLabel(fleet,'trucks',current.truckId))+' · '+esc(optionLabel(fleet,'trailers',current.trailerId))+'<br><span class="subtle">To replace this assignment, choose a different verified record and an authorized change reason. The prior assignment remains in history.</span>';cancel.hidden=false;submit.textContent='Change & Lock Assignment'}else{state.innerHTML='<strong>'+esc(loadId)+' · No active assignment</strong><br><span class="subtle">Select one verified driver, truck, and trailer, then record why they are being assigned.</span>';cancel.hidden=true;submit.textContent='Lock assignment at Dispatch'}
    renderHistory();
  }
  function renderHistory(){const host=document.getElementById('v38-assignment-history');if(!host)return;const loadId=loadSelect.value,data=readAssignments(),events=loadId?api.history(data,loadId):[];host.innerHTML='<div class="section-head"><div><div class="eyebrow">V3.8 immutable assignment history</div><h2>Load-ID Assignment Audit</h2></div><span class="tag '+(events.length?'':'gray')+'">'+events.length+' events</span></div>'+(events.length?[...events].reverse().map(event=>'<div class="metric-row"><span><strong>'+esc(event.type)+'</strong><br><small class="subtle">'+esc(event.reason||'')+' · '+new Date(event.recordedAt).toLocaleString()+'</small></span><span class="tag">RECORDED</span></div>').join(''):'<div class="empty">Select a Load ID to view assignment history.</div>')}
  function cancelCurrent(){
    const loadId=loadSelect.value,current=active(loadId);if(!loadId||!current)return;
    const choices=api.reasons.cancel||[],menu=choices.map((value,index)=>(index+1)+'. '+value).join('\n'),picked=globalThis.prompt?.('Cancellation reason for '+loadId+':\n\n'+menu+'\n\nType the reason exactly:','Load cancelled');if(picked===null)return;let note=String(picked||'').trim();
    if(note.startsWith('Other authorized')){const explanation=globalThis.prompt?.('Brief explanation for the cancellation:','');if(explanation===null)return;note='Other authorized cancellation — '+String(explanation||'').trim()}
    const data=readAssignments(),result=api.cancel(data,loadId,note);if(!result.ok){if(typeof toast==='function')toast(result.reason);return}
    if(!globalThis.confirm?.('Cancel the verified assignment for '+loadId+'? The assignment will remain in audit history.'))return;
    saveAssignments(data);const fleet=readFleet(),before=(fleet.locks||[]).filter(lock=>lock.loadId===loadId);fleet.locks=(fleet.locks||[]).filter(lock=>lock.loadId!==loadId);fleet.audit=fleet.audit||[];fleet.audit.push({entity:'trip_lock',entityId:loadId,action:'authorized_change',reason:note,reasons:[note],before,after:null,timestamp:new Date().toISOString()});saveFleet(fleet);if(typeof toast==='function')toast('Assignment cancelled and preserved in the V3.8 audit history.');reasonOptions();render();
  }
  loadSelect.addEventListener('change',()=>{migrateLegacy(loadSelect.value);reasonOptions();render()});
  form.addEventListener('submit',()=>setTimeout(syncFromLegacy,0));
  ensureControls();migrateLegacy(loadSelect.value);reasonOptions();render();
  window.FLTAssignmentUI={render,syncFromLegacy,cancelCurrent};
})();
