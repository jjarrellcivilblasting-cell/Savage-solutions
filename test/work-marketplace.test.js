import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workTrades,opportunitySources,normalizeJobDraft,formatJobDraft} from '../public/work-data.js';
import {trades,calculators,extraCalculators} from '../public/trade-catalog.js';
const draft={title:'Install paver patio',trade:'hardscaping',city:'Louisburg, NC',budget:'$3k-$5k',scope:'Build a level 300-square-foot paver patio with compacted gravel base.',deadline:''};
test('contractor categories cover landscaping, hardscaping and freight',()=>{
  for(const trade of ['landscaping','hardscaping','freight'])assert.ok(workTrades.some(x=>x.id===trade));
  assert.ok(trades.some(x=>x.id==='hardscaping'));
  assert.ok(calculators.filter(x=>x.trades.includes('hardscaping')).length>=5);
  for(const source of opportunitySources)assert.match(source.url,/^https:\/\//);
});
test('work draft validation, privacy and shareable text',()=>{
  const item=normalizeJobDraft(draft);
  assert.equal(item.city,'Louisburg, NC');
  assert.equal(formatJobDraft(item).includes('not a published listing'),true);
  assert.equal(formatJobDraft({...item,email:'secret@example.test'}).includes('secret@example.test'),false);
  assert.match(formatJobDraft(item,'es'),/Oficio: Obras exteriores y adoquines/);
  assert.match(formatJobDraft(item,'es'),/borrador, no es un anuncio publicado/);
  assert.equal(formatJobDraft(item,'es').includes('secret@example.test'),false);
  assert.throws(()=>normalizeJobDraft({...draft,trade:'invalid'}),/Select a trade/);
  assert.throws(()=>normalizeJobDraft({...draft,scope:'short'}),/Describe/);
  assert.throws(()=>normalizeJobDraft({...draft,title:'A'.repeat(121)}),/title/);
});
test('hardscape volume and waste calculators produce meaningful estimates',()=>{
  const get=id=>extraCalculators.find(x=>x.id===id);
  assert.equal(get('pavers').compute([20,15,10]),330);
  assert.ok(Math.abs(get('mulch').compute([18,18,3])-3)<1e-9);
  assert.ok(Math.abs(get('aggregate').compute([27,10,12,1.5])-15)<1e-9);
});
