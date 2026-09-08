(() => {
  const num=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null};
  const first=(...values)=>values.find(value=>value!==undefined&&value!==null&&value!=='')??null;
  const address=value=>{const item=value&&typeof value==='object'?value:{};return{facility:first(item.facility,item.name,item.contact),street:first(item.street,item.address),city:first(item.city),state:first(item.state),zip:first(item.zip,item.postalCode)};};
  function resolve(input={}){
    const load=input.load||{},business=input.business||{},assignment=input.assignment||null,fleet=input.fleet||{},actualTrip=input.actualTrip||load.actualTrip||null;
    const driver=assignment?fleet.drivers?.find(item=>item.id===assignment.driverId)||null:null;
    const truck=assignment?fleet.trucks?.find(item=>item.id===assignment.truckId)||null:null;
    const trailer=assignment?fleet.trailers?.find(item=>item.id===assignment.trailerId)||null:null;
    const expenses=Array.isArray(load.expenses)?load.expenses:[];
    const payments=Array.isArray(load.payments)?load.payments:[];
    const totalExpenses=expenses.reduce((sum,item)=>sum+(num(item.amount)||0),0);
    const totalPayments=payments.reduce((sum,item)=>sum+(num(item.amount)||0),0);
    const loadedMiles=num(first(load.loadedMiles,actualTrip?.loadedMiles));
    const pickupDeadhead=num(first(load.deadheadMiles,load.deadheadToPickup,actualTrip?.deadheadMiles));
    const returnDeadhead=num(first(load.returnDeadheadMiles,load.returnDeadhead,load.repositioningMiles,actualTrip?.returnDeadheadMiles));
    const explicitTotal=num(first(load.totalMiles,load.mileage,actualTrip?.totalMiles,actualTrip?.businessMiles));
    const derivedTotal=[loadedMiles,pickupDeadhead,returnDeadhead].some(value=>value!==null)?(loadedMiles||0)+(pickupDeadhead||0)+(returnDeadhead||0):null;
    const totalMiles=explicitTotal??derivedTotal;
    const revenue=num(first(load.actualRevenue,load.revenue,load.estimatedRevenue))||0;
    const invoice=load.invoice||null;
    const customerAddress=address(first(load.customerAddress,load.billingAddress,load.billToAddress));
    const pickupAddress=address(load.pickupAddress);
    const deliveryAddress=address(load.deliveryAddress);
    return{
      loadId:load.id||'',
      business:{name:first(business.legalName,business.companyName,business.name),dot:first(business.usdot,business.dotNumber,business.dot),mc:first(business.mc,business.mcNumber),phone:first(business.phone,business.businessPhone),email:first(business.email,business.businessEmail)},
      customer:{name:first(load.customer,load.customerName),address:customerAddress,phone:first(load.customerPhone),email:first(load.customerEmail)},
      route:{pickup:first(load.pickup,load.pickupLocation),delivery:first(load.delivery,load.deliveryLocation),pickupDate:first(load.pickupDate,load.date),deliveryDate:first(load.deliveryDate),pickupAddress,deliveryAddress},
      source:{type:first(load.sourceType),name:first(load.sourceName),reference:first(load.sourceReference),transportationType:first(load.transportationType)},
      assignment:{id:assignment?.id||null,status:assignment?.status||null,driver,truck,trailer},
      mileage:{loaded:loadedMiles,pickupDeadhead,returnDeadhead,total:totalMiles,source:explicitTotal!==null?'saved total':'derived from saved components'},
      operations:{customerAddress,pickupAddress,deliveryAddress,pickupProof:load.pickupProof||null,deliveryProof:load.deliveryProof||null,actualTrip},
      finance:{revenue,totalExpenses,totalPayments,receivable:Math.max(0,revenue-totalPayments),profit:revenue-totalExpenses,invoice,expenses,payments,billingAddress:customerAddress}
    };
  }
  function audit(input={}){
    const data=resolve(input),issues=[];
    if(!data.loadId)issues.push('Load ID is missing.');
    if(!data.customer.name)issues.push('Customer is missing from the load record.');
    if(!data.route.pickup||!data.route.delivery)issues.push('Pickup or delivery location is missing from the load record.');
    if(!data.route.pickupAddress.city||!data.route.pickupAddress.state||!data.route.pickupAddress.zip)issues.push('Pickup address is not fully available downstream.');
    if(!data.route.deliveryAddress.city||!data.route.deliveryAddress.state||!data.route.deliveryAddress.zip)issues.push('Delivery address is not fully available downstream.');
    if(!data.assignment.id||data.assignment.status!=='Verified / Locked')issues.push('Verified assignment is not available for downstream reuse.');
    if(data.mileage.total===null||data.mileage.total<=0)issues.push('Total business mileage is not available downstream.');
    if(data.finance.revenue<=0)issues.push('Revenue is not available downstream.');
    const conflicts=[];
    const compare=(label,a,b)=>{if(a!==null&&a!==undefined&&a!==''&&b!==null&&b!==undefined&&b!==''&&String(a)!==String(b))conflicts.push(label+' has conflicting duplicate values.');};
    compare('Customer',loadValue(input.load,'customer'),loadValue(input.load,'customerName'));
    compare('Total mileage',loadValue(input.load,'totalMiles'),loadValue(input.load,'mileage'));
    compare('Revenue',loadValue(input.load,'actualRevenue'),loadValue(input.load,'revenue'));
    return{pass:issues.length===0&&conflicts.length===0,status:issues.length||conflicts.length?'REVIEW':'PASS',issues,conflicts,data};
  }
  function loadValue(load,key){return load?load[key]:null}
  window.FLTAutoPopulateAudit={resolve,audit};
})();
