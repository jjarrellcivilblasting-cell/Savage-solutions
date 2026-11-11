// Extensible trade catalog. Calculators are estimates, not engineered designs.
export const trades = [
  {id:'all',name:'All Trades'},
  {id:'engineering',name:'Engineering & Surveying'},
  {id:'concrete',name:'Concrete Construction'},
  {id:'general',name:'General Construction'},
  {id:'excavation',name:'Excavation & Earthwork'},
  {id:'carpentry',name:'Carpentry & Framing'},
  {id:'roofing',name:'Roofing'},
  {id:'masonry',name:'Masonry'},
  {id:'electrical',name:'Electrical'},
  {id:'plumbing',name:'Plumbing'},
  {id:'hvac',name:'HVAC'},
  {id:'welding',name:'Welding & Fabrication'},
  {id:'machining',name:'Machining'},
  {id:'automotive',name:'Automotive & Diesel'},
  {id:'heavy',name:'Heavy Equipment'},
  {id:'landscaping',name:'Landscaping'},
  {id:'forestry',name:'Forestry & Sawmilling'},
  {id:'agriculture',name:'Agriculture'},
  {id:'mining',name:'Mining, Drilling & Blasting'},
  {id:'business',name:'Business & Estimating'}
];
export const calculators = [
  {id:'board',name:'Board Feet',description:'Lumber volume',trades:['forestry','carpentry','general']},
  {id:'log',name:'Log Scale',description:'Doyle log estimate',trades:['forestry']},
  {id:'job',name:'Job Estimator',description:'Cost, quote and margin',trades:['business','general','concrete','excavation','carpentry','roofing','masonry','electrical','plumbing','hvac','welding','machining','automotive','heavy','landscaping','forestry','agriculture','mining','engineering']},
  {id:'hours',name:'Man Hours',description:'Crew labor and cost',trades:['business','general','concrete','excavation','carpentry','roofing','masonry','electrical','plumbing','hvac','welding','machining','automotive','heavy','landscaping','forestry','agriculture','mining','engineering']},
  {id:'concreteVolume',name:'Concrete Volume',description:'Slab / footing cubic yards',trades:['concrete','general','engineering','masonry']},
  {id:'earthVolume',name:'Excavation Volume',description:'Trench / cut cubic yards',trades:['excavation','general','heavy','engineering','mining','landscaping']},
  {id:'area',name:'Area & Materials',description:'Area and material coverage',trades:['general','carpentry','roofing','masonry','landscaping','agriculture']},
  {id:'slope',name:'Slope & Grade',description:'Rise, run and grade percent',trades:['engineering','excavation','general','landscaping','roofing','heavy']},
  {id:'tank',name:'Pipe / Tank Volume',description:'Cylinder liquid capacity',trades:['plumbing','hvac','mechanical','agriculture','engineering','automotive']},
  {id:'convert',name:'Unit Converter',description:'Feet, meters, inches and millimeters',trades:trades.filter(t=>t.id!=='all').map(t=>t.id)}
];
export const extraCalculators = [
  {id:'concreteVolume',inputs:[['Length','feet',10],['Width','feet',10],['Depth','inches',4]],unit:'yd³',compute:([l,w,d])=>l*w*(d/12)/27,detail:'Order extra for waste and uneven subgrade.'},
  {id:'earthVolume',inputs:[['Length','feet',50],['Width','feet',3],['Depth','feet',4]],unit:'yd³',compute:([l,w,d])=>l*w*d/27,detail:'Bank volume only; swell, shrinkage and sloped sides are excluded.'},
  {id:'area',inputs:[['Length','feet',20],['Width','feet',12]],unit:'ft²',compute:([l,w])=>l*w,detail:'Rectangular area; add waste based on material and layout.'},
  {id:'slope',inputs:[['Rise','feet',2],['Run','feet',24]],unit:'% grade',compute:([r,run])=>r/run*100,detail:'Positive rise divided by horizontal run; not a safety or code compliance determination.'},
  {id:'tank',inputs:[['Inside diameter','inches',6],['Length','feet',10]],unit:'US gallons',compute:([d,l])=>Math.PI*(d/24)**2*l*7.48052,detail:'Full circular cylinder only; excludes fittings and unfilled space.'},
  {id:'convert',inputs:[['Feet','feet',10]],unit:'meters',compute:([feet])=>feet*0.3048,detail:'1 foot = 0.3048 meters exactly.'}
];
