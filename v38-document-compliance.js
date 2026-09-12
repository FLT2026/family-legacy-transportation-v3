(() => {
  const sourceTypes=['Load Board','Load App','Auto Auction','Broker / Dispatcher','Direct Customer','Internal / Own Customer','Other'];
  const transportationTypes=['General Freight','Auto Transport','Equipment / Machinery','Hotshot / Flatbed','Courier / Last-Mile','Other'];
  const stages=['source','compliance','pickup','delivery'];
  const docTypes={
    sourceConfirmation:['Rate Confirmation','Load Board / App Confirmation','Auction Release / Gate Pass','Customer Order / Work Order','Other Source Confirmation'],
    pickup:['Bill of Lading / Shipping Document','Pickup Receipt','Vehicle Condition / Inspection','Auction Release / Gate Pass','Pickup Photos','Other Pickup Document'],
    delivery:['Proof of Delivery','Delivery Receipt','Delivery Photos','Vehicle Delivery / Condition','Other Delivery Document'],
    compliance:['Insurance Verification','Operating Authority Verification','Driver Qualification','Equipment / Securement Verification','Permit / Special Authorization','Other Compliance Evidence']
  };
  const text=value=>String(value??'').trim();
  const docs=load=>Array.isArray(load?.documents)?load.documents:[];
  const hasDoc=(load,types,allowedStages=null)=>docs(load).some(doc=>doc?.status!=='Removed'&&types.includes(doc?.type)&&doc?.loadId===load?.id&&(!allowedStages||allowedStages.includes(doc?.stage)));
  function sourceRequirements(load){
    const type=text(load?.sourceType),missing=[];
    if(!type)missing.push('Select where this load came from.');
    if(type&&!sourceTypes.includes(type))missing.push('Select a recognized load source type.');
    if(['Load Board','Load App','Auto Auction','Broker / Dispatcher'].includes(type)&&!text(load?.sourceName))missing.push('Enter the load board, app, auction, broker, or dispatcher name.');
    if(type&&type!=='Internal / Own Customer'&&!text(load?.sourceReference))missing.push('Enter the source load, auction, confirmation, or order reference.');
    if(type==='Auto Auction'&&!hasDoc(load,['Auction Release / Gate Pass'],['source']))missing.push('Attach the auction release or gate-pass evidence in the source stage for this Load ID.');
    if(['Load Board','Load App','Broker / Dispatcher'].includes(type)&&!hasDoc(load,['Rate Confirmation','Load Board / App Confirmation','Other Source Confirmation'],['source']))missing.push('Attach the rate/load confirmation in the source stage for this Load ID.');
    if(['Direct Customer','Internal / Own Customer'].includes(type)&&!hasDoc(load,['Customer Order / Work Order','Other Source Confirmation'],['source']))missing.push('Attach or record the customer order/work authorization in the source stage for this Load ID.');
    return missing;
  }
  function complianceRequirements(input={}){
    const load=input.load||{},classification=input.classification||{},assignment=input.assignment||null,fit=input.fit||null,missing=[],hard=[];
    const transportation=text(load.transportationType||classification.transportationType||classification.primaryOperation);
    if(!transportation)missing.push('Transportation type or operation classification is required.');
    if(!assignment||assignment.status!=='Verified / Locked')missing.push('A verified Driver / Truck / Trailer assignment is required.');
    if(fit&&fit.status==='DO NOT DISPATCH')hard.push(...(fit.reasons||[]).map(reason=>'Weight / equipment gate: '+reason));
    else if(!fit||fit.status!=='PASS')missing.push('Weight & Equipment Fit Gate must pass before dispatch.');
    const carrierRole=text(classification.companyRole);
    if(['Motor Carrier','Private Carrier'].includes(carrierRole)){
      if(classification.insuranceStatus!=='verified'&&classification.insuranceOk!==true)missing.push('Insurance / cargo coverage must be verified.');
      if(classification.authorityStatus!=='verified'&&classification.authorityOk!==true)missing.push('Operating authority / service area must be verified when applicable.');
      if(classification.equipmentStatus!=='verified'&&classification.equipmentOk!==true)missing.push('Equipment / securement condition must be verified.');
    }
    if(classification.driverOk!==true)missing.push('Driver license / qualification verification must be current.');
    if(transportation.includes('Auto Transport')&&!hasDoc(load,['Vehicle Condition / Inspection','Pickup Photos'],['pickup']))missing.push('Auto Transport requires pickup condition evidence or pickup photos in the pickup stage for this Load ID.');
    if(/Equipment|Machinery|Hotshot|Flatbed/i.test(transportation)&&!hasDoc(load,['Equipment / Securement Verification','Pickup Photos','Other Compliance Evidence'],['compliance','pickup']))missing.push('Equipment/flatbed transport requires securement or pickup-condition evidence in the compliance or pickup stage for this Load ID.');
    if(load.requiresPermit===true&&!hasDoc(load,['Permit / Special Authorization'],['compliance']))missing.push('Required permit or special authorization is missing from the compliance stage for this Load ID.');
    return{transportation,missing,hard};
  }
  function evaluate(input={}){
    const load=input.load||{},sourceMissing=sourceRequirements(load),compliance=complianceRequirements(input),hard=[...compliance.hard],missing=[...sourceMissing,...compliance.missing];
    const status=hard.length?'DO NOT DISPATCH':missing.length?'MORE INFORMATION REQUIRED':'PASS';
    return{status,pass:status==='PASS',loadId:load.id||'',sourceType:text(load.sourceType),transportationType:compliance.transportation,reasons:[...hard,...missing],hardStops:hard,missing};
  }
  function addDocument(load,input,options={}){
    if(!load?.id)return{ok:false,reason:'Load ID is required before attaching a document.'};
    const type=text(input?.type),stage=text(input?.stage||'source'),filename=text(input?.filename),classificationSource=text(input?.classificationSource||'human-confirmed');
    const allowed=Object.values(docTypes).flat();if(!allowed.includes(type))return{ok:false,reason:'Select a recognized document type.'};
    if(!stages.includes(stage))return{ok:false,reason:'Select a recognized document stage.'};
    if(!filename)return{ok:false,reason:'Document filename or captured-image label is required.'};
    load.documents=docs(load);const document={id:text(options.id)||'DOC-'+String(load.id).replace(/[^A-Z0-9]/gi,'')+'-'+Date.now().toString(36),loadId:String(load.id),type,stage,filename,mimeType:text(input?.mimeType),classificationSource,status:'Attached',capturedAt:(options.now||new Date()).toISOString()};load.documents.push(document);return{ok:true,document};
  }
  window.FLTDocumentCompliance={sourceTypes,transportationTypes,stages,docTypes,sourceRequirements,complianceRequirements,evaluate,addDocument};
})();
