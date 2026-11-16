// Offline job cashflow ledger; browser-only while Savage Solutions stays on free hosting.
const $=id=>document.getElementById(id);
const STORE='savage-job-ledger-v1',PROJECTS='savage-solutions-v1';
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const types=new Set(['income','expense']);
const categories=new Set(['Customer payment','Deposit','Refund received','Materials','Labor','Equipment','Fuel','Subcontractor','Permits','Overhead','Other']);
let ledger={entries:[],budgets:{}},safe=true,projects=[];
const iso=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00'));
function validAmount(raw,label='Amount'){
  if(typeof raw!=='number' && typeof raw!=='string')throw Error(label+' is required.');
  if(typeof raw==='string'&&!raw.trim())throw Error(label+' is required.');
  const n=Number(raw);if(!Number.isFinite(n)||n<0||n>100000000)throw Error(label+' must be between 0 and $100,000,000.');
  return Math.round(n*100)/100;
}
function load(){
  try{
    const raw=localStorage.getItem(STORE);
    if(raw){const data=JSON.parse(raw);
      if(!Array.isArray(data.entries)||typeof data.budgets!=='object'||!data.budgets||Array.isArray(data.budgets)||data.entries.length>2000)throw Error('unrecognized saved data');
      for(const e of data.entries){if(!e||typeof e.id!=='string'||typeof e.projectId!=='string'||!types.has(e.type)||!categories.has(e.category)||!iso(e.date)||typeof e.note!=='string'||e.note.length>160)throw Error('unrecognized ledger record');validAmount(e.amount);}
      for(const amount of Object.values(data.budgets))validAmount(amount,'Budget');
      ledger=data;
    }
  }catch{safe=false;info('Existing ledger data cannot be read. New saves are blocked to protect it. Export a backup before changing this browser.',true);}
}
function readProjects(){
  try{const raw=JSON.parse(localStorage.getItem(PROJECTS)||'{}');projects=(Array.isArray(raw.projects)?raw.projects:[]).filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').slice(0,200);}
  catch{projects=[];info('Cannot read saved projects; open Projects and export a backup if needed.',true);}
}
function info(message,error=false){
  const node=$('ledgerStatus');node.textContent=message;node.classList.toggle('error',error);
}
function save(next,message){
  if(!safe){info('Saved ledger data is unreadable. New saves are blocked to prevent overwrite.',true);return false;}
  try{localStorage.setItem(STORE,JSON.stringify(next));ledger=next;refresh();info(message);return true;}
  catch{info('Saving failed. Storage may be full or blocked.',true);return false;}
}
function amountSum(items){return items.reduce((sum,item)=>sum+Number(item.amount),0);}
function projectRows(projectId){return ledger.entries.filter(e=>e.projectId===projectId);}
function summarize(projectId){
  const rows=projectRows(projectId);
  const income=amountSum(rows.filter(e=>e.type==='income'));
  const expenses=amountSum(rows.filter(e=>e.type==='expense'));
  const budget=ledger.budgets[projectId]===undefined?null:Number(ledger.budgets[projectId]);
  return {income,expenses,net:income-expenses,budget,remaining:budget===null?null:budget-expenses};
}
function picker(){
  const select=$('ledgerProject'),active=select.value;
  select.replaceChildren();
  if(!projects.length){const opt=document.createElement('option');opt.value='';opt.textContent='Create a project above to start';select.append(opt);select.disabled=true;$('ledgerAdd').disabled=true;$('ledgerBudgetSave').disabled=true;return;}
  select.disabled=false;$('ledgerAdd').disabled=false;$('ledgerBudgetSave').disabled=false;
  for(const project of projects){
    const opt=document.createElement('option');opt.value=project.id;opt.textContent=project.name.slice(0,120);select.append(opt);
  }
  if(projects.some(p=>p.id===active))select.value=active;
}
function refresh(){
  readProjects();picker();
  const projectId=$('ledgerProject').value;
  if(!projectId){$('ledgerSummary').textContent='Create a project using the form above first.';$('ledgerEntries').replaceChildren();return;}
  const result=summarize(projectId);
  $('ledgerBudget').value=result.budget===null?'':String(result.budget);
  $('ledgerSummary').textContent='Money IN (customer payments): '+cash(result.income)+
    '\nMoney OUT (expenses): '+cash(result.expenses)+
    '\nNet cash on this job: '+cash(result.net)+
    (result.budget===null?'\nExpense budget: not set':'\nExpense budget: '+cash(result.budget)+' | Remaining: '+cash(result.remaining))+
    '\nThis is cashflow, not accrual profit. It excludes unpaid invoices, liabilities and unentered costs.';
  const list=$('ledgerEntries');list.replaceChildren();
  const entries=projectRows(projectId).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.addedAt.localeCompare(a.addedAt)).slice(0,30);
  for(const item of entries){
    const row=document.createElement('p');row.className='entry';
    const label=document.createElement('span');label.textContent=item.date+' · '+(item.type==='income'?'+':'-')+cash(item.amount)+' · '+item.category+(item.note?' · '+item.note:'');
    const del=document.createElement('button');del.className='btn';del.textContent='DELETE';del.type='button';
    del.onclick=()=>{if(confirm('Delete this transaction?'))save({...ledger,entries:ledger.entries.filter(e=>e.id!==item.id)},'Transaction deleted.');};
    row.append(label,del);list.append(row);
  }
  if(!entries.length){const p=document.createElement('p');p.textContent='No income or expense entries for this project yet.';list.append(p);}
}
$('ledgerProject').addEventListener('change',refresh);
$('ledgerBudgetSave').addEventListener('click',()=>{
  const id=$('ledgerProject').value;if(!id)return;
  try{const raw=$('ledgerBudget').value;if(!raw.trim())return info('Enter a budget amount first.',true);
    const budget=validAmount(raw,'Budget');
    save({...ledger,budgets:{...ledger.budgets,[id]:budget}},'Expense budget saved to this browser.');
  }catch(e){info(e.message,true);}
});
$('ledgerForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
    const data=Object.fromEntries(new FormData(event.currentTarget).entries());
    const projectId=$('ledgerProject').value;
    if(!projects.some(p=>p.id===projectId))throw Error('Select an existing project.');
    const date=data.date;
    if(!iso(date))throw Error('Enter a valid date.');
    if(!types.has(data.type)||!categories.has(data.category))throw Error('Invalid transaction type or category.');
    if(data.type==='income'&&!['Customer payment','Deposit','Refund received','Other'].includes(data.category))throw Error('Choose an income category for money received.');
    if(data.type==='expense'&&['Customer payment','Deposit','Refund received'].includes(data.category))throw Error('Choose an expense category for money spent.');
    const amount=validAmount(data.amount);
    const note=String(data.note||'').trim().slice(0,160);
    if(ledger.entries.length>=2000)throw Error('Entry limit reached. Export your records before adding more.');
    const item={id:crypto.randomUUID(),projectId,date,type:data.type,category:data.category,amount,note,addedAt:new Date().toISOString()};
    if(save({...ledger,entries:[...ledger.entries,item]},'Transaction recorded locally.')){event.currentTarget.reset();}
  }catch(e){info(e.message,true);}
});
const csvCell=v=>{let s=String(v??'');if(/^\s*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
function download(name,type,content){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('ledgerExportCsv').onclick=()=>{
  const id=$('ledgerProject').value;if(!id)return info('Choose a project to export.',true);
  const columns=['date','type','category','amount','note'];
  const rows=[columns.join(',')];
  for(const e of projectRows(id))rows.push(columns.map(c=>csvCell(e[c])).join(','));
  download('savage-project-cashflow.csv','text/csv;charset=utf-8','\uFEFF'+rows.join('\r\n'));
};
$('ledgerBackup').onclick=()=>{
  const data=safe?JSON.stringify(ledger,null,2):localStorage.getItem(STORE);
  if(!data)return info('No readable browser backup found.',true);
  download('savage-job-ledger-backup.json','application/json',data);
};
window.addEventListener('storage',e=>{if(e.key===STORE){ledger={entries:[],budgets:{}};safe=true;load();refresh();}if(e.key===PROJECTS)refresh();});
load();refresh();
