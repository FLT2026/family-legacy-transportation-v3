(() => {
  if(typeof document==='undefined')return;
  const nav=document.getElementById('nav');
  if(!nav)return;

  const style=document.createElement('style');
  style.id='v38-process-training-hardfix-style';
  style.textContent=`
    .v38-hard-field-next,.v38-hard-action-next{border:5px solid #ffea00!important;background:#fff45c!important;color:#102f2b!important;box-shadow:0 0 0 7px rgba(255,234,0,.45),0 5px 18px rgba(0,0,0,.16)!important;outline:none!important}
    .v38-hard-field-wrap{position:relative!important}.v38-hard-field-wrap::before{content:'NEXT';position:absolute;right:8px;top:-15px;z-index:60;background:#ffea00;color:#102f2b;border:2px solid #102f2b;font-size:11px;font-weight:1000;padding:5px 9px;border-radius:999px}
    #v38-hard-training-banner{position:sticky;top:8px;z-index:55;margin:0 0 14px;padding:13px 16px;border:4px solid #ffea00;border-left:10px solid #102f2b;background:#fff45c;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.16);color:#102f2b;font-weight:900;font-size:15px}
    #v38-hard-training-banner small{display:block;margin-top:5px;font-weight:750;color:#264842;line-height:1.35}
  `;
  document.head.appendChild(style);

  const steps={intelligence:[
    ['v38-quick-source','Select where this load came from','Owner operator / fleet driver: choose the load board, broker, auction, direct customer, or other source.',c=>Boolean(c.value)],
    ['v38-quick-pickup-zip','Enter the pickup ZIP','Enter all 5 digits. City and state will be filled automatically when available.',c=>/^\d{5}$/.test(String(c.value||'').trim())],
    ['v38-quick-delivery-zip','Enter the delivery ZIP','Enter all 5 digits so Commercial Command can establish the proposed lane.',c=>/^\d{5}$/.test(String(c.value||'').trim())],
    ['v35-offer','Confirm the offered linehaul rate','Enter the gross linehaul amount being offered for this load.',c=>Number(c.value)>0],
    ['v35-loaded-miles','Confirm loaded miles','Enter the miles traveled while carrying the load.',c=>Number(c.value)>0],
    ['v35-cargo-weight','Confirm cargo/load weight','Enter the expected cargo weight so payload and equipment checks can run.',c=>Number(c.value)>0],
    ['v35-deadhead-miles','Confirm deadhead miles','Enter the empty miles required to reach pickup. Use 0 only when there is no deadhead.',c=>String(c.value||'').trim()!==''&&Number(c.value)>=0]
  ],load:[
    ['customer-name','Enter or select the Customer / Company Name','After the load is accepted, complete the customer record. Reuse a saved customer whenever possible.',c=>String(c.value||'').trim()!=='' ],
    ['billing-street','Enter or select the customer billing street','Use a saved billing address when available.',c=>String(c.value||'').trim()!=='' ],
    ['billing-zip','Enter the customer billing ZIP','Enter all 5 digits; city and state should fill automatically.',c=>/^\d{5}$/.test(String(c.value||'').trim())],
    ['pickup-facility','Enter or select the pickup facility / contact','Reuse a saved pickup location when available.',c=>String(c.value||'').trim()!=='' ],
    ['pickup-street','Enter or select the pickup street','Confirm the physical pickup address.',c=>String(c.value||'').trim()!=='' ],
    ['pickup-zip','Enter the pickup ZIP','Enter all 5 digits; city and state should fill automatically.',c=>/^\d{5}$/.test(String(c.value||'').trim())],
    ['delivery-facility','Enter or select the delivery facility / contact','Reuse a saved delivery location when available.',c=>String(c.value||'').trim()!=='' ],
    ['delivery-street','Enter or select the delivery street','Confirm the physical delivery address.',c=>String(c.value||'').trim()!=='' ],
    ['delivery-zip','Enter the delivery ZIP','Enter all 5 digits; city and state should fill automatically.',c=>/^\d{5}$/.test(String(c.value||'').trim())],
    ['pickup-date','Enter the pickup date','Confirm when the load must be picked up.',c=>String(c.value||'').trim()!=='' ],
    ['delivery-date','Enter the delivery date','Confirm when the load must be delivered.',c=>String(c.value||'').trim()!=='' ]
  ]};

  let scheduled=false,lastKey='';
  const activeView=()=>nav.querySelector('button.active')?.dataset.view||'';
  const usable=c=>Boolean(c&&!c.disabled&&!c.readOnly&&c.offsetParent!==null);
  const normalize=a=>({id:a[0],label:a[1],instruction:a[2],valid:a[3]});
  function rename(){const root=document.getElementById('intelligence');if(root)[...root.querySelectorAll('h1,h2,h3')].forEach(el=>{if(/V3\.5 Load Decision Center/i.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/V3\.5 Load Decision Center/i,'V3.8 Load Decision Center')})}
  function explicit(){for(const raw of steps[activeView()]||[]){const s=normalize(raw),c=document.getElementById(s.id);if(usable(c)){let ok=false;try{ok=!!s.valid(c)}catch(e){}if(!ok)return{...s,control:c}}}return null}
  function generic(){const view=activeView();if(!['intelligence','load'].includes(view))return null;const root=document.getElementById(view)||document.querySelector('.view.active');if(!root)return null;const c=[...root.querySelectorAll('input,select,textarea')].filter(usable).find(x=>x.type!=='hidden'&&x.type!=='button'&&x.type!=='submit'&&((/zip/i.test(x.id||'')&&String(x.value||'').trim()&&!/^\d{5}$/.test(String(x.value||'').trim()))||(x.required&&String(x.value||'').trim()==='')));if(c)return{id:c.id,control:c,label:'Complete this required field',instruction:'Commercial Command found the next required item on this screen.'};if(view==='intelligence'){const a=root.querySelector('button[type="submit"],.form-actions .btn,#v35-run-decision,[data-run-decision]');if(usable(a))return{control:a,label:'Run Load Decision',instruction:'Owner operator / fleet driver: required profitability inputs are present. Run the decision now.',action:true}}return null}
  function clear(){document.querySelectorAll('.v38-hard-field-next,.v38-hard-action-next').forEach(e=>e.classList.remove('v38-hard-field-next','v38-hard-action-next'));document.querySelectorAll('.v38-hard-field-wrap').forEach(e=>e.classList.remove('v38-hard-field-wrap'));document.getElementById('v38-hard-training-banner')?.remove()}
  function apply(scroll=false){scheduled=false;rename();clear();const view=activeView();if(!['intelligence','load'].includes(view)){lastKey='';return}const s=explicit()||generic();if(!s?.control)return;const c=s.control;c.classList.add(s.action?'v38-hard-action-next':'v38-hard-field-next');if(!s.action)(c.closest('.field')||c.parentElement)?.classList.add('v38-hard-field-wrap');const root=c.closest('form')||document.getElementById(view)||c.parentElement;if(root){const b=document.createElement('div');b.id='v38-hard-training-banner';b.innerHTML='OWNER OPERATOR / FLEET DRIVER — NEXT: '+s.label+'<small>'+s.instruction+'</small>';root.insertBefore(b,root.firstElementChild)}const key=s.id||s.label;if(scroll||key!==lastKey)setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'center'}),60);lastKey=key}
  function schedule(scroll=false){if(scheduled)return;scheduled=true;setTimeout(()=>apply(scroll),40)}
  document.addEventListener('input',e=>{if(e.target.matches('input,select,textarea'))schedule(false)},true);
  document.addEventListener('change',e=>{if(e.target.matches('input,select,textarea'))schedule(true)},true);
  nav.addEventListener('click',()=>schedule(true),true);
  window.addEventListener('flt:modules-loaded',()=>schedule(true));
  window.addEventListener('flt:proposed-load-layout-ready',()=>schedule(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(false)});
  setTimeout(()=>apply(true),150);
})();