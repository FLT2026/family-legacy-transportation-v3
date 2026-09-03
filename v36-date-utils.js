((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FLTDate=api;
})(typeof window!=='undefined'?window:globalThis,()=>{
  const parts=value=>{
    const raw=String(value||'').trim();
    const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const us=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(iso)return[Number(iso[1]),Number(iso[2]),Number(iso[3])];
    if(us)return[Number(us[3]),Number(us[1]),Number(us[2])];
    return null;
  };
  const key=([year,month,day])=>year*10000+month*100+day;
  const localToday=(now=new Date())=>[now.getFullYear(),now.getMonth()+1,now.getDate()];
  const isCalendarDate=value=>{
    const parsed=parts(value);if(!parsed)return false;
    const [year,month,day]=parsed,date=new Date(year,month-1,day);
    return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
  };
  const isNotFuture=(value,now=new Date())=>isCalendarDate(value)&&key(parts(value))<=key(localToday(now));
  const todayISO=(now=new Date())=>localToday(now).map((value,index)=>index?String(value).padStart(2,'0'):String(value)).join('-');
  const configure=root=>root?.querySelectorAll?.('input[name="verificationDate"]').forEach(input=>{
    input.max=todayISO();
    if(input.dataset.fltDateConfigured)return;
    input.dataset.fltDateConfigured='true';
    input.addEventListener('input',()=>input.setCustomValidity(''));
  });
  return{isCalendarDate,isNotFuture,todayISO,configure};
});

if(typeof document!=='undefined'){
  const configure=()=>window.FLTDate.configure(document);
  configure();
  new MutationObserver(configure).observe(document.documentElement,{childList:true,subtree:true});
}
