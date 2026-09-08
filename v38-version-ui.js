(() => {
  const release='V3.8';
  const milestone='OPERATIONAL INTEGRITY';
  document.title='Family Legacy Commercial Command™ — '+release;
  const replaceText=(root=document)=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;if(!parent||['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(parent.tagName))return;
      if(/FAMILY LEGACY COMMERCIAL COMMAND\s*™?\s*\/\s*V3\.5/i.test(node.nodeValue||''))node.nodeValue=(node.nodeValue||'').replace(/FAMILY LEGACY COMMERCIAL COMMAND\s*™?\s*\/\s*V3\.5/ig,'FAMILY LEGACY COMMERCIAL COMMAND™ / '+release);
      if(/^\s*V3\.5 COMMERCIAL COMMAND\b/i.test(node.nodeValue||''))node.nodeValue=(node.nodeValue||'').replace(/V3\.5 COMMERCIAL COMMAND/ig,release+' COMMERCIAL COMMAND');
    });
  };
  replaceText();
  const badge=document.createElement('div');badge.id='v38-release-badge';badge.textContent=release+' · '+milestone;badge.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;background:#163d35;color:white;padding:8px 12px;border-radius:999px;font:700 12px/1.2 system-ui;box-shadow:0 4px 14px rgba(0,0,0,.18)';document.body.appendChild(badge);
  window.FLTRelease={version:release,milestone};
})();
