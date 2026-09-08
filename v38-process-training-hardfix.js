(() => {
  if(typeof document==='undefined')return;
  const nav=document.getElementById('nav');
  if(!nav)return;

  const style=document.createElement('style');
  style.id='v38-process-training-hardfix-style';
  style.textContent=`
    .v38-hard-field-next,.v38-hard-action-next{
      border:5px solid #ffea00!important;
      background:#fff45c!important;
      color:#102f2b!important;
      box-shadow:0 0 0 7px rgba(255,234,0,.45),0 5px 18px rgba(0,0,0,.16)!important;
      outline:none!important;
    }
    .v38-hard-field-wrap{position:relative!important}
    .v38-hard-field-wrap::before{
      content:'NEXT';position:absolute;right:8px;top:-15px;z-index:60;
      background:#ffea00;color:#102f2b;border:2px solid #102f2b;
      font-size:11px;font-weight:1000;padding:5px 9px;border-radius:999px;
    }
    #v38-hard-training-banner{
      position:sticky;top:8px;z-index:55;margin:0 0 14px 0;padding:13px 16px;
      border:4px solid #ffea00;border-left:10px solid #102f2b;background:#fff45c;
      border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.16);color:#102f2b;
      font-weight:900;font-size:15px;
    }
    #v38-hard-training-banner small{display:block;margin-top:5px;font-weight:750;color:#264842;line-height:1.35}
  `;
  document.head.appendChild(style);

  const steps={
    intelligence:[
      {id:'v38-quick-source',label:'Select where this load came from',instruction:'Owner operator / fleet driver: choose the load board, broker, auction, direct customer, or other source.' ,valid:c=>Boolean(c.value)},
      {id:'v38-quick-pickup-zip',label:'Enter the pickup ZIP',instruction:'Enter all 5 digits. City and state will be filled automatically when available.',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'v38-quick-delivery-zip',label:'Enter the delivery ZIP',instruction:'Enter all 5 digits so Commercial Command can establish the proposed lane.',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'v35-offer',label:'Confirm the offered linehaul rate',instruction:'Enter the gross linehaul amount being offered for this load.',valid:c=>Number(c.value)>0},
      {id:'v35-loaded-miles',label:'Confirm loaded miles',instruction:'Enter the miles traveled while carrying the load.',valid:c=>Number(c.value)>0},
      {id:'v35-cargo-weight',label:'Confirm cargo/load weight',instruction:'Enter the expected cargo weight so payload and equipment checks can run.',valid:c=>Number(c.value)>0},
      {id:'v35-deadhead-miles',label:'Confirm deadhead miles',instruction:'Enter the empty miles required to reach pickup. Use 0 only when there is no deadhead.',valid:c=>String(c.value||'').trim()!==''&&Number(c.value)>=0}
    ],
    load:[
      {id:'customer-name',label:'Enter or select the Customer / Company Name',instruction:'After the load is accepted, complete the customer record. Reuse a saved customer whenever possible.',valid:c=>String(c.value||'').trim()!==''},
      {id:'billing-street',label:'Enter or select the customer billing street',instruction:'Use a saved billing address when available.',valid:c=>String(c.value||'').trim()!==''},
      {id:'billing-zip',label:'Enter the customer billing ZIP',instruction:'Enter all 5 digits; city and state should fill automatically.',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'pickup-facility',label:'Enter or select the pickup facility / contact',instruction:'Reuse a saved pickup location when available.',valid:c=>String(c.value||'').trim()!==''},
      {id:'pickup-street',label:'Enter or select the pickup street',instruction:'Confirm the physical pickup address.',valid:c=>String(c.value||'').trim()!==''},
      {id:'pickup-zip',label:'Enter the pickup ZIP',instruction:'Enter all 5 digits; city and state should fill automatically.',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'delivery-facility',label:'Enter or select the delivery facility / contact',instruction:'Reuse a saved delivery location when available.',valid:c=>String(c.value||'').trim()!==''},
      {id:'delivery-street',label:'Enter or select the delivery street',instruction:'Confirm the physical delivery address.',valid:c=>String(c.value||'').trim()!==''},
      {id:'delivery-zip',label:'Enter the delivery ZIP',instruction:'Enter all 5 digits; city and state should fill automatically.',valid:c=>/^\d{5}$/.test(String(c.value||'').trim())},
      {id:'pickup-date',label:'Enter the pickup date',instruction:'Confirm when the load must be picked up.',valid:c=>String(c.value||'').trim()!==''},
      {id:'delivery-date',label:'Enter the delivery date',instruction:'Confirm when the load must be delivered.',valid:c=>String(c.value||'').trim()!==''}
    ]
  };

  let lastStepKey='';
  let applying=false;
  const activeView=()=>nav.querySelector('button.active')?.dataset.view||'';
  const controlFor=step=>step?.id?document.getElementById(step.id):null;
  const usable=control=>Boolean(control&&!control.disabled&&!control.readOnly&&control.offsetParent!==null);
  const valid=step=>{const c=controlFor(step);if(!c||!usable(c))return true;try{return Boolean(step.valid(c))}catch(error){return false}};

  function renameDecisionCenter(){
    const view=document.getElementById('intelligence');
    if(!view)return;
    [...view.querySelectorAll('h1,h2,h3')].forEach(el=>{
      if(/V3\.5 Load Decision Center/i.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/V3\.5 Load Decision Center/i,'V3.8 Load Decision Center');
    });
  }

  function explicitNext(){
    const list=steps[activeView()]||[];
    return list.find(step=>!valid(step))||null;
  }

  function genericNext(){
    const viewName=activeView();
    if(viewName!=='intelligence'&&viewName!=='load')return null;
    const root=document.getElementById(viewName)||document.querySelector('.view.active');
    if(!root)return null;
    const controls=[...root.querySelectorAll('input,select,textarea')].filter(usable);
    const incomplete=controls.find(c=>{
      if(c.type==='hidden'||c.type==='button'||c.type==='submit')return false;
      if(c.type==='checkbox'||c.type==='radio')return c.required&&!c.checked;
      if(/zip/i.test(c.id||'')&&String(c.value||'').trim()&& !/^\d{5}$/.test(String(c.value||'').trim()))return true;
      return c.required&&String(c.value||'').trim()==='';
    });
    if(incomplete)return{id:incomplete.id||'',control:incomplete,label:'Complete this required field',instruction:'Commercial Command found the next required item on this screen.'};
    if(viewName==='intelligence'){
      const action=root.querySelector('button[type="submit"],.form-actions .btn,#v35-run-decision,[data-run-decision]');
      if(action&&action.offsetParent!==null)return{control:action,label:'Run Load Decision',instruction:'Owner operator / fleet driver: the required profitability inputs are present. Run the decision now before spending time on detailed customer or facility information.',action:true};
    }
    return null;
  }

  function nextStep(){return explicitNext()||genericNext()}

  function clear(){
    document.querySelectorAll('.v38-hard-field-next,.v38-hard-action-next').forEach(el=>el.classList.remove('v38-hard-field-next','v38-hard-action-next'));
    document.querySelectorAll('.v38-hard-field-wrap').forEach(el=>el.classList.remove('v38-hard-field-wrap'));
    document.getElementById('v38-hard-training-banner')?.remove();
  }

  function banner(control,step){
    const root=control.closest('form')||document.getElementById(activeView())||control.parentElement;
    if(!root)return;
    const b=document.createElement('div');
    b.id='v38-hard-training-banner';
    b.innerHTML='OWNER OPERATOR / FLEET DRIVER — NEXT: '+step.label+'<small>'+step.instruction+'</small>';
    root.insertBefore(b,root.firstElementChild);
  }

  function apply({scroll=false}={}){
    if(applying)return;applying=true;
    try{
      renameDecisionCenter();clear();
      const view=activeView();
      if(view!=='intelligence'&&view!=='load'){lastStepKey='';return}
      const step=nextStep();if(!step){lastStepKey='';return}
      const control=step.control||controlFor(step);if(!control)return;
      control.classList.add(step.action?'v38-hard-action-next':'v38-hard-field-next');
      if(!step.action)(control.closest('.field')||control.parentElement)?.classList.add('v38-hard-field-wrap');
      banner(control,step);
      const key=step.id||step.label;
      const changed=lastStepKey!==key;lastStepKey=key;
      if(scroll||changed)setTimeout(()=>control.scrollIntoView({behavior:'smooth',block:'center'}),60);
    }finally{applying=false}
  }

  document.addEventListener('input',e=>{if(e.target.matches('input,select,textarea'))setTimeout(()=>apply(),0)},true);
  document.addEventListener('change',e=>{if(e.target.matches('input,select,textarea'))setTimeout(()=>apply({scroll:true}),0)},true);
  nav.addEventListener('click',()=>setTimeout(()=>apply({scroll:true}),100),true);
  window.addEventListener('flt:modules-loaded',()=>setTimeout(()=>apply({scroll:true}),120));
  window.addEventListener('flt:proposed-load-layout-ready',()=>setTimeout(()=>apply({scroll:true}),80));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
  const observer=new MutationObserver(()=>queueMicrotask(()=>apply()));
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(()=>apply({scroll:true}),150);
  setTimeout(()=>apply(),500);
})();