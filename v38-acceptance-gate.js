(() => {
  const normalize=value=>Boolean(value&&value.pass!==false&&value.status!=='DO NOT DISPATCH'&&value.status!=='MORE INFORMATION REQUIRED'&&value.status!=='INCOMPLETE'&&value.status!=='REVIEW');
  function evaluate(input={}){
    const checks={
      assignment:normalize(input.assignment),
      weightEquipment:normalize(input.weightEquipment),
      documentCompliance:normalize(input.documentCompliance),
      pickupDelivery:normalize(input.pickupDelivery),
      autoPopulate:normalize(input.autoPopulate),
      legacyV35:input.legacyV35===true,
      legacyV36:input.legacyV36===true,
      legacyV37:input.legacyV37===true
    };
    const failed=Object.entries(checks).filter(([,pass])=>!pass).map(([name])=>name);
    return{
      pass:failed.length===0,
      status:failed.length===0?'PASS':'BLOCKED',
      checks,
      failed,
      summary:failed.length===0?'V3.8 Operational Integrity acceptance requirements passed.':'V3.8 acceptance blocked: '+failed.join(', ')
    };
  }
  window.FLTV38AcceptanceGate={evaluate};
})();
