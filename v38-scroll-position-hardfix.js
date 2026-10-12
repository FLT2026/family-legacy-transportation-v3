(() => {
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||window.FLTScrollPositionHardfix)return;

  const top=()=>{
    try{
      if('scrollRestoration' in history)history.scrollRestoration='manual';
      window.scrollTo(0,0);
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      const main=document.querySelector('main');
      if(main)main.scrollTop=0;
      const nav=document.getElementById('nav');
      if(nav)nav.scrollTop=0;
    }catch(error){}
  };

  const topAfterViewChange=()=>{
    requestAnimationFrame(()=>{
      top();
      requestAnimationFrame(top);
    });
  };

  top();
  document.addEventListener('DOMContentLoaded',topAfterViewChange,{once:true});
  window.addEventListener('load',topAfterViewChange,{once:true});
  window.addEventListener('pageshow',topAfterViewChange);
  window.addEventListener('flt:modules-loaded',topAfterViewChange);

  document.addEventListener('click',event=>{
    const control=event.target.closest?.('[data-view],[data-view-jump],#v38-accept-proposal');
    if(!control)return;
    setTimeout(topAfterViewChange,0);
  },true);

  window.FLTScrollPositionHardfix={top,topAfterViewChange};
})();
