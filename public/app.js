import {boardFeet, logScale, jobQuote, labor} from '/calculators.js';
const $=id=>document.getElementById(id);
const text=(id,value)=>{$(id).textContent=value;};
let aiEnabled=false, signedIn=false, busy=false, messages=[], latestQuote=null, backgroundUrl=null;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
function status(id,message,error=false){text(id,message);$(id).classList.toggle('error',error);}
function updateChat(){ $('solve').disabled=!aiEnabled || !signedIn || busy; $('newChat').disabled=busy; $('logout').disabled=busy; }
async function api(path, data) {
  const response=await fetch(path,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
  let result;try{result=await response.json();}catch{throw new Error('Server returned an invalid response. Please try again.');}
  if(!response.ok){if(response.status===401){signedIn=false;aiEnabled=false;authUI();}throw new Error(result.error || 'Request failed.');}return result;
}
function authUI(){ $('loginPanel').hidden=signedIn;$('logout').hidden=!signedIn;status('aiStatus',!signedIn?'Sign in to use AI chat.':aiEnabled?'AI is ready.':'AI is not enabled yet. Calculators and projects are ready.');updateChat(); }
async function session(){try{const result=await api('/api/session');signedIn=true;aiEnabled=result.aiEnabled;}catch{signedIn=false;aiEnabled=false;}authUI();}
$('loginForm').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{await api('/api/login',{key:$('accessKey').value});$('accessKey').value='';await session();status('loginStatus','Signed in.');}
  catch(error){status('loginStatus',error.message,true);}finally{button.disabled=false;}
};
$('logout').onclick=async()=>{try{await api('/api/logout',{});signedIn=false;aiEnabled=false;messages=[];$('chatLog').replaceChildren();authUI();status('loginStatus','Signed out.');}catch(error){status('chatStatus',error.message,true);}};
function showPage(){
  const requested=location.hash.slice(1) || 'home';const name=['home','tools','yard','projects','feedback'].includes(requested)?requested:'home';
  document.querySelectorAll('.page').forEach(page=>page.classList.toggle('active',page.id===name));
  document.querySelectorAll('.nav button').forEach(button=>{if(button.dataset.page===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  $('main').focus({preventScroll:true});window.scrollTo(0,0);
}
document.querySelectorAll('.goto').forEach(button=>button.onclick=()=>{if(location.hash===`#${button.dataset.page}`)showPage();else location.hash=button.dataset.page;});
window.addEventListener('hashchange',showPage);showPage();
document.querySelectorAll('.tool').forEach(button=>button.onclick=()=>{
  document.querySelectorAll('.toolbox').forEach(box=>box.classList.toggle('active',box.id===button.dataset.tool));
  const box=$(button.dataset.tool);box.querySelector('input').focus({preventScroll:true});box.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
function calculate(button,result,fn){$(result).setAttribute('role','status');$(result).setAttribute('aria-live','polite');$(button).onclick=()=>{try{status(result,fn());}catch(error){status(result,error.message,true);}};}
const values=(...ids)=>ids.map(id=>$(id).value);
calculate('boardCalc','boardResult',()=>`${boardFeet(...values('bt','bw','bl','bq')).toFixed(1)} bd ft`);
calculate('logCalc','logResult',()=>`${logScale(...values('ld','ll')).toFixed(1)} bd ft (Doyle estimate)`);
calculate('jobCalc','jobResult',()=>{latestQuote=null;$('saveEstimate').disabled=true;const result=jobQuote(...values('jh','jr','jm','je','mar'));latestQuote={...result,inputs:Object.fromEntries(['jh','jr','jm','je','mar'].map(id=>[id,$(id).value]))};$('saveEstimate').disabled=false;return `${money(result.cost)} cost / ${money(result.quote)} quote / ${money(result.profit)} profit`;});
['jh','jr','jm','je','mar'].forEach(id=>$(id).addEventListener('input',()=>{latestQuote=null;$('saveEstimate').disabled=true;text('jobResult','Inputs changed. Build the quote again.');}));
calculate('hoursCalc','hoursResult',()=>{const result=labor(...values('workers','eachHours','hourRate'));return `${result.hours.toFixed(1)} man-hours / ${money(result.cost)}`;});
function message(role,content){const node=document.createElement('div');node.className=`message ${role}`;node.textContent=`${role==='user'?'You':'Savage AI'}: ${content}`;$('chatLog').append(node);$('chatLog').scrollTop=$('chatLog').scrollHeight;}
$('chatForm').onsubmit=async event=>{
  event.preventDefault();if(busy || !aiEnabled || !signedIn)return;
  const content=$('problem').value.trim();if(!content){status('chatStatus','Enter your question first.',true);return;}
  // Keep recent complete exchanges; server applies its own stricter independent limits.
  const history=messages.slice(-10).map(m=>({...m,content:m.content.slice(0,4000)}));while(history.length && history.reduce((n,m)=>n+m.content.length,content.length)>16000)history.splice(0,2);
  const pending=[...history,{role:'user',content}];busy=true;updateChat();status('chatStatus','Thinking…');
  try{const result=await api('/api/chat',{messages:pending});message('user',content);message('assistant',result.answer);messages=[...pending,{role:'assistant',content:result.answer}];$('problem').value='';status('chatStatus','Answer ready.');}
  catch(error){status('chatStatus',error.name==='TimeoutError'?'The request timed out. Your question is still here; try again.':error.message,true);}
  finally{busy=false;updateChat();}
};
$('newChat').onclick=()=>{messages=[];$('chatLog').replaceChildren();$('problem').value='';status('chatStatus','New chat started.');$('problem').focus();};
$('pick').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>5*1024*1024){status('chatStatus','Choose a JPEG, PNG, or WebP image under 5 MB.',true);event.target.value='';return;}
  try{const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>20000000){bitmap.close();throw Error('Choose an image under 20 megapixels.');}bitmap.close();if(backgroundUrl)URL.revokeObjectURL(backgroundUrl);backgroundUrl=URL.createObjectURL(file);$('hero').style.backgroundImage=`url("${backgroundUrl}")`;status('chatStatus','Background updated for this visit.');}
  catch(error){status('chatStatus',error.message || 'Could not read that image.',true);}
};
$('reset').onclick=()=>{if(backgroundUrl)URL.revokeObjectURL(backgroundUrl);backgroundUrl=null;$('hero').style.backgroundImage='';$('pick').value='';status('chatStatus','Default background restored.');};
$('saveFeedback').onclick=async()=>{
  $('saveFeedback').disabled=true;$('feedbackResult').hidden=false;
  try{const result=await api('/api/feedback',{liked:$('like').value,fixes:$('bad').value,missing:$('missing').value});status('feedbackResult',`Feedback #${result.id} received. Thank you.`);['like','bad','missing'].forEach(id=>$(id).value='');}
  catch(error){status('feedbackResult',error.message,true);}finally{$('saveFeedback').disabled=false;}
};

const storageKey='savage-solutions-v1';let records={projects:[],estimates:[]}, storageReady=true;
function validateRecords(saved){
  const validText=(value,max)=>typeof value==='string' && value.length<=max;
  if(!saved || !Array.isArray(saved.projects) || !Array.isArray(saved.estimates) || saved.projects.length>200 || saved.estimates.length>200)throw Error('Invalid backup.');
  for(const item of [...saved.projects,...saved.estimates])if(!item || !validText(item.id,100) || !validText(item.name,120) || !validText(item.createdAt,100) || !Number.isFinite(Date.parse(item.createdAt)))throw Error('Invalid record.');
  for(const item of saved.projects)if(!validText(item.notes,2000) || typeof item.done!=='boolean')throw Error('Invalid project.');
  for(const item of saved.estimates)if(![item.cost,item.quote,item.profit].every(n=>typeof n==='number' && Number.isFinite(n) && n>=0))throw Error('Invalid estimate.');
  return saved;
}
try{const saved=JSON.parse(localStorage.getItem(storageKey) || 'null');if(saved)records=validateRecords(saved);}
catch{storageReady=false;status('projectStatus','Saved browser data could not be read. Export your data for recovery before clearing this site’s storage. New saves are blocked to protect existing data.',true);}
function persist(next){if(!storageReady){status('projectStatus','Existing data could not be read. Export it for recovery before clearing site storage.',true);return false;}try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;renderRecords();return true;}catch{status('projectStatus','Browser storage is unavailable or full. Your changes were not saved.',true);return false;}}
function recordCard(item,type){
  const card=document.createElement('article');card.className='record';const title=document.createElement('h3');title.textContent=item.name || 'Untitled';card.append(title);
  const details=document.createElement('p');details.textContent=type==='projects'?`${item.notes || ''}\nStatus: ${item.done?'Complete':'In progress'}`:`${money(item.cost)} cost / ${money(item.quote)} quote / ${money(item.profit)} profit\nSaved ${new Date(item.createdAt).toLocaleDateString()}`;card.append(details);
  if(type==='projects'){
    const edit=document.createElement('button');edit.className='btn';edit.textContent='EDIT';edit.setAttribute('aria-label',`Edit ${item.name}`);edit.onclick=()=>{const name=prompt('Project name:',item.name);if(!name?.trim())return;const notes=prompt('Project notes:',item.notes);if(notes===null)return;persist({...records,projects:records.projects.map(p=>p.id===item.id?{...p,name:name.trim().slice(0,120),notes:notes.slice(0,2000)}:p)});};card.append(edit);
    const toggle=document.createElement('button');toggle.className='btn';toggle.textContent=item.done?'REOPEN':'MARK COMPLETE';toggle.onclick=()=>persist({...records,projects:records.projects.map(p=>p.id===item.id?{...p,done:!p.done}:p)});card.append(toggle);
  }
  const remove=document.createElement('button');remove.className='btn';remove.textContent='DELETE';remove.setAttribute('aria-label',`Delete ${item.name}`);remove.onclick=()=>{if(confirm(`Delete ${item.name}?`))persist({...records,[type]:records[type].filter(p=>p.id!==item.id)});};card.append(remove);return card;
}
function renderRecords(){for(const [type,id] of [['projects','projectList'],['estimates','estimateList']]){const nodes=records[type].map(item=>recordCard(item,type));if(!nodes.length){const empty=document.createElement('p');empty.textContent=`No saved ${type} yet.`;nodes.push(empty);}$(id).replaceChildren(...nodes);}}
$('projectForm').onsubmit=event=>{event.preventDefault();const name=$('projectName').value.trim();if(!name)return status('projectStatus','Enter a project name.',true);if(records.projects.length>=200)return status('projectStatus','Export and remove older projects before adding more.',true);const project={id:crypto.randomUUID(),name,notes:$('projectNotes').value.trim(),done:false,createdAt:new Date().toISOString()};if(persist({...records,projects:[...records.projects,project]})){$('projectForm').reset();status('projectStatus','Project saved in this browser.');}};
$('saveEstimate').onclick=()=>{if(!latestQuote)return;if(records.estimates.length>=200){location.hash='projects';return status('projectStatus','Export and remove older estimates before adding more.',true);}const name=prompt('Name this estimate:','Job estimate');if(!name?.trim())return;if(persist({...records,estimates:[...records.estimates,{id:crypto.randomUUID(),name:name.trim().slice(0,120),...latestQuote,createdAt:new Date().toISOString()}]})){location.hash='projects';status('projectStatus','Estimate saved in this browser.');}else location.hash='projects';};
$('exportData').onclick=()=>{let content;try{content=storageReady?JSON.stringify(records,null,2):localStorage.getItem(storageKey);if(!content)throw Error();}catch{return status('projectStatus','Browser storage cannot be accessed for export.',true);}const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='savage-solutions-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('storage',event=>{if(event.key!==storageKey)return;try{records=event.newValue?validateRecords(JSON.parse(event.newValue)):{projects:[],estimates:[]};storageReady=true;renderRecords();status('projectStatus','Saved records updated in another tab.');}catch{storageReady=false;status('projectStatus','Another tab wrote unreadable data. Saves are blocked; export a recovery copy.',true);}});
renderRecords();session();
