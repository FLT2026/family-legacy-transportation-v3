(() => {
  const loadScript=(src,next)=>{
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    if(next)script.addEventListener('load',next,{once:true});
    script.addEventListener('error',()=>console.error('Unable to load V3.5 module:',src),{once:true});
    document.body.appendChild(script);
  };
  loadScript('fleet-core.js',()=>loadScript('v35-proposed-load.js'));
})();