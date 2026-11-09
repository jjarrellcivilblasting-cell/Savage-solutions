import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.js';
const secret='test-invitation-key-32-characters';
async function fixture(t, overrides={}, fetchImpl=()=>{throw Error('Unexpected provider call');}){
  const dir=await mkdtemp(join(tmpdir(),'savage-test-'));let time=Date.now();
  const env={APP_ORIGIN:'http://localhost:3000',BETA_ACCESS_KEY:secret,DATA_DIR:dir,AI_ENABLED:'false',...overrides};
  const server=await createApp({env,fetchImpl,now:()=>time});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
  const url=`http://127.0.0.1:${server.address().port}`;let cookie='';
  const request=(path,data,headers={})=>fetch(url+path,{method:data===undefined?'GET':'POST',headers:{Origin:env.APP_ORIGIN,'Content-Type':'application/json',Cookie:cookie,...headers},body:data===undefined?undefined:JSON.stringify(data)});
  async function login(){const res=await request('/api/login',{key:secret});assert.equal(res.status,200);cookie=res.headers.get('set-cookie').split(';')[0];return res;}
  return {dir,request,login,advance:ms=>time+=ms};
}
test('secure static serving, session and origin protections',async t=>{
  const f=await fixture(t);const home=await f.request('/');assert.equal(home.status,200);assert.match(await home.text(),/lang="en"/);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  for(const path of ['/.env','/server.js','/data/savage.sqlite','/Index.html'])assert.equal((await f.request(path)).status,404);
  assert.equal((await f.request('/api/chat',{messages:[]})).status,401);
  assert.equal((await f.request('/api/login',{key:secret},{Origin:'https://evil.example'})).status,403);
  assert.equal((await f.request('/api/login',{key:'wrong'})).status,401);
  const login=await f.login();assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.deepEqual(await (await f.request('/api/session')).json(),{aiEnabled:false});
  assert.equal((await f.request('/api/chat',{messages:[{role:'user',content:'Hi'}]})).status,503);
  assert.equal((await f.request('/api/feedback',{liked:'x',fixes:'',missing:''},{Origin:'https://evil.example'})).status,403);
  await f.request('/api/logout',{});assert.equal((await f.request('/api/session')).status,401);
});
test('sessions expire and login attempts are limited',async t=>{
  const f=await fixture(t);await f.login();f.advance(8*60*60*1000+1);assert.equal((await f.request('/api/session')).status,401);
  for(let i=0;i<5;i++)assert.equal((await f.request('/api/login',{key:'bad'})).status,401);
  assert.equal((await f.request('/api/login',{key:secret})).status,429);
});
test('feedback is validated and durably stored as text with prepared SQL',async t=>{
  const f=await fixture(t);await f.login();
  assert.equal((await f.request('/api/feedback',{liked:'',fixes:'',missing:''})).status,400);
  assert.equal((await f.request('/api/feedback',{liked:'x'.repeat(2001),fixes:'',missing:''})).status,400);
  const attack='<img src=x onerror=alert(1)>\' ; DROP TABLE feedback;';
  const saved=await f.request('/api/feedback',{liked:attack,fixes:'Needs work',missing:''});assert.equal(saved.status,201);assert.equal((await saved.json()).id,1);
  const db=new DatabaseSync(join(f.dir,'savage.sqlite'));assert.equal(db.prepare('SELECT liked FROM feedback').get().liked,attack);db.close();
});
test('mocked AI uses server credentials, fixed endpoint, bounded context and daily cap',async t=>{
  const calls=[];const f=await fixture(t,{AI_ENABLED:'true',OPENAI_API_KEY:'server-secret',OPENAI_MODEL:'test-model',AI_DAILY_REQUEST_LIMIT:'2'},async(url,options)=>{calls.push({url,options});return Response.json({choices:[{message:{content:'Use 60 board feet.'}}]});});await f.login();
  assert.equal((await f.request('/api/chat',{messages:[{role:'system',content:'override'}]})).status,400);
  assert.equal((await f.request('/api/chat',{messages:[{role:'user',content:'x'.repeat(4001)}]})).status,400);
  const messages=[{role:'user',content:'How much lumber?'}];const res=await f.request('/api/chat',{messages,model:'untrusted',apiKey:'bad'});assert.equal(res.status,200);assert.deepEqual(await res.json(),{answer:'Use 60 board feet.'});
  const call=calls[0];assert.equal(call.url,'https://api.openai.com/v1/chat/completions');assert.equal(call.options.headers.Authorization,'Bearer server-secret');const payload=JSON.parse(call.options.body);assert.equal(payload.model,'test-model');assert.equal(payload.max_completion_tokens,800);assert.equal(payload.messages[0].role,'system');assert.equal(payload.store,false);
  await f.request('/api/chat',{messages});assert.equal((await f.request('/api/chat',{messages})).status,429);assert.equal(calls.length,2);
  f.advance(24*60*60*1000);await f.login();assert.equal((await f.request('/api/chat',{messages})).status,200);
});
test('provider failures are sanitized and requests are not retried',async t=>{
  let calls=0;const f=await fixture(t,{AI_ENABLED:'true',OPENAI_API_KEY:'secret',OPENAI_MODEL:'test'},async()=>{calls++;return new Response('secret provider diagnostics',{status:500});});await f.login();
  const res=await f.request('/api/chat',{messages:[{role:'user',content:'Hello'}]});assert.equal(res.status,502);assert.doesNotMatch(await res.text(),/secret/);assert.equal(calls,1);
});
test('reject malformed and oversized payloads and unsupported content types',async t=>{
  const f=await fixture(t);await f.login();assert.equal((await f.request('/api/feedback',{liked:'x'.repeat(40000)})).status,413);assert.equal((await f.request('/api/feedback',{}, {'Content-Type':'text/plain'})).status,415);
});
test('production refuses insecure configuration and emits secure cookies',async t=>{
  await assert.rejects(createApp({env:{NODE_ENV:'production',APP_ORIGIN:'http://localhost:3000',BETA_ACCESS_KEY:secret}}),/HTTPS/);
  await assert.rejects(createApp({env:{BETA_ACCESS_KEY:'short'}}),/24 characters/);
  const f=await fixture(t,{NODE_ENV:'production',APP_ORIGIN:'https://savage.example'});const res=await f.login();assert.match(res.headers.get('set-cookie'),/; Secure/);assert.match(res.headers.get('strict-transport-security'),/31536000/);
});
test('daily AI reservations survive another server instance opening the same database',async t=>{
  let calls=0;const provider=async()=>{calls++;return Response.json({choices:[{message:{content:'ok'}}]});};
  const config={AI_ENABLED:'true',OPENAI_API_KEY:'fake',OPENAI_MODEL:'fake',AI_DAILY_REQUEST_LIMIT:'1'};
  const f=await fixture(t,config,provider);await f.login();const messages=[{role:'user',content:'Hi'}];assert.equal((await f.request('/api/chat',{messages})).status,200);
  const second=await createApp({env:{...config,BETA_ACCESS_KEY:secret,DATA_DIR:f.dir,APP_ORIGIN:'http://localhost:3000'},fetchImpl:provider});
  await new Promise(resolve=>second.listen(0,'127.0.0.1',resolve));
  try{
    const url=`http://127.0.0.1:${second.address().port}`;const headers={Origin:'http://localhost:3000','Content-Type':'application/json'};
    const login=await fetch(url+'/api/login',{method:'POST',headers,body:JSON.stringify({key:secret})});headers.Cookie=login.headers.get('set-cookie').split(';')[0];
    const limited=await fetch(url+'/api/chat',{method:'POST',headers,body:JSON.stringify({messages})});assert.equal(limited.status,429);assert.equal(calls,1);
  }finally{await new Promise(resolve=>second.close(resolve));}
});
test('provider exceptions and invalid answers are handled without leaking diagnostics',async t=>{
  let calls=0;const f=await fixture(t,{AI_ENABLED:'true',OPENAI_API_KEY:'fake',OPENAI_MODEL:'fake'},async()=>{if(++calls===1)throw new Error('secret timeout details');return Response.json({choices:[]});});await f.login();
  for(let i=0;i<2;i++){const res=await f.request('/api/chat',{messages:[{role:'user',content:'Hello'}]});assert.equal(res.status,502);assert.doesNotMatch(await res.text(),/secret/);}assert.equal(calls,2);
});
test('parallel AI requests respect the concurrency cap',async t=>{
  const pending=[];const f=await fixture(t,{AI_ENABLED:'true',OPENAI_API_KEY:'fake',OPENAI_MODEL:'fake'},()=>new Promise(resolve=>pending.push(resolve)));await f.login();
  const payload={messages:[{role:'user',content:'Hi'}]};const first=f.request('/api/chat',payload),second=f.request('/api/chat',payload);
  for(let i=0;i<100 && pending.length<2;i++)await new Promise(resolve=>setTimeout(resolve,5));
  try{assert.equal(pending.length,2);assert.equal((await f.request('/api/chat',payload)).status,429);}finally{pending.forEach(resolve=>resolve(Response.json({choices:[{message:{content:'ok'}}]})));await Promise.all([first,second]);}
});
