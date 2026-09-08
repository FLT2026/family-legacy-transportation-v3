(() => {
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:null};
  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const verifiedDate=value=>{if(!value)return false;const date=new Date(String(value)+'T12:00:00');return Number.isFinite(date.getTime())&&date<=new Date()};
  function evaluate(input={}){
    const load=input.load||{},assignment=input.assignment||null,driver=input.driver||null,truck=input.truck||null,trailer=input.trailer||null;
    const missing=[],hard=[];
    if(!load.id)missing.push('Load ID is missing.');
    if(!assignment||assignment.status!=='Verified / Locked')missing.push('A verified Driver / Truck / Trailer assignment is required.');
    if(!driver)missing.push('Assigned driver record is missing.');
    if(!truck)missing.push('Assigned truck record is missing.');
    if(!trailer)missing.push('Assigned trailer record is missing.');
    if(driver){if(driver.status!=='active')hard.push('Assigned driver is not Active / Verified.');if(!driver.licenseState||!driver.expiration)missing.push('Assigned driver license state or expiration is missing.');else{const exp=new Date(driver.expiration+'T23:59:59');if(!Number.isFinite(exp.getTime()))missing.push('Assigned driver expiration date is invalid.');else if(exp<new Date())hard.push('Assigned driver license is expired.');}}
    if(truck){if(truck.status!=='active')hard.push('Assigned truck is not Active / Verified.');if(!validVin(truck.vin))missing.push('Assigned truck needs a valid 17-character VIN.');if(truck.weightBasis!=='scale-ticket')missing.push('Assigned truck needs a verified ready-to-work scale ticket.');if(!verifiedDate(truck.verificationDate))missing.push('Assigned truck scale verification date is missing, invalid, or in the future.');}
    if(trailer){if(trailer.status!=='active')hard.push('Assigned trailer is not Active / Verified.');if(!validVin(trailer.vin))missing.push('Assigned trailer needs a valid 17-character VIN.');if(trailer.weightBasis!=='scale-ticket')missing.push('Assigned trailer needs a verified ready-to-work scale ticket.');if(!verifiedDate(trailer.verificationDate))missing.push('Assigned trailer scale verification date is missing, invalid, or in the future.');}
    const cargo=num(load.cargoWeight??load.weight??load.cargo?.weight),truckEmpty=num(truck?.emptyWeight),trailerEmpty=num(trailer?.emptyWeight),truckGvwr=num(truck?.gvwr),truckGcwr=num(truck?.gcwr),trailerGvwr=num(trailer?.gvwr),frontGawr=num(truck?.frontGawr),rearGawr=num(truck?.rearGawr),frontTire=num(truck?.frontTireCapacity),rearTire=num(truck?.rearTireCapacity),truckHitch=num(truck?.hitchCapacity),trailerAxle=num(trailer?.axleCapacity),trailerTire=num(trailer?.tireCapacity),trailerHitch=num(trailer?.hitchCapacity);
    const required=[['cargo weight',cargo],['truck empty weight',truckEmpty],['trailer empty weight',trailerEmpty],['truck GVWR',truckGvwr],['truck GCWR',truckGcwr],['trailer GVWR',trailerGvwr],['truck front GAWR',frontGawr],['truck rear GAWR',rearGawr],['truck front tire capacity',frontTire],['truck rear tire capacity',rearTire],['truck hitch rating',truckHitch],['trailer axle rating',trailerAxle],['trailer tire capacity',trailerTire],['trailer hitch/coupler rating',trailerHitch]];
    required.forEach(([label,value])=>{if(value===null||value<=0)missing.push('Verified '+label+' is required.')});
    const metrics={cargoWeight:cargo,truckEmpty,trailerEmpty,estimatedCombinationWeight:null,combinedGvwr:null,gcwr:truckGcwr,estimatedPayloadAvailable:null};
    if(required.every(([,value])=>value!==null&&value>0)){
      metrics.estimatedCombinationWeight=truckEmpty+trailerEmpty+cargo;metrics.combinedGvwr=truckGvwr+trailerGvwr;metrics.estimatedPayloadAvailable=Math.max(0,Math.min(metrics.combinedGvwr,truckGcwr)-truckEmpty-trailerEmpty);
      if(truckEmpty>=truckGvwr)hard.push('Truck ready-to-work weight is not below truck GVWR.');
      if(trailerEmpty>=trailerGvwr)hard.push('Trailer ready-to-work weight is not below trailer GVWR.');
      if(truckGvwr>truckGcwr)hard.push('Truck GVWR exceeds manufacturer GCWR.');
      if(frontGawr+rearGawr<truckGvwr)hard.push('Truck front plus rear GAWR is lower than truck GVWR.');
      if(frontTire<frontGawr)hard.push('Truck front-axle tire capacity is lower than front GAWR.');
      if(rearTire<rearGawr)hard.push('Truck rear-axle tire capacity is lower than rear GAWR.');
      if(trailerAxle<trailerGvwr)hard.push('Trailer combined axle rating is lower than trailer GVWR.');
      if(trailerTire<trailerGvwr)hard.push('Trailer combined tire capacity is lower than trailer GVWR.');
      if(trailerHitch<trailerGvwr)hard.push('Trailer hitch/coupler rating is lower than trailer GVWR.');
      if(metrics.estimatedCombinationWeight>truckGcwr)hard.push('Estimated loaded combination weight exceeds manufacturer GCWR.');
      if(metrics.estimatedCombinationWeight>metrics.combinedGvwr)hard.push('Estimated loaded combination weight exceeds combined GVWR.');
      if(cargo>metrics.estimatedPayloadAvailable)hard.push('Cargo weight exceeds the calculated available payload for the verified combination.');
      const effectiveHitch=Math.min(truckHitch,trailerHitch);if(effectiveHitch<trailerGvwr)hard.push('The limiting hitch/coupler rating is below trailer GVWR.');
    }
    const cargoLength=num(load.cargoLength??load.cargo?.length),cargoWidth=num(load.cargoWidth??load.cargo?.width),cargoHeight=num(load.cargoHeight??load.cargo?.height),deckLength=num(trailer?.deckLength),deckWidth=num(trailer?.deckWidth),maxCargoHeight=num(trailer?.maxCargoHeight);
    if(cargoLength&&deckLength&&cargoLength>deckLength)hard.push('Cargo length exceeds available trailer deck length.');else if(cargoLength&&!deckLength)missing.push('Trailer deck length is required to verify cargo fit.');
    if(cargoWidth&&deckWidth&&cargoWidth>deckWidth)hard.push('Cargo width exceeds available trailer deck width.');else if(cargoWidth&&!deckWidth)missing.push('Trailer deck width is required to verify cargo fit.');
    if(cargoHeight&&maxCargoHeight&&cargoHeight>maxCargoHeight)hard.push('Cargo height exceeds the configured trailer cargo-height limit.');
    const transportationType=String(load.transportationType||load.operationType||'').trim();if(transportationType&&Array.isArray(trailer?.approvedTransportationTypes)&&trailer.approvedTransportationTypes.length&&!trailer.approvedTransportationTypes.includes(transportationType))hard.push('Assigned trailer is not approved for this transportation type.');
    const status=hard.length?'DO NOT DISPATCH':missing.length?'MORE INFORMATION REQUIRED':'PASS';
    return{status,pass:status==='PASS',loadId:load.id||'',reasons:[...hard,...missing],hardStops:hard,missing,metrics};
  }
  window.FLTWeightEquipmentFit={evaluate};
})();
