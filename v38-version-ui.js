(() => {
  const release='V3.8';
  const milestone='OPERATIONAL INTEGRITY';

  const stamp=()=>{
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
    document.getElementById('v38-release-badge')?.remove();
    window.FLTRelease={version:release,milestone};
  };

  stamp();
  window.addEventListener('flt:modules-loaded',stamp,{once:true});
})();
