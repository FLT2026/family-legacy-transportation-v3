(() => {
  const release='V3.8';
  const milestone='OPERATIONAL INTEGRITY';
  document.title='Family Legacy Commercial Command™ — '+release;
  const replaceText=(root=document)=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;if(!parent||['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(parent.tagName))return;
      let text=node.nodeValue||'';
      text=text.replace(/FAMILY LEGACY COMMERCIAL COMMAND\s*™?\s*\/\s*V3\.[5-7]/ig,'FAMILY LEGACY COMMERCIAL COMMAND™ / '+release);
      text=text.replace(/V3\.[5-7]\s+COMMERCIAL COMMAND/ig,release+' COMMERCIAL COMMAND');
      node.nodeValue=text;
    });
  };
  const apply=()=>{replaceText();document.title='Family Legacy Commercial Command™ — '+release;};
  apply();
  const observer=new MutationObserver(()=>apply());
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  let badge=document.getElementById('v38-release-badge');
  if(!badge){badge=document.createElement('div');badge.id='v38-release-badge';document.body.appendChild(badge)}
  badge.textContent=release+' · '+milestone;
  badge.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#163d35;color:white;padding:8px 12px;border-radius:999px;font:700 12px/1.2 system-ui;box-shadow:0 4px 14px rgba(0,0,0,.18)';
  window.FLTRelease={version:release,milestone};
})();
