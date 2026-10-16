const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function fixture(){
  const nodes=new Set(),documentListeners={},windowListeners={},timers=[];
  const effects={routes:[],scrolls:[],focus:[]};
  let active='dashboard';
  class Element{
    constructor(id='',classes=''){
      this.id=id;this.children=[];this.parentElement=null;this.dataset={};this.style={};
      this.value='';this.textContent='';this.disabled=false;this.readOnly=false;this.offsetParent={};
      this.listeners={};this.classes=new Set(classes.split(' ').filter(Boolean));
      this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};
      nodes.add(this);
    }
    get firstElementChild(){return this.children[0]||null}
    get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null}
    addEventListener(type,handler){(this.listeners[type]??=[]).push(handler)}
    insertBefore(child,reference){
      if(child.parentElement)child.remove();
      this.children.splice(reference?this.children.indexOf(reference):this.children.length,0,child);
      child.parentElement=this;return child;
    }
    appendChild(child){return this.insertBefore(child,null)}
    insertAdjacentElement(position,child){
      assert.equal(position,'afterend');
      return this.parentElement.insertBefore(child,this.nextElementSibling);
    }
    remove(){
      if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);
      this.parentElement=null;
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null}
    querySelectorAll(selector){
      if(this===nav&&selector==='button.active')return [active==='intelligence'?decision:dashboard];
      const descendants=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);
      if(selector==='*')return descendants;
      if(selector.startsWith('.'))return descendants.filter(node=>node.classes.has(selector.slice(1)));
      return [];
    }
    closest(selector){
      if(selector==='button[data-view]')return this.dataset.view?this:null;
      if(selector==='form')return this===form?this:this.parentElement?.closest(selector)||null;
      if(selector==='.field')return this.classes.has('field')?this:this.parentElement?.closest(selector)||null;
      return null;
    }
    matches(){return true}
    scrollIntoView(){effects.scrolls.push(this.id)}
    focus(){effects.focus.push(this.id)}
  }
  const nav=new Element('nav'),dashboard=new Element('dashboard-nav'),decision=new Element('decision-nav');
  dashboard.dataset.view='dashboard';decision.dataset.view='intelligence';
  nav.appendChild(dashboard);nav.appendChild(decision);
  const cta=new Element('dashboard-continue');cta.dataset.viewJump='intelligence';cta.dataset.v38AuthorityBound='intelligence';
  const form=new Element('v35-decision-form');
  const core=new Element('v38-core-load-decision-fields','panel');
  const master=new Element('v35-master-selection','panel');
  const quick=new Element('','v38-quick-section');
  form.appendChild(core);form.appendChild(master);form.appendChild(quick);
  const control=id=>{const field=new Element('','field'),input=new Element(id);field.appendChild(input);form.appendChild(field);return input};
  ['v38-quick-source','v38-quick-pickup-zip','v38-quick-delivery-zip','v35-offer','v35-loaded-miles','v35-cargo-weight','v35-deadhead-miles','v35-mpg','v35-maintenance','v35-tires','v35-fixed-cpm','v35-target-profit'].forEach(control);
  ['driver','truck','trailer'].forEach(kind=>{const input=control('v35-estimate-'+kind);input.value='saved-'+kind});
  const banner=new Element('banner'),title=new Element('title'),eyebrow=new Element('','eyebrow'),copy=new Element('','subtle');
  banner.querySelector=selector=>selector==='h2'?title:selector==='.eyebrow'?eyebrow:copy;
  const get=id=>[...nodes].find(node=>node.id===id)||null;
  const storage=new Map([['flt-v38-operating-assumptions','{"averageMpg":10,"maintenanceReserve":0.2,"tireReserve":0.05,"fixedCpm":0.3,"targetProfit":300}']]);
  const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
  const document={
    hidden:false,head:new Element('head'),createElement:()=>new Element(),getElementById:get,
    querySelector:selector=>selector==='#intelligence .v35-banner'?banner:null,
    querySelectorAll(selector){
      if(selector==='[data-view]')return [dashboard,decision];
      if(selector==='[data-view-jump]')return [cta];
      return selector.split(',').flatMap(part=>part.startsWith('.')?[...nodes].filter(node=>node.classes.has(part.slice(1))):[]);
    },
    addEventListener(type,handler){(documentListeners[type]??=[]).push(handler)}
  };
  const window={addEventListener(type,handler){(windowListeners[type]??=[]).push(handler)}};
  const context=vm.createContext({
    document,window,localStorage,console,
    setTimeout(handler){timers.push(handler)},
    showView(view){effects.routes.push(view);active=view}
  });
  const run=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  const flush=()=>{let count=0;while(timers.length){assert.ok(count++<50,'Timers must settle');timers.shift()()}};
  const click=button=>{
    const event={target:button,preventDefault(){}};
    if(button.dataset.view)(nav.listeners.click||[]).forEach(handler=>handler(event));
    (button.listeners.click||[]).forEach(handler=>handler(event));
    button.onclick?.(event);
  };
  return {context,run,flush,click,get,form,master,quick,core,title,storage,effects,documentListeners,windowListeners,cta,decision,dashboard};
}

