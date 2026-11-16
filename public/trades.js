import {trades,estimateTrade,freightQuote,mileageDistance,fuelSummary,gradePercent} from '/trade-engine.js';
const $=id=>document.getElementById(id);
const cash=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const fixed=(v,places=2)=>Number(v).toLocaleString('en-US',{maximumFractionDigits:places,minimumFractionDigits:places});
const set=(id,message,error=false)=>{const el=$(id);el.textContent=message;el.classList.toggle('error',error);};
const formObject=form=>Object.fromEntries(new FormData(form).entries());
const inputField=(id,label,value,options={})=>{
  const wrapper=document.createElement('label');wrapper.textContent=label;
  const input=document.createElement('input');
  input.id='trade-'+id;input.name=id;input.type='number';input.step=options.integer?'1':'any';input.required=!!options.required;
  if(options.min!==undefined)input.min=String(options.min);
  if(options.max!==undefined)input.max=String(options.max);
  input.value=String(value);wrapper.append(input);return wrapper;
};
const categoryOrder=['General','Building','Civil / sitework','Landscaping','Mechanical','Electrical','Industrial','Equipment','Transportation'];
const selector=$('tradeSelect');
for(const group of categoryOrder){
  const entries=trades.filter(t=>t.category===group);if(!entries.length)continue;
  const parent=document.createElement('optgroup');parent.label=group;
  for(const t of entries){const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.name;parent.append(opt);}
  selector.append(parent);
}
let lastEstimate=null;
function renderInputs(){
  const item=trades.find(t=>t.id===selector.value)||trades[0];const fields=[];
  if(['area','acre','volume','length'].includes(item.mode))fields.push(inputField('length','Length (feet)',20,{required:true,min:0.01}));
  if(['area','acre','volume'].includes(item.mode))fields.push(inputField('width','Width (feet)',12,{required:true,min:0.01}));
  if(item.mode==='volume')fields.push(inputField('depth','Depth / thickness (inches)',4,{required:true,min:0.01}));
  fields.push(inputField('count',item.mode==='time'?'Number of workers / operators':'Quantity / identical sections',1,{required:true,integer:true,min:1}));
  if(item.mode==='time')fields.push(inputField('hours','Hours per worker',8,{required:true,min:0.01}));
  if(item.mode!=='time')fields.push(inputField('waste','Waste / overage (%)',10,{min:0,max:100}));
  if(item.mode!=='time')fields.push(inputField('materialRate','Materials ($ per '+item.unit+')',0,{min:0}));
  if(item.mode!=='time')fields.push(inputField('laborHours','Estimated crew labor (total hours)',8,{min:0}));
  fields.push(inputField('hourlyRate','Labor ($ per worker-hour)',45,{min:0}));
  fields.push(inputField('equipment','Equipment, fees & other ($)',0,{min:0}));
  fields.push(inputField('margin','Gross profit margin (%)',25,{min:0,max:95}));
  $('tradeFields').replaceChildren(...fields);
  set('tradeResult','Enter job numbers above, then calculate. Quantities are planning estimates.');
  lastEstimate=null;$('tradeSave').disabled=true;
}
selector.addEventListener('change',renderInputs);renderInputs();
$('tradeForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const result=estimateTrade(selector.value,formObject(event.currentTarget));
    lastEstimate={...result,date:new Date().toISOString()};
    $('tradeSave').disabled=false;
    set('tradeResult',result.trade+': '+fixed(result.quantity)+' '+result.unit+' ('+result.details+'); with allowance '+fixed(result.adjustedQuantity)+' '+result.unit+'.\nMaterials '+cash(result.materialCost)+' + labor '+cash(result.laborCost)+' + equipment '+cash(result.equipment)+'.\nCost '+cash(result.cost)+' | Quote '+cash(result.quote)+' | Gross profit '+cash(result.profit)+'.\nExcludes tax, permits, risk allowances, and unspecified overhead.');
  }catch(error){lastEstimate=null;$('tradeSave').disabled=true;set('tradeResult',error.message,true);}
});
$('freightForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const r=freightQuote(formObject(event.currentTarget));
    set('freightResult','Revenue: '+cash(Number(event.currentTarget.elements.loadPay.value))+
      ' | Loaded miles: '+fixed(r.loadedMiles,1)+' | All miles: '+fixed(r.totalMiles,1)+
      '\nRate per loaded mile: '+cash(r.ratePerLoadedMile)+' | Rate per all miles: '+cash(r.ratePerAllMile)+
      '\nFuel: '+fixed(r.gallons,1)+' gal / '+cash(r.fuelCost)+' | Other operating cost: '+cash(r.otherCost)+
      '\nEstimated contribution before unentered costs, financing and tax: '+cash(r.net)+
      '\nBreak-even rate per loaded mile for entered costs: '+cash(r.breakEvenRatePerLoadedMile)+
      '\nPlanning comparison only. No real-time freight listings or load booking.');
  }catch(error){set('freightResult',error.message,true);}
});
$('gradeForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{const r=gradePercent($('gradeRise').value,$('gradeRun').value);
    set('gradeResult','Slope: '+fixed(r.percent,2)+'% ('+fixed(r.degrees,2)+'°). Signed rise indicates grade direction. This is manual survey math, not GPS machine guidance.');}
  catch(error){set('gradeResult',error.message,true);}
});
const STORE='savage-trade-tools-v1';let locked=false,log={mileage:[],fuel:[],duty:[],quotes:[]};
const allowed=['mileage','fuel','duty','quotes'];
function parseStored(raw){
  if(!raw)return {mileage:[],fuel:[],duty:[],quotes:[]};
  const obj=JSON.parse(raw);
  if(!obj||typeof obj!=='object'||!allowed.every(key=>Array.isArray(obj[key])&&obj[key].length<=500))throw Error('Stored log structure was not recognized.');
  return obj;
}
try{log=parseStored(localStorage.getItem(STORE));}catch{locked=true;set('logsStatus','Existing browser records could not be read. New saves are blocked to avoid overwriting them.',true);}
const safeString=(v,limit=120)=>String(v??'').trim().slice(0,limit);
function updateRecords(next,message){
  if(locked)return set('logsStatus','Storage is locked. Back up or recover your browser data before saving.',true);
  try{localStorage.setItem(STORE,JSON.stringify(next));log=next;display();set('logsStatus',message);}
  catch{set('logsStatus','Browser storage is full or blocked; nothing was saved.',true);}
}
function insert(kind,item){
  if(log[kind].length>=500)return set('logsStatus','500 entry limit reached. Export and clear older entries first.',true);
  updateRecords({...log,[kind]:[item,...log[kind]]},'Saved on this device only. Export a backup regularly.');
}
function rowCard(container,kind,describe){
  container.replaceChildren();
  for(const item of log[kind].slice(0,8)){
    const p=document.createElement('p');p.className='entry';p.textContent=describe(item);
    const del=document.createElement('button');del.type='button';del.className='btn';del.textContent='Delete';
    del.setAttribute('aria-label','Delete '+kind+' entry');
    del.onclick=()=>{if(confirm('Delete this entry?'))updateRecords({...log,[kind]:log[kind].filter(x=>x.id!==item.id)},'Entry deleted.');};
    p.append(del);container.append(p);
  }
  if(!log[kind].length){const none=document.createElement('p');none.textContent='No entries saved yet.';container.append(none);}
}
function display(){
  const total=log.mileage.reduce((sum,item)=>sum+(Number(item.miles)||0),0);
  const business=log.mileage.reduce((sum,item)=>sum+(item.type==='Business'?(Number(item.miles)||0):0),0);
  set('mileageSummary',log.mileage.length+' trips | '+fixed(total,1)+' total miles | '+fixed(business,1)+' business miles.');
  rowCard($('mileageEntries'),'mileage',e=>e.date+' · '+e.vehicle+' · '+e.type+' · '+fixed(e.miles,1)+' mi · '+e.purpose+' ');
  const byVehicle=new Map();
  for(const f of log.fuel){
    const name=f.vehicle||'Unassigned';if(!byVehicle.has(name))byVehicle.set(name,[]);
    byVehicle.get(name).push(f);
  }
  const summaries=[];
  for(const [vehicle,entries] of byVehicle){
    try{const r=fuelSummary(entries);summaries.push(vehicle+': '+fixed(r.mpg,2)+' MPG · '+cash(r.costPerMile)+'/mile · '+cash(r.spend)+' fuel spend ('+entries.length+' fill records)');}catch{}
  }
  set('fuelSummary',summaries.length?summaries.join('\n'):'No fuel records yet. Enter miles since the previous fill and gallons added to estimate MPG.');
  rowCard($('fuelEntries'),'fuel',e=>e.date+' · '+e.vehicle+' · '+fixed(e.miles,1)+' mi / '+fixed(e.gallons,2)+' gal · '+cash(Number(e.price))+'/gal ');
  rowCard($('dutyEntries'),'duty',e=>e.date+' · '+e.status+' · '+fixed(e.hours,2)+' h · '+e.note+' ');
  rowCard($('tradeQuotes'),'quotes',e=>e.date.slice(0,10)+' · '+e.trade+' · '+fixed(e.quantity)+' '+e.unit+' · '+cash(e.quote)+' quoted ');
}
$('tradeSave').addEventListener('click',()=>{
  if(!lastEstimate)return;
  insert('quotes',{...lastEstimate,id:crypto.randomUUID()});
});
$('mileageForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const v=formObject(event.currentTarget);
    const miles=mileageDistance(v.startOdometer,v.endOdometer);
    const vehicle=safeString(v.vehicle,60),purpose=safeString(v.purpose,160);
    if(!vehicle||!purpose||!v.date)throw Error('Vehicle, date, and trip purpose are required.');
    insert('mileage',{id:crypto.randomUUID(),date:v.date,vehicle,start:Number(v.startOdometer),end:Number(v.endOdometer),miles,type:v.type,purpose});
    event.currentTarget.reset();
  }catch(error){set('logsStatus',error.message,true);}
});
$('fuelForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const v=formObject(event.currentTarget),vehicle=safeString(v.vehicle,60);
    const miles=Number(v.miles),gallons=Number(v.gallons),price=Number(v.price);
    if(!vehicle||!v.date||!Number.isFinite(miles)||miles<=0||miles>1e7||!Number.isFinite(gallons)||gallons<=0||gallons>1e7||!Number.isFinite(price)||price<0||price>1000)throw Error('Enter vehicle, date, positive miles/gallons and a valid fuel price.');
    insert('fuel',{id:crypto.randomUUID(),date:v.date,vehicle,miles,gallons,price});
    event.currentTarget.reset();
  }catch(error){set('logsStatus',error.message,true);}
});
$('dutyForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const v=formObject(event.currentTarget);const start=new Date(v.dutyStart),end=new Date(v.dutyEnd);
    const hours=(end-start)/3600000;
    if(!Number.isFinite(hours)||hours<=0||hours>72)throw Error('Duty end must follow start, within 72 hours.');
    insert('duty',{id:crypto.randomUUID(),date:safeString(v.dutyStart,40),status:v.dutyStatus,note:safeString(v.dutyNote,160),hours});
    event.currentTarget.reset();
  }catch(error){set('logsStatus',error.message,true);}
});
function cell(value){
  let s=String(value??'');
  if(/^[\s]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
function exportCsv(kind,headers){
  const rows=[headers.map(cell).join(',')];
  for(const item of log[kind])rows.push(headers.map(key=>cell(item[key])).join(','));
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='savage-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('exportMileage').onclick=()=>exportCsv('mileage',['date','vehicle','start','end','miles','type','purpose']);
$('exportFuel').onclick=()=>exportCsv('fuel',['date','vehicle','miles','gallons','price']);
$('exportDuty').onclick=()=>exportCsv('duty',['date','status','hours','note']);
$('exportQuotes').onclick=()=>exportCsv('quotes',['date','trade','quantity','unit','cost','quote','profit']);
$('exportLogs').onclick=()=>{
  const content=locked?localStorage.getItem(STORE):JSON.stringify(log,null,2);
  if(!content)return set('logsStatus','No readable backup available.',true);
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='savage-worksite-logs.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('storage',event=>{
  if(event.key!==STORE)return;
  try{log=parseStored(event.newValue);locked=false;display();set('logsStatus','Records refreshed from another browser tab.');}
  catch{locked=true;set('logsStatus','Another tab changed records to unreadable data. New saves are blocked.',true);}
});
display();
