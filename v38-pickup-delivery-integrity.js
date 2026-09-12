(() => {
  const docs=load=>Array.isArray(load?.documents)?load.documents:[];
  const has=(load,stage,types)=>docs(load).some(doc=>doc?.loadId===load?.id&&doc?.status!=='Removed'&&doc?.stage===stage&&types.includes(doc?.type));
  function pickup(load){
    const missing=[],transport=String(load?.transportationType||'');
    if(!load?.id)missing.push('Load ID is required.');
    if(!load?.pickupProof?.signature)missing.push('Pickup signature is required.');
    if(!String(load?.pickupProof?.name||'').trim())missing.push('Pickup signer name is required.');
    if(!String(load?.pickupProof?.time||'').trim())missing.push('Pickup time is required.');
    const general=has(load,'pickup',['Bill of Lading / Shipping Document','Pickup Receipt','Other Pickup Document']);
    if(!general)missing.push('Attach a pickup shipping document, BOL, pickup receipt, or approved pickup document to this Load ID.');
    if(/Auto Transport/i.test(transport)&&!has(load,'pickup',['Vehicle Condition / Inspection','Pickup Photos']))missing.push('Auto Transport requires pickup vehicle-condition evidence or pickup photos.');
    if(/Equipment|Machinery|Hotshot|Flatbed/i.test(transport)&&!has(load,'pickup',['Pickup Photos','Other Pickup Document']))missing.push('Equipment/flatbed pickup requires condition or securement photo evidence.');
    return{stage:'pickup',loadId:load?.id||'',pass:missing.length===0,status:missing.length?'INCOMPLETE':'PASS',missing};
  }
  function delivery(load){
    const missing=[],transport=String(load?.transportationType||'');
    const pickupResult=pickup(load);
    if(!pickupResult.pass)missing.push('Pickup integrity must pass before delivery can be completed.');
    if(!load?.deliveryProof?.signature)missing.push('Delivery signature is required.');
    if(!String(load?.deliveryProof?.name||'').trim())missing.push('Delivery receiver name is required.');
    if(!String(load?.deliveryProof?.time||'').trim())missing.push('Delivery time is required.');
    if(!has(load,'delivery',['Proof of Delivery','Delivery Receipt','Other Delivery Document']))missing.push('Attach a POD, delivery receipt, or approved delivery document to this Load ID.');
    if(/Auto Transport/i.test(transport)&&!has(load,'delivery',['Vehicle Delivery / Condition','Delivery Photos']))missing.push('Auto Transport requires delivery-condition evidence or delivery photos.');
    return{stage:'delivery',loadId:load?.id||'',pass:missing.length===0,status:missing.length?'INCOMPLETE':'PASS',missing,pickup:pickupResult};
  }
  function operational(load){const p=pickup(load),d=delivery(load);return{loadId:load?.id||'',pickup:p,delivery:d,pass:p.pass&&d.pass,status:p.pass&&d.pass?'PASS':'INCOMPLETE',reasons:[...p.missing,...d.missing]}}
  window.FLTPickupDeliveryIntegrity={pickup,delivery,operational};
})();