const f=fixture();
const originalStorage=JSON.stringify([...f.storage]);
f.run('v38-first-load-cleanup-hardfix.js');
assert.deepEqual(f.form.children.slice(0,3),[f.master,f.quick,f.core],'Saved rig must precede Fast Load and economics');
assert.equal(f.title.textContent,'Evaluate Proposed Load');
for(const kind of ['driver','truck','trailer'])assert.equal(f.get('v35-estimate-'+kind).value,'saved-'+kind);
assert.equal(f.get('v35-mpg').value,'10','Saved assumptions must still populate the estimate');
f.context.window.FLTFirstLoadCleanup.reorderFirstTimeFlow();
assert.deepEqual(f.form.children.slice(0,3),[f.master,f.quick,f.core],'Repeated layout must remain stable');
assert.equal(JSON.stringify([...f.storage]),originalStorage,'Layout and guidance must not rewrite saved information');

const shell=fs.readFileSync('index.html','utf8');
const start=shell.indexOf("document.querySelectorAll('[data-view]').forEach");
const end=shell.indexOf('function ensureRecordView',start);
assert.ok(start>=0&&end>start,'Application navigation bindings must be found');
vm.runInContext(shell.slice(start,end),f.context);
f.cta.onclick=()=>f.click(f.decision);
f.run('v38-process-training-hardfix.js');
f.flush();
f.click(f.cta);f.flush();
assert.deepEqual(f.effects.routes,['intelligence'],'Dashboard Continue must route only once through the nav button');
assert.ok(f.get('v38-quick-source').classList.contains('v38-hard-field-next'),'Initial entry must still highlight NEXT');
f.click(f.decision);f.flush();
assert.deepEqual(f.effects.scrolls,[],'Entering or reselecting a workflow must not scroll to NEXT');
assert.deepEqual(f.effects.focus,[],'NEXT guidance must not steal focus');

for(const [id,value,next] of [
  ['v38-quick-source','Load Board','v38-quick-pickup-zip'],
  ['v38-quick-pickup-zip','27601','v38-quick-delivery-zip'],
  ['v38-quick-delivery-zip','28202','v35-offer']
]){
  f.get(id).value=value;
  f.documentListeners.change.forEach(handler=>handler({target:f.get(id)}));
  f.flush();
  assert.ok(f.get(next).classList.contains('v38-hard-field-next'),'NEXT must advance to '+next);
}
f.click(f.dashboard);f.flush();f.click(f.cta);f.flush();
f.windowListeners['flt:modules-loaded'].forEach(handler=>handler());
f.documentListeners.visibilitychange.forEach(handler=>handler());
f.flush();
assert.deepEqual(f.effects.scrolls,[],'Delayed startup and visibility guidance must not scroll');
assert.deepEqual(f.effects.focus,[]);
assert.equal(JSON.stringify([...f.storage]),originalStorage);
delete f.cta.dataset.v38AuthorityBound;
f.cta.onclick=null;f.click(f.cta);
assert.equal(f.effects.routes.at(-1),'intelligence','Unmanaged data-view-jump controls must still navigate');
console.log('V3.8 Dashboard routing, passive NEXT guidance, and saved-rig layout checks passed.');
