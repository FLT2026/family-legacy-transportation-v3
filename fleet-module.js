(() => {
  const loadScript=(src,next)=>{
    const script=document.createElement('script');
    script.src=src;
    script.charset='utf-8';
    script.async=false;
    if(next)script.addEventListener('load',next,{once:true});
    script.addEventListener('error',()=>console.error('Unable to load V3.5 module:',src),{once:true});
    document.body.appendChild(script);
  };
  loadScript('fleet-core.js?v=20260901n',()=>loadScript('v35-proposed-load.js?v=20260901n',()=>loadScript('v35-guided-workflow.js?v=20260901n',()=>loadScript('v35-data-controls.js?v=20260901n'))));
})();