const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdtemp,rm,mkdir}=require('node:fs/promises');
const {tmpdir}=require('node:os');const {join}=require('node:path');
(async()=>{
  const {createApp}=await import('../server.js');const dir=await mkdtemp(join(tmpdir(),'savage-browser-'));
  const secret='browser-test-invitation-key-only';const origin='http://127.0.0.1:3177';const calls=[];
  const server=await createApp({env:{APP_ORIGIN:origin,BETA_ACCESS_KEY:secret,DATA_DIR:dir,AI_ENABLED:'true',OPENAI_API_KEY:'mock-key-never-sent-to-network',OPENAI_MODEL:'mock-model',AI_DAILY_REQUEST_LIMIT:'20'},fetchImpl:async(url,options)=>{
    const payload=JSON.parse(options.body);calls.push(payload);
    if(payload.messages.at(-1).content==='fail')return new Response('Private error',{status:500});
    return Response.json({choices:[{message:{content:'Estimate: 60 board feet. <img src=x onerror="window.injected=true">'}}]});
  }});
  await new Promise(resolve=>server.listen(3177,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true,args:['--no-sandbox']});
    await mkdir('test-results',{recursive:true});
    for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
      const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];const blocked=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error' && /Content Security Policy|violates/.test(m.text()))blocked.push(m.text());});
      // Prevent all external traffic in browser tests. AI network requests are injected above.
      await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
      await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#aiStatus').textContent.includes('Sign in'));
      await page.fill('#accessKey',secret);await page.click('#loginForm button');await page.waitForFunction(()=>document.querySelector('#aiStatus').textContent==='AI is ready.');
      await page.fill('#problem','How much lumber?');await page.click('#solve');await page.waitForFunction(()=>document.querySelector('#chatLog').children.length===2);assert.equal(await page.locator('#chatLog img').count(),0);
      await page.fill('#problem','And for two jobs?');await page.click('#solve');await page.waitForFunction(()=>document.querySelector('#chatLog').children.length===4);assert.equal(calls.at(-1).messages.length,4); // system + 3 conversation messages
      await page.fill('#problem','fail');await page.click('#solve');await page.waitForFunction(()=>document.querySelector('#chatStatus').textContent.includes('could not answer'));assert.equal(await page.inputValue('#problem'),'fail');assert.equal(await page.locator('#chatLog .message').count(),4);
      await page.click('#newChat');assert.equal(await page.locator('#chatLog .message').count(),0);
      await page.click('.nav [data-page="tools"]');await page.click('[data-tool="board"]');await page.click('#boardCalc');assert.equal(await page.textContent('#boardResult'),'60.0 bd ft');
      await page.fill('#bt','-1.5');await page.click('#boardCalc');assert.match(await page.textContent('#boardResult'),/Thickness must/);
      await page.click('[data-tool="log"]');await page.fill('#ld','0');await page.click('#logCalc');assert.match(await page.textContent('#logResult'),/Diameter must/);
      await page.click('[data-tool="hours"]');await page.fill('#workers','1.5');await page.click('#hoursCalc');assert.match(await page.textContent('#hoursResult'),/whole number/);
      await page.click('[data-tool="job"]');await page.fill('#mar','100');await page.click('#jobCalc');assert.match(await page.textContent('#jobResult'),/Margin must/);assert.equal(await page.isDisabled('#saveEstimate'),true);
      await page.fill('#mar','25');await page.click('#jobCalc');assert.match(await page.textContent('#jobResult'),/2,266.67/);
      page.once('dialog',dialog=>dialog.accept('Deck quote'));await page.click('#saveEstimate');await page.waitForURL('**/#projects');assert.match(await page.textContent('#estimateList'),/Deck quote/);
      await page.fill('#projectName','Deck build');await page.fill('#projectNotes','<img src=x onerror="window.injected=true">');await page.click('#projectForm button');assert.equal(await page.locator('#projectList img').count(),0);
      let editStep=0;const editHandler=dialog=>dialog.accept(editStep++===0?'Deck build':'Updated project notes');page.on('dialog',editHandler);await page.getByRole('button',{name:'Edit Deck build',exact:true}).click();page.off('dialog',editHandler);assert.match(await page.textContent('#projectList'),/Updated project notes/);
      await page.getByRole('button',{name:'MARK COMPLETE',exact:true}).click();assert.match(await page.textContent('#projectList'),/Complete/);
      await page.reload();await page.waitForSelector('#projectList .record');assert.match(await page.textContent('#projectList'),/Deck build/);assert.match(await page.textContent('#estimateList'),/Deck quote/);
      const download=page.waitForEvent('download');await page.click('#exportData');assert.equal((await download).suggestedFilename(),'savage-solutions-backup.json');
      page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete Deck build',exact:true}).click();assert.match(await page.textContent('#projectList'),/No saved projects/);
      await page.click('.nav [data-page="feedback"]');await page.fill('#like','<img src=x onerror="window.injected=true">');await page.click('#saveFeedback');await page.waitForFunction(()=>document.querySelector('#feedbackResult').textContent.includes('received'));assert.equal(await page.locator('#feedbackResult img').count(),0);
      await page.goBack();await page.waitForURL('**/#projects');assert.equal(await page.locator('.nav [aria-current="page"]').textContent(),'PROJECTS');
      await page.click('.nav [data-page="home"]');await page.setInputFiles('#pick',{name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});assert.match(await page.textContent('#chatStatus'),/Choose a JPEG/);
      // Valid background and reset preserve CSP compatibility.
      await page.setInputFiles('#pick','public/assets/hero.webp');await page.waitForFunction(()=>document.querySelector('#hero').style.backgroundImage.includes('blob:'));await page.click('#reset');assert.equal(await page.locator('#hero').evaluate(el=>el.style.backgroundImage),'');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(await page.evaluate(()=>window.injected),undefined);
      const inputs=await page.locator('input,textarea,select').evaluateAll(nodes=>nodes.filter(n=>!n.labels?.length && !n.getAttribute('aria-label')).map(n=>n.id));assert.deepEqual(inputs,[]);
      assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
      await page.screenshot({path:`test-results/home-${viewport.width}.png`,fullPage:true});
      await page.click('#logout');await page.waitForSelector('#loginPanel',{state:'visible'});assert.equal(await page.isDisabled('#solve'),true);
      await context.close();console.log(`PASS ${viewport.width}px: chat, context, failures, calculators, persistence, export, deletion, feedback, routing, uploads, injection, labels and logout`);
    }
    const corrupt=await browser.newContext();await corrupt.addInitScript(()=>localStorage.setItem('savage-solutions-v1',JSON.stringify({projects:[null],estimates:[]})));
    const badPage=await corrupt.newPage();const badErrors=[];badPage.on('pageerror',e=>badErrors.push(e.message));await badPage.goto(origin+'/#projects');
    await badPage.waitForFunction(()=>document.querySelector('#projectStatus').textContent.includes('could not be read'));await badPage.fill('#projectName','Do not overwrite');await badPage.click('#projectForm button');assert.match(await badPage.textContent('#projectStatus'),/Existing data could not be read/);assert.equal(await badPage.evaluate(()=>JSON.parse(localStorage.getItem('savage-solutions-v1')).projects[0]),null);assert.deepEqual(badErrors,[]);await corrupt.close();
    console.log('PASS corrupted browser records: app remains usable and saves cannot overwrite recovery data');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
