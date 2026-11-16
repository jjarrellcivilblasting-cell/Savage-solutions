// Pure, offline-capable planning calculations. All inputs are unit-labeled; never treat these as certified engineering or tax results.
const N=(v,label,{min=0,max=1e9,positive=false,integer=false}={})=>{
  if ((typeof v!=='string' && typeof v!=='number') || (typeof v==='string' && !v.trim())) throw Error(label+' is required.');
  const n=Number(v);
  if (!Number.isFinite(n)||n<min||n>max||(positive&&n===0)||(integer&&!Number.isInteger(n))) throw Error(label+' must be a valid '+(integer?'whole ':'')+'number from '+min+' to '+max+'.');
  return n;
};
const entry=(id,name,mode,category,unit)=>({id,name,mode,category,unit});
export const trades=[
  entry('flooring','Flooring / tile','area','Building','sq ft'),
  entry('painting','Painting / coatings','area','Building','sq ft'),
  entry('drywall','Drywall / insulation','area','Building','sq ft'),
  entry('roofing','Roofing / decking','area','Building','sq ft'),
  entry('concrete','Concrete placement','volume','Civil / sitework','cu yd'),
  entry('excavation','Excavation / backfill','volume','Civil / sitework','cu yd'),
  entry('gravel','Gravel / aggregate','volume','Civil / sitework','cu yd'),
  entry('mulch','Mulch / topsoil','volume','Landscaping','cu yd'),
  entry('landscape','Lawn / landscape area','area','Landscaping','sq ft'),
  entry('clearing','Land clearing','acre','Civil / sitework','acre'),
  entry('fencing','Fencing / gates','length','Building','linear ft'),
  entry('trim','Trim / baseboard','length','Building','linear ft'),
  entry('pipe','Plumbing / piping','length','Mechanical','linear ft'),
  entry('duct','HVAC duct / conduit','length','Mechanical','linear ft'),
  entry('welding','Welding seams','length','Industrial','linear ft'),
  entry('electrical','Electrical devices','count','Electrical','device'),
  entry('fixtures','Plumbing / HVAC fixtures','count','Mechanical','fixture'),
  entry('doors','Doors / windows','count','Building','opening'),
  entry('equipment','Equipment operator / rental','time','Equipment','crew-hour'),
  entry('hauling','Hauling / trucking labor','time','Transportation','crew-hour'),
  entry('labor','Independent contractor labor','time','General','crew-hour')
];
export function estimateTrade(id,input){
  const t=trades.find(item=>item.id===id); if(!t) throw Error('Select a supported trade.');
  let base=0,details='';
  const count=N(input.count??1,'Quantity',{positive:true,integer:true,max:100000});
  if(t.mode==='area'||t.mode==='acre'){
    const l=N(input.length,'Length in feet',{positive:true,max:1e6});
    const w=N(input.width,'Width in feet',{positive:true,max:1e6});
    const sqft=l*w*count;
    base=t.mode==='acre'?sqft/43560:sqft;
    details=sqft.toFixed(2)+' square feet';
  }else if(t.mode==='volume'){
    const l=N(input.length,'Length in feet',{positive:true,max:1e6});
    const w=N(input.width,'Width in feet',{positive:true,max:1e6});
    const d=N(input.depth,'Depth in inches',{positive:true,max:12000});
    const cf=l*w*d/12*count;
    base=cf/27;details=cf.toFixed(2)+' cubic feet';
  }else if(t.mode==='length'){
    base=N(input.length,'Length in feet',{positive:true,max:1e6})*count;
    details=base.toFixed(2)+' linear feet';
  }else if(t.mode==='count'){
    base=count;details=base+' items';
  }else if(t.mode==='time'){
    const h=N(input.hours,'Hours per worker',{positive:true,max:10000});
    base=h*count;details=count+' worker(s) × '+h+' hours';
  }
  const waste=N(input.waste??0,'Allowance percent',{max:100});
  const adjusted=base*(1+waste/100);
  const rate=N(input.materialRate??0,'Material / unit rate',{max:1e7});
  const laborHours=t.mode==='time'?base:N(input.laborHours??0,'Labor hours',{max:1e7});
  const hourly=N(input.hourlyRate??0,'Labor rate',{max:1e7});
  const equipment=N(input.equipment??0,'Equipment and other',{max:1e9});
  const margin=N(input.margin??0,'Gross margin percentage',{max:95});
  const materialCost=adjusted*rate, laborCost=laborHours*hourly, cost=materialCost+laborCost+equipment, quote=cost/(1-margin/100);
  if(!Number.isFinite(quote)) throw Error('Estimate exceeds supported range.');
  return {trade:t.name,unit:t.unit,quantity:base,adjustedQuantity:adjusted,details,materialCost,laborCost,equipment,cost,quote,profit:quote-cost};
}
export function freightQuote({loadedMiles,deadheadMiles,loadPay,mpg,fuelPrice,otherCostPerMile,tolls}){
  const loaded=N(loadedMiles,'Loaded miles',{positive:true,max:1e7});
  const empty=N(deadheadMiles,'Deadhead miles',{max:1e7});
  const pay=N(loadPay,'Load pay',{max:1e9});
  const economy=N(mpg,'Miles per gallon',{positive:true,max:200});
  const price=N(fuelPrice,'Fuel price per gallon',{max:1000});
  const other=N(otherCostPerMile??0,'Other cost per mile',{max:10000});
  const fees=N(tolls??0,'Tolls and fees',{max:1e9});
  const totalMiles=loaded+empty, gallons=totalMiles/economy, fuelCost=gallons*price, otherCost=totalMiles*other+fees;
  return {loadedMiles:loaded,totalMiles,gallons,fuelCost,otherCost,cost:fuelCost+otherCost,net:pay-fuelCost-otherCost,ratePerLoadedMile:pay/loaded,ratePerAllMile:pay/totalMiles,breakEvenRatePerLoadedMile:(fuelCost+otherCost)/loaded};
}
export function mileageDistance(start,end){
  const a=N(start,'Starting odometer',{max:1e9}), b=N(end,'Ending odometer',{max:1e9});
  if(b<=a) throw Error('Ending odometer must be greater than starting odometer.');
  return b-a;
}
export function fuelSummary(records){
  if(!Array.isArray(records)) throw Error('Invalid fuel records.');
  let miles=0,gallons=0,spend=0;
  for(const item of records){
    miles+=N(item.miles,'Miles',{positive:true,max:1e7});
    gallons+=N(item.gallons,'Gallons',{positive:true,max:1e7});
    spend+=N(item.gallons,'Gallons',{positive:true,max:1e7})*N(item.price,'Fuel price',{max:1000});
  }
  return {miles,gallons,spend,mpg:gallons?miles/gallons:null,costPerMile:miles?spend/miles:null};
}
export function gradePercent(riseInches,runFeet){
  const rise=N(riseInches,'Rise in inches',{min:-1e7,max:1e7});
  const run=N(runFeet,'Run in feet',{positive:true,max:1e7});
  return {percent:100*rise/(12*run),degrees:Math.atan2(rise,12*run)*180/Math.PI};
}
