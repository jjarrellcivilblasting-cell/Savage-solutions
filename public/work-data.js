// Job discovery sources are external links, not imported live postings.
// Check availability, eligibility, and terms with the source before bidding.
export const workTrades = [
  {id:'all', name:'All work'},
  {id:'general', name:'General contracting'},
  {id:'concrete', name:'Concrete'},
  {id:'excavation', name:'Excavation & grading'},
  {id:'landscaping', name:'Landscaping'},
  {id:'hardscaping', name:'Hardscaping & pavers'},
  {id:'carpentry', name:'Carpentry & framing'},
  {id:'roofing', name:'Roofing'},
  {id:'masonry', name:'Masonry'},
  {id:'electrical', name:'Electrical'},
  {id:'plumbing', name:'Plumbing'},
  {id:'hvac', name:'HVAC'},
  {id:'welding', name:'Welding & fabrication'},
  {id:'heavy', name:'Heavy equipment'},
  {id:'forestry', name:'Forestry & land clearing'},
  {id:'mining', name:'Drilling & blasting'},
  {id:'freight', name:'Freight & hauling'},
  {id:'other', name:'Other'}
];
export const opportunitySources = [
  {name:'NC eVP — Public solicitations', kind:'Public construction & services', trade:'general', url:'https://evp.nc.gov/solicitations/', note:'Free public solicitation search. Bid through the official portal.'},
  {name:'NCDOT — Bidding & letting', kind:'Roadwork, grading & construction', trade:'excavation', url:'https://connect.ncdot.gov/letting/Pages/default.aspx', note:'Official opportunities. Some work requires contractor prequalification.'},
  {name:'SAM.gov — Federal contracts', kind:'Federal opportunities', trade:'general', url:'https://sam.gov/opportunities', note:'Search notices at no charge. Registration or other qualifications may be required to bid.'},
  {name:'TruckSmarter — Free load search', kind:'Freight loads', trade:'freight', url:'https://www.trucksmarter.com/free-load-boards', note:'Provider advertises free load searching. Carrier approval may be required to book.'},
  {name:'Trulos — Free load board', kind:'Freight loads', trade:'freight', url:'https://www.trulos.com/', note:'Provider advertises free core load search. Verify each load with the broker.'}
];
export const jobDraftFields=['title','trade','city','budget','scope','deadline'];
export function normalizeJobDraft(draft) {
  const clean={};
  for (const key of jobDraftFields) clean[key]=String(draft?.[key] ?? '').trim();
  if(clean.title.length<5 || clean.title.length>120) throw Error('Enter a title between 5 and 120 characters.');
  if(!workTrades.some(item=>item.id===clean.trade && item.id!=='all')) throw Error('Select a trade.');
  if(clean.city.length<3 || clean.city.length>120) throw Error('Enter the city and state (3–120 characters).');
  if(clean.scope.length<20 || clean.scope.length>2000) throw Error('Describe the work in 20–2,000 characters.');
  if(clean.budget.length>80) throw Error('Budget must be 80 characters or fewer.');
  if(clean.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(clean.deadline)) throw Error('Choose a valid deadline date.');
  return clean;
}
export function formatJobDraft(draft) {
  const job=normalizeJobDraft(draft);
  const trade=workTrades.find(item=>item.id===job.trade).name;
  return [job.title, 'Trade: '+trade, 'Location: '+job.city,
    job.budget?'Budget: '+job.budget:null,
    job.deadline?'Bid deadline: '+job.deadline:null,
    '',job.scope,'','Prepared with Savage Solutions — draft, not a published listing.']
    .filter(line=>line!==null).join('\n');
}
