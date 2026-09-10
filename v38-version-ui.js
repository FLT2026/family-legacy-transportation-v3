(() => {
  const release='V3.8';
  const milestone='OPERATIONAL INTEGRITY';
  let stamping=false;
  const stamp=()=>{
    if(stamping)return;
    stamping=true;
    try{
      document.title='Family Legacy Commercial Command™ — '+release;
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){
        const parent=node.parentElement;
        if(!parent||['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(parent.tagName))continue;
        const original=node.nodeValue||'';
        const updated=original
          .replace(/FAMILY LEGACY COMMERCIAL COMMAND\s*™?\s*\/\s*V3\.[5-7]/ig,'FAMILY LEGACY COMMERCIAL COMMAND™ / '+release)
          .replace(/V3\.[5-7]\s+COMMERCIAL COMMAND/ig,release+' COMMERCIAL COMMAND')
          .replace(/V3\.[5-7]\s+Test Gate/ig,release+' Test Gate');
        if(updated!==original)node.nodeValue=updated;
      }
      let badge=document.getElementById('v38-release-badge');
      if(!badge){badge=document.createElement('div');badge.id='v38-release-badge';document.body.appendChild(badge)}
      badge.textContent=release+' · '+milestone;
      badge.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#163d35;color:white;padding:8px 12px;border-radius:999px;font:700 12px/1.2 system-ui;box-shadow:0 4px 14px rgba(0,0,0,.18)';
      window.FLTRelease={version:release,milestone};
    }finally{stamping=false;}
  };
  let timer=null;
  const observer=new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(stamp,20);
  });
  stamp();
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  setTimeout(stamp,250);
  setTimeout(stamp,1000);
  setTimeout(stamp,2500);
})();
