import {workTrades,opportunitySources,normalizeJobDraft,formatJobDraft} from '/work-data.js';
const $=id=>document.getElementById(id);
const key='savage-work-drafts-v1';
const label=(id,text)=>{const node=document.createElement('label');node.textContent=text;const input=document.createElement('input');input.id=id;input.required=true;node.append(input);return [node,input];};
const notice=(message,error=false)=>{const status=$('workStatus');status.textContent=message;status.classList.toggle('error',error);};
let jobs=[], enabled=false, drafts=[], storageOK=true;
try {
  const saved=JSON.parse(localStorage.getItem(key)||'[]');
  if(!Array.isArray(saved)||saved.length>50) throw Error('Invalid drafts');
  drafts=saved.map(normalizeJobDraft);
} catch {storageOK=false;notice('Saved drafts could not be read. New drafts are blocked to avoid overwriting your data.',true);}
for(const trade of workTrades) {
  for(const id of ['workTrade','postTrade']) {
    if(id==='postTrade' && trade.id==='all')continue;
    const opt=document.createElement('option');opt.value=trade.id;opt.textContent=trade.name;$(id).append(opt);
  }
}
function readDraft() {
  return normalizeJobDraft({
    title:$('postTitle').value,trade:$('postTrade').value,city:$('postCity').value,
    budget:$('postBudget').value,scope:$('postScope').value,deadline:$('postDeadline').value
  });
}
function saveDraft(draft) {
  if(!storageOK)throw Error('Saved drafts cannot be updated. Please export or recover browser data first.');
  if(drafts.length>=50)throw Error('Remove an old draft first (50 draft limit).');
  const next=[draft,...drafts];
  localStorage.setItem(key,JSON.stringify(next));drafts=next;renderDrafts();
}
async function copyDraft(draft) {
  const content=formatJobDraft(draft);
  try {await navigator.clipboard.writeText(content);notice('Job description copied. Sharing it does NOT publish a listing in Savage Solutions.');}
  catch {notice('Clipboard unavailable. Use your device’s text selection to copy the posting.',true);}
}
function renderDrafts(){
  const list=$('workDrafts');list.replaceChildren();
  if(!drafts.length){const p=document.createElement('p');p.textContent='No private drafts saved in this browser.';list.append(p);return;}
  drafts.forEach((draft,index)=>{
    const card=document.createElement('article');card.className='record';
    const heading=document.createElement('h3');heading.textContent=draft.title;card.append(heading);
    const detail=document.createElement('p');detail.textContent=draft.city+' — '+workTrades.find(t=>t.id===draft.trade).name;card.append(detail);
    const copy=document.createElement('button');copy.type='button';copy.className='btn';copy.textContent='COPY POSTING';copy.onclick=()=>copyDraft(draft);card.append(copy);
    const remove=document.createElement('button');remove.type='button';remove.className='btn';remove.textContent='DELETE DRAFT';
    remove.onclick=()=>{if(!confirm('Delete this private posting draft?'))return;try{const next=drafts.filter((_,i)=>i!==index);localStorage.setItem(key,JSON.stringify(next));drafts=next;renderDrafts();}catch{notice('Unable to delete saved draft.',true);}};
    card.append(remove);list.append(card);
  });
}
function renderSources(){
  const list=$('workSources');list.replaceChildren();
  for(const source of opportunitySources){
    const trade=$('workTrade').value;
    if(trade==='freight' && source.trade!=='freight')continue;
    if(trade!=='all'&&trade!=='freight'&&source.trade==='freight')continue;
    const card=document.createElement('article');card.className='record';
    const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.name;
    const p=document.createElement('p');p.textContent=source.kind+' — '+source.note;
    card.append(a,p);list.append(card);
  }
}
function renderJobs(){
  const list=$('workFeed');list.replaceChildren();
  const search=$('workQuery').value.trim().toLowerCase(),trade=$('workTrade').value;
  const visible=jobs.filter(job=>(trade==='all'||job.trade===trade)&&(!search||[job.title,job.scope,job.city].join(' ').toLowerCase().includes(search)));
  if(!visible.length){const p=document.createElement('p');p.textContent='No approved Savage marketplace listings match yet. The public bid and load-board links below are available now.';list.append(p);return;}
  for(const job of visible){
    const card=document.createElement('article');card.className='record';
    const title=document.createElement('h3');title.textContent=job.title;card.append(title);
    const info=document.createElement('p');info.textContent=[workTrades.find(t=>t.id===job.trade)?.name||job.trade,job.city,job.budget?'Budget: '+job.budget:'',job.deadline?'Deadline: '+job.deadline:''].filter(Boolean).join(' • ');card.append(info);
    const scope=document.createElement('p');scope.textContent=job.scope;card.append(scope);
    const showBid=document.createElement('button');showBid.type='button';showBid.className='btn';showBid.textContent='SUBMIT BID INTEREST';
    const form=document.createElement('form');form.hidden=true;form.className='market-bid';
    const fields=[label('','Business or name'),label('','Contact email'),label('','Estimated bid (USD)'),label('','Message to customer')];
    const [contractor,email,amount,notes]=fields.map(pair=>pair[1]);email.type='email';amount.type='number';amount.min='0';amount.step='0.01';notes.maxLength=1000;
    const submit=document.createElement('button');submit.type='submit';submit.className='red';submit.textContent='SEND FOR REVIEW';
    const result=document.createElement('p');result.setAttribute('role','status');
    fields.forEach(pair=>form.append(pair[0]));form.append(submit,result);
    showBid.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)contractor.focus();};
    form.onsubmit=async event=>{
      event.preventDefault();submit.disabled=true;result.textContent='Sending…';
      try{
        const response=await fetch('/api/market/bids',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:job.id,contractor:contractor.value,email:email.value,amount:amount.value,notes:notes.value})});
        const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to submit bid.');
        result.textContent='Bid interest received for review. This is not an award or a confirmed message to the customer.';form.reset();
      }catch(error){result.textContent=error.message;}finally{submit.disabled=false;}
    };
    const report=document.createElement('button');report.type='button';report.className='btn';report.textContent='REPORT LISTING';
    report.onclick=async()=>{
      const reason=prompt('Describe the issue with this listing (10–500 characters):');if(reason===null)return;
      try{const response=await fetch('/api/market/report',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:job.id,reason})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to report.');notice('Report received for moderation review.');}
      catch(error){notice(error.message,true);}
    };
    card.append(showBid,report,form);list.append(card);
  }
}
async function refresh(){
  try{
    const response=await fetch('/api/market/jobs',{credentials:'same-origin',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Job listings are unavailable.');
    const data=await response.json();enabled=data.enabled===true;jobs=Array.isArray(data.jobs)?data.jobs:[];
    $('marketMode').textContent=enabled?'Private marketplace beta: postings and bids require an invitation and moderator review.':'Marketplace posting is not live yet. You can prepare a private job draft and use free external bid sources now.';
    $('submitListing').hidden=!enabled;renderJobs();
  }catch(error){enabled=false;$('submitListing').hidden=true;notice('Marketplace service could not be checked. Private drafts and outside links still work.',true);renderJobs();}
}
$('workTrade').onchange=()=>{renderSources();renderJobs();};
$('workQuery').oninput=renderJobs;
$('saveWorkDraft').onclick=()=>{try{const draft=readDraft();saveDraft(draft);notice('Private job draft saved on this device. It has NOT been published.');}catch(error){notice(error.message,true);}};
$('workForm').onsubmit=async event=>{
  event.preventDefault();if(!enabled)return notice('Public posting is not enabled. Save a private draft for now.',true);
  const button=$('submitListing');button.disabled=true;
  try{
    const draft=readDraft();const email=$('postEmail').value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Enter a valid contact email.');
    const response=await fetch('/api/market/jobs',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,email})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Submission failed.');
    notice('Job #'+data.id+' submitted for moderation. It is NOT publicly listed until approved.');$('workForm').reset();
  }catch(error){notice(error.message,true);}finally{button.disabled=false;}
};
renderDrafts();renderSources();refresh();
