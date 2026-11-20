// Operator-only CLI. Never expose this tool or the SQLite file as a web endpoint.
// Run with DATA_DIR set to a persistent, access-restricted server directory.
import {DatabaseSync} from 'node:sqlite';
import {resolve,join} from 'node:path';
const dir=resolve(process.env.DATA_DIR||'data');
const db=new DatabaseSync(join(dir,'savage.sqlite'));
const [action,idText]=process.argv.slice(2);
const id=Number(idText);
const number=()=>{if(!Number.isSafeInteger(id)||id<=0)throw Error('Provide a positive integer ID.');return id;};
try{
  switch(action){
    case 'pending':
      console.table(db.prepare("SELECT id,title,trade,city,created_at FROM market_jobs WHERE status='pending' ORDER BY id DESC").all());break;
    case 'review':{
      const row=db.prepare('SELECT * FROM market_jobs WHERE id=?').get(number());if(!row)throw Error('Job not found.');
      console.log(JSON.stringify(row,null,2));break;
    }
    case 'approve':case 'reject':case 'hide':{
      const status=action==='approve'?'approved':action==='reject'?'rejected':'hidden';
      const result=db.prepare('UPDATE market_jobs SET status=? WHERE id=?').run(status,number());
      if(!result.changes)throw Error('Job not found.');console.log('Job '+id+' is '+status);break;
    }
    case 'bids':
      console.log('PRIVATE DATA — handle contact details only through approved workflow.');
      console.table(db.prepare('SELECT * FROM market_bids WHERE job_id=? ORDER BY id DESC').all(number()));break;
    case 'reports':
      console.table(db.prepare('SELECT * FROM market_reports ORDER BY id DESC LIMIT 100').all());break;
    case 'delete-job':{
      const jobId=number();
      db.exec('BEGIN');
      try{
        db.prepare('DELETE FROM market_reports WHERE job_id=?').run(jobId);
        db.prepare('DELETE FROM market_bids WHERE job_id=?').run(jobId);
        db.prepare('DELETE FROM market_jobs WHERE id=?').run(jobId);
        db.exec('COMMIT');console.log('Deleted job, bids and reports for '+jobId);
      }catch(error){db.exec('ROLLBACK');throw error;}break;
    }
    default: throw Error('Usage: node scripts/review-marketplace.js pending | review <id> | approve <id> | reject <id> | hide <id> | bids <jobId> | reports | delete-job <id>');
  }
}finally{db.close();}
